// src/services/chat/chatOrchestrationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Item-aware AI question generation + re-embedding pipeline.
//
// Questions are driven by the *category* of the lost item so:
//   electronics → probes colour/case, damage, brand/model/serial, location, accessories
//   clothing    → probes colour/logo, brand/size, unique features, pocket contents, location
//   accessory   → probes colour/material, distinctive features, contents, damage, location
//   document    → probes document type, name on it, container, other items, location
//   other       → probes colour/size, markings, material, location, uniqueness
//
// Each theme is passed as a task description to GPT-4o-mini which then writes
// a single, natural, context-aware question.  This way no two sessions ever
// get exactly the same phrasing, and already-answered details are skipped.
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from "openai";
import { EmbeddingService } from "../pinecone/embeddingService";
import { PineconeService } from "../pinecone/pineconeService";
import { itemsRepo } from "../../repositories/lostItem/itemsRepo";

// Lazy client init with fallback env var name to avoid runtime 500s when key is missing
let _openai: OpenAI | null = null;
function getOpenAIClient() {
  if (_openai) return _openai;
  const apiKey = process.env.OPENAI_API_KEY || (process as any).env?.OPENAI_KEY; 
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  _openai = new OpenAI({ apiKey });
  return _openai;
}

// ── Category-specific question themes ────────────────────────────────────────
// Each entry is a GPT task prompt (never shown to rider).
// Order = order in which questions are asked.

type QuestionTheme = { type: string; prompt: string };

const CATEGORY_THEMES: Record<string, QuestionTheme[]> = {
  electronics: [
    {
      type: "appearance",
      prompt:
        "Ask what color the device is and whether it has a case, skin, or protective cover — including what that case looks like (color, material, brand if known).",
    },
    {
      type: "damage",
      prompt:
        "Ask whether the device has any scratches, cracks, dents, stickers, marks, or other physical damage that would distinguish it from a brand-new one.",
    },
    {
      type: "identity",
      prompt:
        "Ask for the brand and exact model name or number. For phones or laptops, also ask if they can find the serial number or IMEI in their cloud account (e.g. Find My iPhone, Google Find My Device, manufacturer warranty registration).",
    },
    {
      type: "location",
      prompt:
        "Ask exactly where they last had the device: was it in a bag or pocket, placed on a seat, a table, or left in the seat pocket? Which GO route or station?",
    },
    {
      type: "extras",
      prompt:
        "Ask if there were any accessories with the device at the time — a charger, earphones, stylus, or carrying bag — and what those looked like.",
    },
  ],

  clothing: [
    {
      type: "appearance",
      prompt:
        "Ask what color or colors the item is, and whether it has any logos, brand text, patterns, stripes, or graphic prints visible on the outside.",
    },
    {
      type: "brand",
      prompt:
        "Ask what brand the item is and what size it is. Mention they can check the inside tag if they remember it.",
    },
    {
      type: "features",
      prompt:
        "Ask whether the item has any unique features: a tear, a repair, an iron-on patch, a pin badge, a bleach stain, fraying, or any custom alteration they made.",
    },
    {
      type: "contents",
      prompt:
        "For jackets, hoodies, or coats: ask what was in the pockets. For bags, backpacks, or purses: ask what items were inside at the time.",
    },
    {
      type: "location",
      prompt:
        "Ask where exactly they last had the item during their GO Transit journey — on a seat, in the overhead luggage area, on a hook, or left on the platform.",
    },
  ],

  accessory: [
    {
      type: "appearance",
      prompt:
        "Ask what color and material the item is — for example, black leather wallet, silver metal keychain, tortoiseshell glasses frame.",
    },
    {
      type: "distinctive",
      prompt:
        "Ask whether there are any distinctive features: for a wallet — monogram, brand logo, or colour-contrast stitching; for keys — key fobs, charms, or shaped rings; for glasses — the brand name on the arm and lens type.",
    },
    {
      type: "contents",
      prompt:
        "Ask what was inside or attached: for a wallet — which cards or ID, any cash; for a key ring — how many keys and what they open; for a bag — what was stored inside.",
    },
    {
      type: "damage",
      prompt:
        "Ask if there is any wear, a broken clasp, a scratch, a missing screw, or any other damage or unique mark they remember.",
    },
    {
      type: "location",
      prompt:
        "Ask exactly where on their journey they last had the item — which station, which seat on the train, or which pocket or bag it was kept in.",
    },
  ],

  document: [
    {
      type: "doc_type",
      prompt:
        "Ask what type of document it was: a driver's licence, passport, health card, Presto card, bank or credit card, student ID, or another type.",
    },
    {
      type: "identity",
      prompt:
        "Ask what full name appears on the document, and if it is a government ID, which province or country issued it.",
    },
    {
      type: "container",
      prompt:
        "Ask whether the document was inside a wallet, card holder, lanyard, or envelope, and what that container looked like (color, material, any branding).",
    },
    {
      type: "other_items",
      prompt:
        "Ask whether any other items were together with the document at the time — other cards, receipts, cash, keys, or a phone.",
    },
    {
      type: "location",
      prompt:
        "Ask where they last used or saw the document — at a turnstile, ticket machine, on a seat, or at a concession area.",
    },
  ],

  other: [
    {
      type: "appearance",
      prompt:
        "Ask what color the item is and describe its overall shape and approximate size (e.g., roughly the size of a book, a shoe box, a fist).",
    },
    {
      type: "markings",
      prompt:
        "Ask whether the item has any text, a brand name, a logo, an engraving, a sticker, or any other visible markings on it.",
    },
    {
      type: "material",
      prompt:
        "Ask what material the item is made of (plastic, metal, fabric, leather, glass, wood, etc.) and what general condition it is in.",
    },
    {
      type: "location",
      prompt:
        "Ask exactly where they last had it — which seat or car on the train, which platform, or whether it was inside a bag.",
    },
    {
      type: "distinctive",
      prompt:
        "Ask if there is anything truly unique about this specific item — something that would distinguish it from every other similar-looking item.",
    },
  ],
};

