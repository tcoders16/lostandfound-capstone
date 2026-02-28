// src/services/lostItem/openai/analyseImage.ts
import path from "node:path";
import fs from "node:fs/promises";
import { getOpenAI } from "../../../client/openai";
import { itemsRepo } from "../../../repositories/lostItem/itemsRepo";
import type { ItemAttributes } from "../../../types/items";

/* ───────────────── Helpers ───────────────── */

async function upsertItem(
  itemId: string,
  data: Partial<{
    attributes: ItemAttributes;
    status: string;
    description: string;
    locationName: string;
    createdAt: string;
    updatedAt: string;
  }>
) {
  try {
    await itemsRepo.update(itemId, data);
  } catch (e: any) {
    if (/not found/i.test(e?.message || "")) {
      const now = new Date().toISOString();
      await itemsRepo.save(itemId, {
        description: data.description ?? "",
        locationName: data.locationName ?? "",
        status: data.status ?? "processed",
        attributes: data.attributes,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      });
    } else {
      throw e;
    }
  }
}

function mimeFromExt(p: string): string {
  const ext = path.extname(p).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

/* ───────────────── Main ───────────────── */

export async function analyzeImage(input: {
  itemId: string;
  localPath?: string;            // <-- new: analyze from saved file path
  imageUrl?: string;             // public URL (fallback)
  imageBase64?: string;          // raw base64 (no data: prefix OK; we'll strip if present)
  detail?: "low" | "high" | "auto";
  prompt?: string;
}) {
  const { itemId, detail = "high", prompt } = input;

  if (!input.localPath && !input.imageUrl && !input.imageBase64) {
    throw new Error("Provide localPath or imageBase64 or imageUrl");
  }

  const openai = getOpenAI();

  // Normalize to a data URL first if possible
  let dataUrl: string | undefined;

  if (input.localPath) {
    // Read file from disk and build data URL
    const buf = await fs.readFile(input.localPath);
    const mime = mimeFromExt(input.localPath);
    dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  } else if (input.imageBase64) {
    const rawB64 = input.imageBase64.replace(/^data:[^,]+,/, ""); // strip any prefix
    // default to jpeg for base64 if not specified
    dataUrl = `data:image/jpeg;base64,${rawB64}`;
  }

  // If still no dataUrl, fall back to URL (and normalize /upload/ vs /uploads/)
  const safeUrl =
    !dataUrl && input.imageUrl
      ? input.imageUrl.replace("/upload/", "/uploads/") // fix common prefix
      : undefined;

  const imagePart: any = {
    type: "input_image",
    detail,
    image_url: dataUrl ?? safeUrl,
  };

  if (!imagePart.image_url) {
    throw new Error("No usable image input (localPath/base64/url) provided");
  }

  const sysPrompt =
    prompt ??
    `You are assisting a transit lost-and-found.

    Analyze the image and return EXACTLY ONE JSON object, with these keys ONLY (no extra keys, no comments, no markdown, no code fences):

    {
      "category": "electronics|clothing|accessory|document|other",
      "brand": "",
      "model": "",
      "color": "",
      "material": "",
      "shape": "",
      "size": "small|medium|large",
      "condition": "new|used|worn|damaged",
      "text": "",
      "serialNumber": "",
      "labels": [],
      "summary": "",
      "keywords": [],
      "distinctiveFeatures": [],
      "confidence": 0
    }

    Rules:
    - If unknown, use "" for strings and [] for arrays.
    - "labels", "keywords", and "distinctiveFeatures" are arrays of strings.
    - "confidence" is a number between 0 and 1.
    - Do NOT wrap the JSON in backticks or prose.
    - Output MUST be valid JSON UTF-8 with double-quoted keys/strings.`.trim();

  const resp = await openai.responses.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: sysPrompt },
          imagePart,
        ],
      },
    ],
  });

  const raw = (resp.output_text ?? "").trim();

  // Try parse as JSON
  let attributes: ItemAttributes | undefined;
  try {
    attributes = JSON.parse(raw) as ItemAttributes;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        attributes = JSON.parse(match[0]) as ItemAttributes;
      } catch { /* ignore */ }
    }
  }

  const now = new Date().toISOString();

  if (!attributes) {
    await upsertItem(itemId, {
      attributes: { summary: raw } as ItemAttributes,
      status: "processed",
      updatedAt: now,
    });
    return { ok: true as const, itemId, attributes: { summary: raw } as ItemAttributes };
  }

  await upsertItem(itemId, {
    attributes,
    status: "processed",
    updatedAt: now,
  });

  return { ok: true as const, itemId, attributes };
}