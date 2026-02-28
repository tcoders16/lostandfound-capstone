import { mongoose } from "../../db/mongo";
import { ItemModel } from "../../models/Items"

// ---------- Feature flag / readiness helpers ----------
const USE_MEMORY = String(process.env.USE_MEMORY_DB || "").toLowerCase() === "true";
const inMemoryDB = new Map<string, any>();

function mongoReady(): boolean {
  if (USE_MEMORY) return false;
  // 1 = connected, 2 = connecting (allow ops), others: use memory
  return mongoose?.connection?.readyState === 1 || mongoose?.connection?.readyState === 2;
}

// ---------- Shape helpers ----------
function toClient(doc: any | null) {
  if (!doc) return null;
  const d = (doc as any).toObject ? (doc as any).toObject() : doc;
  return {
    id: d.itemId,                 // keep legacy "id"
    itemId: d.itemId,
    filename: d.filename,
    url: d.url,
    locationName: d.locationName,
    description: d.description,
    attributes: d.attributes,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

// ---------- Mongo-backed implementations ----------
async function mongoSave(itemId: string, data: any) {
  const now = new Date().toISOString();

  await ItemModel.findOneAndUpdate(
    { itemId },
    {
      $setOnInsert: { createdAt: now, itemId },
      $set: {
        filename: data.filename ?? itemId,
        url: data.url,
        locationName: data.locationName,
        description: data.description,
        attributes: data.attributes,
        updatedAt: now,
      },
    },
    { new: true, upsert: true }
  ).exec();
}

async function mongoUpdate(itemId: string, data: any) {
  const now = new Date().toISOString();
  const doc = await ItemModel.findOneAndUpdate(
    { itemId },
    { $set: { ...data, updatedAt: now } },
    { new: true }
  ).exec();

  if (!doc) throw new Error(`Item ${itemId} not found`);
}

async function mongoGet(itemId: string) {
  const doc = await ItemModel.findOne({ itemId }).lean().exec();
  return toClient(doc);
}

async function mongoList(limit = 200) {
  const docs = await ItemModel.find({})
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()
    .exec();
  return docs.map(toClient);
}

// ---------- Memory-backed implementations (unchanged behavior) ----------
async function memSave(itemId: string, data: any) {
  const now = new Date().toISOString();
  const existing = inMemoryDB.get(itemId);
  const createdAt = existing?.createdAt ?? data.createdAt ?? now;
  inMemoryDB.set(itemId, { id: itemId, itemId, createdAt, updatedAt: now, ...existing, ...data });
}

async function memUpdate(itemId: string, data: any) {
  const existing = inMemoryDB.get(itemId);
  if (!existing) throw new Error(`Item ${itemId} not found`);
  const now = new Date().toISOString();
  inMemoryDB.set(itemId, { ...existing, ...data, updatedAt: now });
}

async function memGet(itemId: string) {
  return inMemoryDB.get(itemId) ?? null;
}

async function memList() {
  return Array.from(inMemoryDB.values());
}

// ---------- Public API (same surface) ----------
async function save(itemId: string, data: any) {
  if (mongoReady()) return mongoSave(itemId, data);
  return memSave(itemId, data);
}

async function update(itemId: string, data: any) {
  if (mongoReady()) return mongoUpdate(itemId, data);
  return memUpdate(itemId, data);
}

async function get(itemId: string) {
  if (mongoReady()) return mongoGet(itemId);
  return memGet(itemId);
}

async function list(limit = 200) {
  if (mongoReady()) return mongoList(limit);
  return memList();
}

export const itemsRepo = { save, update, get, list };