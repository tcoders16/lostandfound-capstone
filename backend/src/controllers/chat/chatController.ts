// src/controllers/chat/chatController.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { ChatSessionModel } from "../../models/ChatSession";
import { PendingMatchModel } from "../../models/PendingMatch";
import { ClaimModel } from "../../models/Claim";
import { generateNextQuestion, reEmbedAndSearch, upsertEnrichedClaimToVector } from "../../services/chat/chatOrchestrationService";

const MATCH_THRESHOLD = 0.80;

/** GET /api/chat/sessions/:sessionId — poll session state */
export async function getSession(
  req: FastifyRequest<{ Params: { sessionId: string } }>,
  reply: FastifyReply
) {
  try {
    const session = await ChatSessionModel.findOne({ sessionId: req.params.sessionId }).lean();
    if (!session) return reply.code(404).send({ ok: false, error: "Session not found" });
    return reply.send({ ok: true, session });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err.message });
  }
}

/** POST /api/chat/sessions/:sessionId/next — get first/next question */
export async function getNextQuestion(
  req: FastifyRequest<{ Params: { sessionId: string } }>,
  reply: FastifyReply
) {
  try {
    const session = await ChatSessionModel.findOne({ sessionId: req.params.sessionId });
    if (!session) return reply.code(404).send({ ok: false, error: "Session not found" });
    if (session.status === "completed" || session.status === "no_match") {
      return reply.send({ ok: true, done: true, status: session.status });
    }

    const { question, questionType, done } = await generateNextQuestion({
      messages: session.messages as any,
      questionsAsked: session.questionsAsked,
      enrichedDescription: session.enrichedDescription,
      foundItemId: session.foundItemId,
      conflictGroup: session.conflictGroup,
      riderOriginalDesc: session.riderOriginalDesc,
      status: session.status,
    });

    if (done) {
      session.status = session.currentScore >= MATCH_THRESHOLD ? "completed" : "no_match";
      await session.save();
      return reply.send({ ok: true, done: true, status: session.status });
    }

    // Push assistant question to messages
    (session.messages as any).push({ role: "assistant", content: question, questionType });
    session.questionsAsked += 1;
    session.status = "chatting";
    await session.save();

    return reply.send({ ok: true, question, questionType, done: false });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err.message });
  }
}

/** POST /api/chat/sessions/:sessionId/answer — submit user answer */
export async function submitAnswer(
  req: FastifyRequest<{ Params: { sessionId: string }; Body: { answer: string } }>,
  reply: FastifyReply
) {
  try {
    const { answer } = req.body;
    if (!answer?.trim()) return reply.code(400).send({ ok: false, error: "Answer required" });

    const session = await ChatSessionModel.findOne({ sessionId: req.params.sessionId });
    if (!session) return reply.code(404).send({ ok: false, error: "Session not found" });

    // Store user answer in messages
    (session.messages as any).push({ role: "user", content: answer.trim(), questionType: "other" });

    // Append answer to enriched description
    session.enrichedDescription = session.enrichedDescription
      ? `${session.enrichedDescription}. ${answer.trim()}`
      : answer.trim();

    // Re-embed + re-search Pinecone with enriched description
    const results = await reEmbedAndSearch(session.enrichedDescription, session.riderOriginalDesc, 5);
    const topMatch = results[0];
    const newScore = topMatch?.score ?? 0;
    session.currentScore = newScore;

    // Store enriched claim vector in Pinecone
    const claim = await ClaimModel.findOne({ claimId: session.claimId }).lean();
    if (claim) {
      await upsertEnrichedClaimToVector(session.claimId, session.enrichedDescription, {
        riderName: (claim as any).name,
        riderEmail: (claim as any).email ?? "",
        foundItemId: session.foundItemId ?? topMatch?.id ?? "",
        score: newScore,
      });
    }

    let matchFound = false;
    let conflictDetected = false;

    // Check if score now meets threshold
    if (newScore >= MATCH_THRESHOLD && topMatch) {
      // Check for conflict: does this found item already have a pending match?
      const existingMatch = await PendingMatchModel.findOne({
        foundItemId: topMatch.id,
        status: "pending_review",
      });

      if (existingMatch) {
        // CONFLICT: two claimants for same item
        const conflictGroupId = existingMatch.get("conflictGroup") || `conflict-${uuidv4().slice(0,8)}`;

        // Update existing match with conflict flag
        await PendingMatchModel.findByIdAndUpdate(existingMatch._id, {
          $set: { conflict: true, conflictGroup: conflictGroupId },
          $push: { conflictClaimIds: session.claimId },
        });

        // Update this session
        session.conflictGroup = conflictGroupId;
        session.foundItemId = topMatch.id;
        session.maxQuestions = 8; // escalate
        session.status = "conflict";
        conflictDetected = true;

        // Update existing conflicting session if any
        await ChatSessionModel.findOneAndUpdate(
          { claimId: (existingMatch as any).claimId },
          { $set: { conflictGroup: conflictGroupId, maxQuestions: 8, status: "conflict" } }
        );

        // Create a conflict PendingMatch for this session's claimant
        const matchId = `match-${Date.now()}-${uuidv4().slice(0,8)}`;
        await PendingMatchModel.create({
          matchId,
          claimId: session.claimId,
          riderName: (claim as any)?.name ?? "",
          riderPhone: (claim as any)?.phone ?? "",
          riderEmail: (claim as any)?.email ?? "",
          riderDescription: session.enrichedDescription,
          riderLocation: (claim as any)?.locationName ?? "",
          foundItemId: topMatch.id,
          foundDescription: topMatch.metadata?.description ?? "",
          foundLocation: topMatch.metadata?.locationName ?? "",
          foundAttributes: topMatch.metadata ?? {},
          matchScore: newScore,
          conflict: true,
          conflictGroup: conflictGroupId,
          status: "pending_review",
        });
        matchFound = true;
      } else {
        // Clean match — create PendingMatch
        const matchId = `match-${Date.now()}-${uuidv4().slice(0,8)}`;
        await PendingMatchModel.create({
          matchId,
          claimId: session.claimId,
          riderName: (claim as any)?.name ?? "",
          riderPhone: (claim as any)?.phone ?? "",
          riderEmail: (claim as any)?.email ?? "",
          riderDescription: session.enrichedDescription,
          riderLocation: (claim as any)?.locationName ?? "",
          foundItemId: topMatch.id,
          foundDescription: topMatch.metadata?.description ?? "",
          foundLocation: topMatch.metadata?.locationName ?? "",
          foundAttributes: topMatch.metadata ?? {},
          matchScore: newScore,
          conflict: false,
          conflictGroup: null,
          status: "pending_review",
        });
        session.foundItemId = topMatch.id;
        session.status = "completed";
        matchFound = true;
      }
    }

    // Check if we've hit max questions without a match
    const maxQ = session.maxQuestions;
    if (session.questionsAsked >= maxQ && !matchFound) {
      session.status = "no_match";
    }

    await session.save();

    return reply.send({
      ok: true,
      currentScore: newScore,
      matchFound,
      conflictDetected,
      status: session.status,
      questionsAsked: session.questionsAsked,
      maxQuestions: session.maxQuestions,
    });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err.message });
  }
}