// ── Escalation questions when two riders claim the same item ─────────────────
const CONFLICT_QUESTIONS: QuestionTheme[] = [
  {
    type: "serial",
    prompt:
      "Ask for the serial number. For AirPods it is printed inside the charging case lid. For phones and laptops it may be in Settings or on a sticker. For other electronics check the battery compartment or the back of the device.",
  },
  {
    type: "conflict",
    prompt:
      "Ask for the purchase date and where they bought the item (store name, city, or online retailer).",
  },
  {
    type: "conflict",
    prompt:
      "Ask them to describe any personalisation they added themselves: engravings, name labels, custom stickers, or any modification unique to their copy.",
  },
];

const FALLBACK_QUESTION: Record<string, string> = {
  appearance: "What colour is it, and does it have a case/cover or distinctive look?",
  damage: "Any scratches, dents, stickers, or wear that make it identifiable?",
  identity: "Do you know the brand and exact model or serial number?",
  location: "Where exactly did you last have it (station/seat/bag/pocket)?",
  extras: "Were there any accessories with it, like a charger or cable? What do they look like?",
  doc_type: "What type of document is it (passport, licence, Presto, etc.)?",
  container: "Was it inside a wallet, holder, lanyard, or envelope? What does that look like?",
  contents: "What was inside or attached to it when you lost it?",
  distinctive: "Any unique features that would set it apart from a similar item?",
  serial: "Can you provide the serial number or code printed on it?",
  conflict: "When and where did you buy it? Any personal markings or stickers?",
  markings: "Any text, logo, or engraving on it?",
  material: "What material is it made of and what condition is it in?",
  other: "Describe colour, size, markings, and where you last had it.",
};

// ── Main question generator ───────────────────────────────────────────────────

