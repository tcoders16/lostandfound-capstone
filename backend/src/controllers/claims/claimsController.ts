// src/controllers/claims/claimsController.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { ClaimModel } from "../../models/Claim";
import { PendingMatchModel } from "../../models/PendingMatch";
import { ChatSessionModel } from "../../models/ChatSession";
import { itemsRepo } from "../../repositories/lostItem/itemsRepo";
import { searchAnalysedItems } from "../../services/pinecone/searchAnalysedItemService";
import { PineconeService } from "../../services/pinecone/pineconeService";
import { generateCollectionToken } from "../../lib/tokenGenerator";

// ── Threshold for auto-creating a pending match ────────────────────────────
const MATCH_THRESHOLD = 0.80; // 80%+ → send to admin for review

const CreateClaimSchema = z.object({
  description: z.string().min(5, "Description too short"),
  locationName: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().optional(),
  email: z.string().optional(),
});

/** POST /api/claims — rider submits a lost item report */
export async function createClaim(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const body = CreateClaimSchema.parse(req.body);
    const claimId = `claim-${Date.now()}-${uuidv4().slice(0, 8)}`;

    // 1. Save claim to MongoDB
    const claim = new ClaimModel({ claimId, ...body });
    await claim.save();

    // 2. Run Pinecone semantic search against found items
    let pendingMatches: Array<{ matchId: string; score: number; itemId: string }> = [];
    let topMatchScore = 0;
    let topMatchId: string | null = null;
    let hasMatch = false;

    try {
      const searchQuery = [body.description, body.locationName].filter(Boolean).join(" ");
      const results = await searchAnalysedItems(searchQuery, 5);

      // Track top match for chat session
      if (results.length > 0 && results[0].score) {
        topMatchScore = results[0].score;
        topMatchId = results[0].id;
        hasMatch = topMatchScore >= MATCH_THRESHOLD;
      }

      for (const result of results) {
        if ((result.score ?? 0) >= MATCH_THRESHOLD) {
          // Fetch full item from MongoDB to enrich the match record
          const foundItem = await itemsRepo.get(result.id).catch(() => null);
          const matchId = `match-${Date.now()}-${uuidv4().slice(0, 8)}`;

          await PendingMatchModel.create({
            matchId,
            claimId,
            riderName:        body.name,
            riderPhone:       body.phone,
            riderEmail:       body.email ?? "",
            riderAddress:     body.address ?? "",
            riderDescription: body.description,
            riderLocation:    body.locationName ?? "",
            foundItemId:      result.id,
            foundFilename:    result.metadata?.filename ?? foundItem?.filename ?? "",
            foundDescription: result.metadata?.description ?? foundItem?.description ?? "",
            foundLocation:    result.metadata?.locationName ?? foundItem?.locationName ?? "",
            foundAttributes:  result.metadata ?? {},
            matchScore:       result.score,
            status:           "pending_review",
          });
          pendingMatches.push({ matchId, score: result.score, itemId: result.id });
        }
      }
    } catch (matchErr) {
      // Don't fail the whole request if matching fails — log and continue
      req.log.warn({ matchErr }, "[claims] Pinecone matching failed; claim saved without matches");
    }

    // 3. Create ChatSession for this claim
    const sessionId = `session-${Date.now()}-${uuidv4().slice(0, 8)}`;
    await ChatSessionModel.create({
      sessionId,
      claimId,
      foundItemId: hasMatch ? topMatchId : null,
      initialScore: topMatchScore,
      currentScore: topMatchScore,
      status: "searching",
      riderOriginalDesc: body.description,
      riderName: body.name,
      riderEmail: body.email ?? "",
      enrichedDescription: body.description,
      messages: [],
      questionsAsked: 0,
      maxQuestions: 6,
    });

    // Flag for manual review if no auto matches were found
    if (pendingMatches.length === 0) {
      await ClaimModel.findOneAndUpdate(
        { claimId },
        { $set: { manualReviewRequired: true } }
      );
    }

    return reply.code(201).send({
      ok: true,
      claimId,
      sessionId,
      initialScore: topMatchScore,
      hasMatch,
      matches: pendingMatches,
      matchesFound: pendingMatches.length,
      message: pendingMatches.length > 0
        ? `We found ${pendingMatches.length} potential match(es)! Our staff will review and contact you.`
        : "Your report has been filed. We'll notify you if a matching item is found.",
    });
  } catch (err: any) {
    const status = err?.name === "ZodError" ? 400 : 500;
    return reply.code(status).send({ ok: false, error: err?.message || "Failed to create claim" });
  }
}

