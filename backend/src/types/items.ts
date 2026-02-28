// src/types/items.ts

/** ---- Core ID Aliases ---- */
export type ItemId = string;
export type MediaId = string;
export type AnalysisJobId = string;
export type EmbeddingId = string;

/** ---- Status Types ---- */
export type ItemStatus = "found" | "processing" | "processed" | "failed";
export type AnalysisStage =
  | "queued"
  | "fetching"
  | "vision"
  | "ocr"
  | "embedding"
  | "done"
  | "error";

/** ---- Item Record ---- */
export type Item = {
  id: ItemId;

  // Location metadata
  location: {
    name: string;
    lat?: number;
    lon?: number;
  };

  description?: string;         // free-form input from admin/user
  foundAt?: string;             // ISO date/time string
  status: ItemStatus;

  // Media assets (1+ images; later video/pdf)
  media: MediaId[];

  // Structured attributes from AI analysis
  attributes?: ItemAttributes;

  // Primary vector reference (for main search)
  vectorId?: EmbeddingId;

  createdAt: string;
  updatedAt: string;
};

/** ---- Richer Attribute Breakdown ---- */
// src/types/items.ts (you already have this)
export type ItemAttributes = {
  category?: "electronics" | "clothing" | "accessory" | "document" | "other";
  brand?: string;
  model?: string;
  color?: string;
  material?: string;
  shape?: string;
  size?: "small" | "medium" | "large";
  condition?: "new" | "used" | "worn" | "damaged";
  text?: string;
  serialNumber?: string;
  labels?: string[];
  summary?: string;
  keywords?: string[];
  distinctiveFeatures?: string[];
  confidence?: number;
};

/** ---- Media Asset ---- */
export type MediaAsset = {
  id: MediaId;
  fileId: ItemId;

  storagePath: string;            // gs://, s3://, or local
  publicUrl?: string;             // CDN or signed URL
  contentType: string;            // MIME type
  bytes?: number;

  createdAt: string;
};

/** ---- Analysis Jobs ---- */
export type AnalysisJob = {
  id: AnalysisJobId;
  fileId: ItemId;
  mediaId: MediaId;

  stage: AnalysisStage;
  attempts: number;
  error?: string;

  createdAt: string;
  updatedAt: string;
};

/** ---- Embedding Payload ---- */
export type EmbeddingPayload = {
  id: EmbeddingId;
  fileId: ItemId;
  mediaId: MediaId;

  // Which modality produced this embedding
  type: "description" | "ocr" | "vision" | "hybrid";

  text: string;                   // text fed into the embedding model
  vector: number[];               // actual embedding

  createdAt: string;
};