export async function generateNextQuestion(sessionData: {
  messages: Array<{ role: string; content: string }>;
  questionsAsked: number;
  enrichedDescription: string;
  foundItemId: string | null;
  conflictGroup: string | null;
  riderOriginalDesc: string;
  status: string;
  category?: string;
}): Promise<{ question: string; questionType: string; done: boolean }> {
  const isConflict = !!sessionData.conflictGroup;
  const category = (sessionData.category || "other").toLowerCase();

  // Resolve to a known key; alias "document" → "document", fall back to "other"
  const baseKey = Object.keys(CATEGORY_THEMES).includes(category) ? category : "other";
  const baseThemes = CATEGORY_THEMES[baseKey];
  const sequence: QuestionTheme[] = isConflict
    ? [...baseThemes, ...CONFLICT_QUESTIONS]
    : baseThemes;

  // ── Use ACTUAL assistant message count as the source of truth for which
  //    question to ask next.  The questionsAsked counter can desync if a
  //    previous session.save() failed (e.g. due to enum errors), which
  //    causes the same question to loop endlessly. Counting real messages
  //    in the array is always consistent because they survive even partial
  //    save failures (the messages array is read from MongoDB on each request).
  const askedCount = sessionData.messages.filter(m => m.role === "assistant").length;
  const idx = askedCount;
  if (idx >= sequence.length) {
    return { question: "", questionType: "other", done: true };
  }

  const step = sequence[idx];

  // Fetch found item attributes to give GPT private context
  let foundItemContext = "";
  if (sessionData.foundItemId) {
    try {
      const item = await itemsRepo.get(sessionData.foundItemId);
      if (item?.attributes) {
        foundItemContext = JSON.stringify(item.attributes);
      }
    } catch {
      /* non-fatal — GPT will work without it */
    }
  }

  // ── Build system prompt ───────────────────────────────────────────────────
  const systemPromptParts = [
    `You are a friendly customer support agent for GO Transit Lost & Found in Ontario, Canada.`,
    `A rider has reported a lost ${category} item. You are conducting a gentle ownership-verification chat.`,
    isConflict
      ? `IMPORTANT: Two different riders are claiming the same found item. Ask a very specific identifying question.`
      : ``,
    ``,
    `Rider's original description: "${sessionData.riderOriginalDesc}"`,
    sessionData.enrichedDescription &&
    sessionData.enrichedDescription !== sessionData.riderOriginalDesc
      ? `Additional details gathered so far: "${sessionData.enrichedDescription}"`
      : ``,
    foundItemContext
      ? `\nFound item data (PRIVATE — for your context only, do NOT reveal to the rider): ${foundItemContext}`
      : ``,
    ``,
    `Your task for this message:`,
    step.prompt,
    ``,
    `Rules:`,
    `- Ask ONLY ONE short, friendly question specific to a lost ${category}.`,
    `- If the rider already clearly answered this aspect, pivot to another identifying detail not yet covered.`,
    `- Never reveal anything from our database, never say "our records show" or "we found".`,
    `- Never tell the rider their confidence score or percentage.`,
    `- Sound warm and professional — like a helpful human agent, not a form or a robot.`,
    `- Maximum 2 sentences. No emojis. No bullet points. No numbered lists.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 140,
      messages: [
        { role: "system", content: systemPromptParts },
        // Include last 8 exchanges so GPT avoids asking what was already answered
        ...sessionData.messages.slice(-8).map((m: any) => ({
          role: m.role as "assistant" | "user",
          content: m.content,
        })),
      ],
    });

    const question =
      response.choices[0]?.message?.content?.trim() ||
      "Could you describe the item in a bit more detail?";

    return { question, questionType: step.type, done: false };
  } catch (err) {
    console.error("[generateNextQuestion] OpenAI error:", err);
    const fallback = FALLBACK_QUESTION[step.type] || FALLBACK_QUESTION.other;
    return { question: fallback, questionType: step.type, done: false };
  }

}

// ── Re-embed and search ───────────────────────────────────────────────────────

export async function reEmbedAndSearch(
  enrichedDescription: string,
  originalDesc: string,
  topK = 5
): Promise<Array<{ id: string; score: number; metadata: any }>> {
  try {
    const combined = `${originalDesc}\n\nAdditional details from rider: ${enrichedDescription}`;
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

// ── Upsert enriched claim vector ──────────────────────────────────────────────

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
