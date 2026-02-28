// src/services/vector.service.ts
import 'dotenv/config';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

/** ---------- Setup ---------- */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

// If you use namespaces in Pinecone (optional)
const NAMESPACE = process.env.PINECONE_NAMESPACE || undefined;

// Make sure the index exists in the dashboard with dim=1536, metric=cosine
const index = pinecone.index(process.env.PINECONE_INDEX!);

/** ---------- Types ---------- */
export type FoundItemInput = {
  id: string;                 // stable id (e.g., your Mongo _id)
  ai_analysis: string;        // e.g., "Black fabric cap with raised letter B..."
  image_url?: string;         // optional
  location?: string;          // optional
  keywords?: string[];        // optional tags
  features?: string[];        // optional features
  ocr?: string;               // optional OCR text
};

export type SearchMatch = {
  id: string;
  score: number;
  text?: string;
  location?: string;
  image_url?: string;
  type?: string;
  raw?: Record<string, any>;
};

/** ---------- Helpers ---------- */
function buildSearchText(i: FoundItemInput): string {
  const parts = [
    `Found item: ${i.ai_analysis}`,
    i?.features?.length ? `Distinctive features: ${i.features.join(', ')}` : '',
    i?.keywords?.length ? `Tags: ${i.keywords.join(', ')}` : '',
    i?.ocr ? `OCR: ${i.ocr}` : '',
    i?.location ? `Location: ${i.location}` : ''
  ].filter(Boolean);
  return parts.join('. ').trim();
}

async function embed(text: string): Promise<number[]> {
  const r = await openai.embeddings.create({
    model: 'text-embedding-3-small', // 1536-dim
    input: text
  });
  // Pinecone expects number[]
  return r.data[0].embedding as unknown as number[];
}

/** ---------- Public API ---------- */

/**
 * Upsert a "found" item into Pinecone:
 * - builds one natural-language `search_text`
 * - embeds it (1536-dim)
 * - upserts with rich metadata for display/filtering
 * NOTE: Pinecone metadata does NOT allow `null`. We omit empty fields.
 */
export async function storeFoundItem(i: FoundItemInput) {
  if (!i?.id) throw new Error('storeFoundItem: id is required');
  if (!i?.ai_analysis) throw new Error('storeFoundItem: ai_analysis is required');

  const search_text = buildSearchText(i);
  const vector = await embed(search_text);

  // Build metadata WITHOUT nulls/empties
  const metadata: Record<string, any> = {
    type: 'found',
    search_text,
    ai_analysis: i.ai_analysis,
    timestamp: new Date().toISOString()
  };
  if (i.image_url) metadata.image_url = i.image_url;
  if (i.location)  metadata.location  = i.location;
  if (i.keywords?.length) metadata.keywords = i.keywords;
  else metadata.keywords = []; // arrays are fine to keep
  if (i.features?.length) metadata.features = i.features;
  else metadata.features = [];
  if (i.ocr) metadata.ocr = i.ocr;

  await index.upsert([
    {
      id: String(i.id),
      values: vector,
      metadata
    }
  ]);

  return { id: String(i.id), search_text };
}

/**
 * Semantic search across items. By default searches everything; you can pass `typeFilter`
 * to limit (e.g., "found" or "lost") if you later store both types.
 */
export async function semanticSearch(
  query: string,
  topK = 5,
  typeFilter?: 'found' | 'lost'
): Promise<SearchMatch[]> {
  const q = query?.trim();
  if (!q) return [];

  const vector = await embed(q);

  const res = await index.query({
    vector,
    topK,
    includeMetadata: true,
    ...(typeFilter ? { filter: { type: typeFilter } } : {})
  });

  const matches = res.matches ?? [];
  return matches.map(m => {
    const md = (m.metadata || {}) as Record<string, any>;
    return {
      id: m.id,
      score: m.score ?? 0,
      text: md.search_text,
      location: md.location,
      image_url: md.image_url,
      type: md.type,
      raw: md
    };
  });
}

/** ---------- Optional helpers ---------- */
export async function deleteVector(id: string) {
  await index.deleteOne(String(id));
  return { ok: true, id: String(id) };
}

/**
 * Re-embed and replace vector + metadata. Caller must pass a full `search_text`
 * whenever meaning-critical fields change.
 */
export async function updateVectorMetadata(id: string, partial: Record<string, any>) {
  if (!partial?.search_text) {
    throw new Error('updateVectorMetadata requires `search_text` to re-embed');
  }
  const vector = await embed(String(partial.search_text));

  // Remove nulls from partial just in case
  const cleanPartial: Record<string, any> = {};
  for (const [k, v] of Object.entries(partial)) {
    if (v !== null && v !== undefined) cleanPartial[k] = v;
  }

  await index.upsert([
    { id: String(id), values: vector, metadata: cleanPartial }
  ]);

  return { ok: true, id: String(id) };
}