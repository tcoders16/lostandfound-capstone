// src/services/lostItem/items.service.ts
import { randomUUID } from "crypto";
import { itemsRepo } from "../repositories/lostItem/itemsRepo";
import { Item } from "../types/items";
import type { ItemAttributes } from "../types/items";
/** ---- Types ---- */
export type StartUploadRes = {
  itemId: string;
  uploadUrl: string;     // signed PUT url (fake in dev)
  storagePath: string;   // where the image will live (e.g., "lostfound/<id>.jpg")
};

export type FinalizeUploadInput = {
  itemId: string;
  storagePath: string;
  locationName: string;
  description?: string;
  foundAt?: string;      // ISO date string (optional)
};

export type UpdateExtractedInput = {
  itemId: string;
  attributes: ItemAttributes;
  vectors?: number[];    // embedding vector (optional initially)
};


export type ItemRecord = {
  id: string;
  storagePath: string;
  imageUrl?: string;
  location: { name: string };
  description?: string;
  foundAt?: string;
  status: "found" | "processed";
  attributes?: Record<string, string>;
  vectors?: number[];
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
};



/**
 * DEV NOTE:
 * For now we return a fake signed upload URL so the
 * frontend can PUT the file without real cloud storage.
 * Replace with Firebase Storage or GCS signed URL later.
 */
export async function createSignedUpload(contentType: string): Promise<StartUploadRes> {
  if (!contentType) throw new Error("contentType required");

  const itemId = randomUUID();
  const ext = guessExt(contentType);
  const storagePath = `lostfound/${itemId}${ext}`;

  // In dev: fake signed URL host (frontend will try to PUT; expect failure unless mocked)
  const uploadUrl = `https://fake-upload.local/${storagePath}`;

  return { itemId, uploadUrl, storagePath };
}

/** Create the initial record so it can be analysed/enriched later. */
export async function finalizeUpload(body: FinalizeUploadInput) {
  const now = new Date().toISOString();

  const record: Omit<ItemRecord, "id"> = {
    storagePath: body.storagePath,
    imageUrl: undefined, // supply a real CDN URL once storage is wired
    location: { name: body.locationName },
    description: body.description?.slice(0, 240),
    foundAt: body.foundAt,
    status: "found",
    createdAt: now,
    updatedAt: now,
  };

  await itemsRepo.save(body.itemId, record);
  return { ok: true as const, itemId: body.itemId };
}

/** Fetch one item (admin preview / details) */
export async function fetchItem(itemId: string) {
  return itemsRepo.get(itemId);
}

/** List items (admin). Add filters/pagination when needed. */
export async function listItems() {
  return itemsRepo.list();
}

/** Update attributes/vectors after analysis; mark processed. */
export async function updateExtracted(input: UpdateExtractedInput) {
  const now = new Date().toISOString();
  await itemsRepo.update(input.itemId, {
    attributes: input.attributes,
    ...(input.vectors ? { vectors: input.vectors } : {}),
    status: "processed",
    updatedAt: now,
  });
  return { ok: true as const, itemId: input.itemId };
}

/** ---- helpers ---- */
function guessExt(contentType: string): string {
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return ".jpg"; // default
}