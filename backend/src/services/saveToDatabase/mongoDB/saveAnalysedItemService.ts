// src/services/mongoDB/saveAnalysedItem.service.ts
/**
 * saveAnalysedItemToMongo
 * ──────────────────────────────────────────────────────────────────────────
 * 1. Stores the item document in MongoDB via itemsRepo
 * 2. Embeds the item and upserts the vector to Pinecone as type="found_item"
 *
 * The Pinecone embedding is built from ALL available fields (description,
 * location, AI attributes) to maximise semantic search signal.
 */

import { itemsRepo } from "../../../repositories/lostItem/itemsRepo";
import { PineconeService } from "../../pinecone/pineconeService";
import dotenv from "dotenv";
dotenv.config();

export async function saveAnalysedItemToMongo(input: {
  itemId: string;
  filename: string;
  url?: string;
  locationName?: string;
  description?: string;
  attributes: Record<string, any>;
}) {
  try {
    const { itemId, filename, url, locationName, description, attributes } = input;

    const safeAttributes   = attributes ?? {};
    const cleanDescription = description?.trim() || safeAttributes.summary || "";
    const now              = new Date().toISOString();

    // ── 1. Persist to MongoDB ─────────────────────────────────────────────
    await itemsRepo.save(itemId, {
      itemId,
      filename,
      url,
      locationName,
      description: cleanDescription,
      attributes:  safeAttributes,
      updatedAt:   now,
    });

    console.log(`[saveAnalysedItemToMongo] MongoDB ✓ itemId=${itemId}`);

    // ── 2. Embed + upsert to Pinecone (tagged type="found_item") ──────────
    //    embedAndUpsertItem builds the richest possible embedding text from
    //    description, locationName, and all extracted attribute fields.
    //    It also sets type="found_item" in metadata so searchVector can
    //    filter out claim vectors.
    await PineconeService.embedAndUpsertItem({
      itemId,
      description: cleanDescription,
      locationName,
      attributes:  safeAttributes,
    });

    console.log(`[saveAnalysedItemToMongo] Pinecone ✓ itemId=${itemId}`);

    return { ok: true, itemId, savedAt: now };
  } catch (err: any) {
    console.error("[saveAnalysedItemToMongo] Failed:", err);
    return { ok: false, error: err?.message || "Failed to save analysed item" };
  }
}
