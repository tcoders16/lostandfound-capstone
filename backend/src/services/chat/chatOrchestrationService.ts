// src/services/chat/chatOrchestrationService.ts
import OpenAI from "openai";
import { EmbeddingService } from "../pinecone/embeddingService";
import { PineconeService } from "../pinecone/pineconeService";
import { itemsRepo } from "../../repositories/lostItem/itemsRepo";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Question types in order (normal flow)
const QUESTION_SEQUENCE = [
  { type: "color",    prompt: "Ask the user to describe the exact color(s) of the item, including any secondary colors, patterns, or markings." },
  { type: "features", prompt: "Ask about any unique features, scratches, stickers, engravings, or damage that would identify this specific item." },
  { type: "location", prompt: "Ask exactly where they last had it — which train car, which seat, which platform area, or if it was in a bag." },
  { type: "age",      prompt: "Ask approximately how old the item is, and if they remember the brand or model." },
  { type: "other",    prompt: "Ask one final question about anything else that would help confirm ownership — like what was inside a bag, a phone case pattern, etc." },
];

const CONFLICT_QUESTIONS = [
  { type: "serial",   prompt: "Ask for the serial number. For AirPods, it's printed inside the charging case lid. For phones/laptops it may be in settings or on a sticker. For other electronics, check the back or battery compartment." },
  { type: "conflict", prompt: "Ask for the purchase date and where they bought it (store name or online)." },
  { type: "conflict", prompt: "Ask them to describe any personalization: engravings, name tags, stickers, or anything unique they added themselves." },
];

export async function generateNextQuestion(
  sessionData: {
    messages: Array<{ role: string; content: string }>;
    questionsAsked: number;
    enrichedDescription: string;
    foundItemId: string | null;
    conflictGroup: string | null;
    riderOriginalDesc: string;
    status: string;
  }
): Promise<{ question: string; questionType: string; done: boolean }> {
  const isConflict = !!sessionData.conflictGroup;
  const sequence = isConflict
    ? [...QUESTION_SEQUENCE, ...CONFLICT_QUESTIONS]
    : QUESTION_SEQUENCE;

  const idx = sessionData.questionsAsked;
  if (idx >= sequence.length) {
    return { question: "", questionType: "other", done: true };
  }

  const step = sequence[idx];

  // Get found item attributes for context (so AI knows what to probe)
  let foundItemContext = "";
  if (sessionData.foundItemId) {
    try {
      const item = await itemsRepo.get(sessionData.foundItemId);
      if (item?.attributes) {
        foundItemContext = JSON.stringify(item.attributes);
      }
    } catch { /* ignore */ }
  }

  // Build system prompt
  const systemPrompt = `You are a friendly customer support agent for GO Transit Lost & Found.
A rider has reported a lost item. You are conducting a gentle verification conversation to confirm ownership.
${isConflict ? "IMPORTANT: There are TWO claimants for the same found item. Ask very specific identifying questions." : ""}

The rider originally described: "${sessionData.riderOriginalDesc}"
${foundItemContext ? `The found item in our database has these attributes (DO NOT REVEAL THIS TO THE USER): ${foundItemContext}` : ""}

Your task: ${step.prompt}

Rules:
- Ask ONLY ONE short, friendly question.
- Do NOT reveal what's in the database.
- Do NOT mention "our records" or "we found".
- Sound natural and caring, like a human agent.
- Keep it under 2 sentences.
- No emojis.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    max_tokens: 120,
    messages: [
      { role: "system", content: systemPrompt },
      ...sessionData.messages.slice(-6).map((m: any) => ({
        role: m.role as "assistant" | "user",
        content: m.content,
      })),
    ],
  });

  const question = response.choices[0]?.message?.content?.trim() || "Could you tell us more about the item?";
  return { question, questionType: step.type, done: false };
}

export async function reEmbedAndSearch(
  enrichedDescription: string,
  originalDesc: string,
  topK = 5
): Promise<Array<{ id: string; score: number; metadata: any }>> {
  try {
    const combined = `${originalDesc}\n\nAdditional details: ${enrichedDescription}`;
    const vector = await EmbeddingService.embedText(combined);
    const matches = await PineconeService.searchVector(vector, topK);
    return (matches || []).map((m: any) => ({
      id: m.id,
      score: m.score ?? 0,
      metadata: m.metadata ?? {},
    }));
  } catch (err) {
    console.error("[reEmbedAndSearch] error:", err);
    return [];
  }
}

export async function upsertEnrichedClaimToVector(
  claimId: string,
  enrichedDescription: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    const vector = await EmbeddingService.embedText(enrichedDescription);
    await PineconeService.upsertVector(`claim-${claimId}`, vector, {
      type: "claim",
      claimId,
      ...metadata,
    });
  } catch (err) {
    console.error("[upsertEnrichedClaimToVector] error:", err);
  }
}