/** POST /api/claims/:claimId/questions — store clarifying Q&A and re-embed item */
export async function addClarifyingQA(
  req: FastifyRequest<{ Params: { claimId: string }; Body: { question: string; answer?: string; matchId?: string; itemId?: string; source?: "auto" | "manual" } }>,
  reply: FastifyReply
) {
  try {
    const { claimId } = req.params;
    const { question, answer, matchId, itemId, source } = req.body;
    if (!question) return reply.code(400).send({ ok: false, error: "Question required" });

    const claim = await ClaimModel.findOne({ claimId });
    if (!claim) return reply.code(404).send({ ok: false, error: "Claim not found" });

    const entry = {
      question,
      answer,
      matchId,
      itemId,
      askedAt: new Date(),
      answeredAt: answer ? new Date() : undefined,
      source: source || "auto",
    };

    claim.clarifyingQuestions.push(entry);
    await claim.save();

    // If linked to a found item, enrich metadata in Pinecone for better future matches
    if (itemId && answer) {
      try {
        const foundItem = await itemsRepo.get(itemId);
        if (foundItem) {
          const attributes = {
            ...(foundItem.attributes || {}),
            clarifyingAnswers: [
              ...(foundItem.attributes?.clarifyingAnswers || []),
              { question, answer },
            ],
          };
          await itemsRepo.update(itemId, { attributes });
          await PineconeService.embedAndUpsertItem({
            itemId,
            description: `${foundItem.description || ""} Clarifying: ${question} ${answer}`,
            locationName: foundItem.locationName,
            attributes,
          });
        }
      } catch (err) {
        req.log.warn({ err }, "[claims] Failed to upsert clarifying QA to Pinecone");
      }
    }

    return reply.send({ ok: true, saved: entry });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err?.message || "Failed to save clarifying question" });
  }
}

/** GET /api/claims/manual — list claims needing manual review */
export async function listManualClaims(
  _req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const claims = await ClaimModel.find({ manualReviewRequired: true, status: "pending" })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return reply.send({ ok: true, count: claims.length, claims });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err?.message || "Failed to list manual claims" });
  }
}

/** POST /api/claims/:claimId/manual/approve — admin resolves manual review */
export async function approveManualClaim(
  req: FastifyRequest<{ Params: { claimId: string }; Body: { notes?: string } }>,
  reply: FastifyReply
) {
  try {
    const { claimId } = req.params;
    const claim = await ClaimModel.findOne({ claimId });
    if (!claim) return reply.code(404).send({ ok: false, error: "Claim not found" });

    claim.status = "approved";
    claim.manualReviewRequired = false;
    claim.manualReviewedAt = new Date();
    await claim.save();

    return reply.send({ ok: true, message: "Manual claim approved" });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err?.message || "Failed to approve manual claim" });
  }
}

/** POST /api/claims/:claimId/manual/reject — admin rejects manual review */
export async function rejectManualClaim(
  req: FastifyRequest<{ Params: { claimId: string }; Body: { notes?: string } }>,
  reply: FastifyReply
) {
  try {
    const { claimId } = req.params;
    const claim = await ClaimModel.findOne({ claimId });
    if (!claim) return reply.code(404).send({ ok: false, error: "Claim not found" });

    claim.status = "rejected";
    claim.manualReviewRequired = false;
    claim.manualReviewedAt = new Date();
    await claim.save();

    return reply.send({ ok: true, message: "Manual claim rejected" });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err?.message || "Failed to reject manual claim" });
  }
}

