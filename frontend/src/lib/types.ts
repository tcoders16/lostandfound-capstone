// src/lib/types.ts

/** ---------- Common / Utils ---------- */

export type ID<T extends string> = string & { __brand: T }; // branded ids

export type ISODate = string; // e.g., "2025-09-16T14:23:00Z"
export type UnixMS = number;  // e.g., Date.now()

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type ApiError = {
  code: string;         // e.g., "UNAUTHORIZED", "VALIDATION_ERROR"
  message: string;
  details?: unknown;
};

export type Paginated<T> = {
  items: T[];
  nextCursor?: string | null;
  total?: number;
};

/** ---------- Roles / Users / Auth ---------- */

export type Role = "admin" | "rider";

export type User = {
  id: ID<"user">;
  email: string;
  name?: string;
  role: Role;
  createdAt: ISODate;
};

export type Session = {
  token: string;        // JWT or opaque token
  userId: ID<"user">;
  role: Role;
  issuedAt: ISODate;
  expiresAt: ISODate;
};

export type LoginRequest = { email: string; password: string };
export type LoginResponse = { token: string; user: User };

export type AdminStat = { key: string; value: string; hint?: string };
export type AdminAction = { title: string; desc: string; cta: string; to: string };

export type ActivityKind = "upload" | "match" | "claim";
export type ActivityItem = {
  id: ID<"activity">;
  type: ActivityKind;
  title: string;      // "Black Logitech Mouse"
  meta: string;       // "Oakville GO • Today 14:30"
  createdAt?: ISODate;
};

/** ---------- Items / Uploads / Extraction ---------- */

export type Location = {
  id?: ID<"location">;
  name: string;        // "Oakville GO", "Union Station"
  lat?: number;
  lng?: number;
};

export type ExtractedAttributes = {
  // low-level attributes from vision/OCR pipelines
  brand?: string;        // "Logitech"
  model?: string;        // "M720"
  color?: string;        // "Black"
  textSnippets?: string[];  // OCR’d words/lines
  serialLike?: string;      // detected serial/model-like token
  logoDetected?: boolean;
  categories?: string[];    // "electronics", "peripheral"
  confidence?: number;      // 0..1
};

export type ItemStatus = "found" | "matched" | "claimed" | "returned" | "archived";

export type Item = {
  id: ID<"item">;
  title: string;              // human-friendly label
  description?: string;       // free-text
  category?: string;          // normalized category
  imageUrl?: string;
  thumbUrl?: string;
  location: Location;
  attributes?: ExtractedAttributes;
  foundAt: ISODate;           // when found
  createdAt: ISODate;         // record created
  updatedAt: ISODate;
  status: ItemStatus;
  ownerRequestCount?: number; // how many claim requests
};

export type UploadPayload = {
  // what the admin frontend sends to backend
  image: File | Blob;
  locationName: string;
  description?: string;
};

export type CreateItemRequest = {
  location: Location;
  description?: string;
  attributes?: ExtractedAttributes;
  imageUrl: string;           // after upload
  title?: string;
  category?: string;
  foundAt?: ISODate;
};

export type CreateItemResponse = {
  id: ID<"item">;
};

/** ---------- Search / Matching ---------- */

export type SearchQuery = {
  q: string;                  // "black logitech mouse oakville"
  locationIds?: ID<"location">[];
  status?: ItemStatus[];
  limit?: number;
  cursor?: string | null;
};

export type MatchResult = {
  itemId: ID<"item">;
  score: number;              // 0..1 similarity score
  highlights?: string[];      // matched tokens/snippets for UI
};

export type SearchResponse = Paginated<Item> & {
  matches?: MatchResult[];    // optional: parallel match list
};

/** ---------- Owner Requests (claims) ---------- */

export type ClaimStatus = "submitted" | "needs_review" | "approved" | "rejected" | "fulfilled";

export type ClaimRequest = {
  id: ID<"claim">;
  itemId: ID<"item">;
  userId?: ID<"user">;        // rider (optional if guest)
  contactEmail: string;
  message?: string;           // “this is my mouse…”
  evidenceUrls?: string[];    // receipts/photos if provided
  status: ClaimStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
};

/** ---------- API: admin dashboard ---------- */

export type AdminStatsResponse = {
  stats: AdminStat[];
};

export type RecentActivityResponse = {
  items: ActivityItem[];
};

/** ---------- Frontend store helpers (optional) ---------- */

export type AuthState = {
  token?: string;
  role?: Role;
  email?: string;
  lastActive: UnixMS;
};