/** GET /api/chat/manual — admin: list no-match claims for manual review */
export async function listManualQueue(
  _req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Claims that have no PendingMatch AND their session is no_match or they have no session
    const noMatchSessions = await ChatSessionModel.find({ status: "no_match" }).lean();
    const claimIds = noMatchSessions.map((s: any) => s.claimId);

    const claims = await ClaimModel.find({ claimId: { $in: claimIds } }).lean();
    const sessions = noMatchSessions.reduce((acc: any, s: any) => {
      acc[s.claimId] = s;
      return acc;
    }, {});

    const result = claims.map((c: any) => ({
      ...c,
      session: sessions[c.claimId] ?? null,
    }));

    return reply.send({ ok: true, count: result.length, claims: result });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err.message });
  }
}

/** POST /api/chat/manual/link — admin manually links a claim to a found item */
export async function manuallyLinkClaim(
  req: FastifyRequest<{ Body: { claimId: string; foundItemId: string; notes?: string } }>,
  reply: FastifyReply
) {
  try {
    const { claimId, foundItemId, notes } = req.body;
    const claim = await ClaimModel.findOne({ claimId }).lean();
    if (!claim) return reply.code(404).send({ ok: false, error: "Claim not found" });

    // Check conflict again
    const existingMatch = await PendingMatchModel.findOne({
      foundItemId,
      status: "pending_review",
    });

    const isConflict = !!existingMatch;
    const conflictGroup = isConflict
      ? (existingMatch.get("conflictGroup") || `conflict-${uuidv4().slice(0,8)}`)
      : null;

    if (isConflict) {
      await PendingMatchModel.findByIdAndUpdate(existingMatch._id, {
        $set: { conflict: true, conflictGroup },
        $push: { conflictClaimIds: claimId },
      });
    }

    const { itemsRepo } = await import("../../repositories/lostItem/itemsRepo");
    const foundItem = await itemsRepo.get(foundItemId).catch(() => null);

    const matchId = `match-${Date.now()}-${uuidv4().slice(0,8)}`;
    await PendingMatchModel.create({
      matchId,
      claimId,
      riderName:        (claim as any).name ?? "",
      riderPhone:       (claim as any).phone ?? "",
      riderEmail:       (claim as any).email ?? "",
      riderDescription: (claim as any).description ?? "",
      riderLocation:    (claim as any).locationName ?? "",
      foundItemId,
      foundDescription: foundItem?.description ?? foundItem?.attributes?.summary ?? "",
      foundLocation:    foundItem?.locationName ?? "",
      foundAttributes:  foundItem?.attributes ?? {},
      matchScore:       0.5, // manual — admin decided
      conflict:         isConflict,
      conflictGroup:    conflictGroup ?? null,
      status:           "pending_review",
      adminNotes:       notes ?? "Manually linked by admin",
      source:           "manual",
    });

    // Update session if exists
    await ChatSessionModel.findOneAndUpdate(
      { claimId },
      { $set: { status: "completed", foundItemId } }
    );

    return reply.send({ ok: true, matchId, isConflict });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err.message });
  }
}