/** GET /api/claims — admin lists all claims */
export async function listClaims(
  _req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const claims = await ClaimModel.find({}).sort({ createdAt: -1 }).lean().exec();
    return reply.send({ ok: true, count: claims.length, claims });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err?.message || "Failed to list claims" });
  }
}

/** GET /api/claims/matches — admin views all pending matches */
export async function listPendingMatches(
  _req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const matches = await PendingMatchModel.find({})
      .sort({ matchScore: -1, createdAt: -1 })
      .lean()
      .exec();
    return reply.send({ ok: true, count: matches.length, matches });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err?.message || "Failed to list matches" });
  }
}

/** POST /api/claims/matches/:matchId/approve — admin approves a match → generates token → sends email */
export async function approveMatch(
  req: FastifyRequest<{ Params: { matchId: string }; Body: { notes?: string } }>,
  reply: FastifyReply
) {
  try {
    const match = await PendingMatchModel.findOne({ matchId: req.params.matchId });
    if (!match) return reply.code(404).send({ ok: false, error: "Match not found" });
    if (match.status !== "pending_review")
      return reply.code(400).send({ ok: false, error: `Match already ${match.status}` });

    // Generate unique collection token (GOT-YYYYMMDD-XXXXXXXX-CC)
    const collectionToken = generateCollectionToken(match.claimId, match.matchId);

    // Update status + store token
    match.status           = "approved";
    match.reviewedAt       = new Date();
    match.adminNotes       = req.body?.notes ?? "";
    match.collectionToken  = collectionToken;
    await match.save();

    // Update claim status too
    await ClaimModel.findOneAndUpdate(
      { claimId: match.claimId },
      { $set: { status: "approved", matchedItemId: match.foundItemId } }
    );

    // Send email notification if rider provided email
    if (match.riderEmail) {
      try {
        const { sendMatchApprovedEmail } = await import("../../services/email/emailService");
        await sendMatchApprovedEmail({
          riderName:        match.riderName,
          riderEmail:       match.riderEmail,
          claimId:          match.claimId,
          foundDescription: match.foundDescription || "Found item",
          foundLocation:    match.foundLocation,
          matchScore:       match.matchScore,
          adminNotes:       match.adminNotes,
          collectionToken,
        });
        req.log.info({ claimId: match.claimId, collectionToken }, "Match approval email sent with collection token");
      } catch (emailErr) {
        req.log.error({ emailErr }, "Failed to send match approval email");
        // Don't fail — email is best-effort
      }
    }

    return reply.send({
      ok: true,
      collectionToken,
      message: match.riderEmail
        ? `Match approved and email sent to ${match.riderEmail}`
        : `Match approved — token: ${collectionToken} (no email on file, contact rider by phone)`,
    });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err?.message });
  }
}

/** POST /api/claims/matches/:matchId/reject — admin rejects a match → sends declined email */
export async function rejectMatch(
  req: FastifyRequest<{ Params: { matchId: string }; Body: { notes?: string } }>,
  reply: FastifyReply
) {
  try {
    const match = await PendingMatchModel.findOne({ matchId: req.params.matchId });
    if (!match) return reply.code(404).send({ ok: false, error: "Match not found" });

    match.status     = "rejected";
    match.reviewedAt = new Date();
    match.adminNotes = req.body?.notes ?? "";
    await match.save();

    // Send "we couldn't confirm" email if rider has email on file
    if (match.riderEmail) {
      try {
        const { sendMatchDeclinedEmail } = await import("../../services/email/emailService");
        await sendMatchDeclinedEmail({
          riderName:  match.riderName,
          riderEmail: match.riderEmail,
          claimId:    match.claimId,
        });
        req.log.info({ claimId: match.claimId }, "Match declined email sent");
      } catch (emailErr) {
        req.log.warn({ emailErr }, "Failed to send match declined email");
      }
    }

    return reply.send({ ok: true, message: "Match rejected" });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err?.message });
  }
}
