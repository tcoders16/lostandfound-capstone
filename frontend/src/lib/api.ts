// src/lib/api.ts
// ==========================================================
// Minimal API client for the unified upload → analyse endpoints
// - POST /api/items/upload/analyse   (multipart: File)
// - POST /api/items/analyse          (JSON: imageBase64 + meta)
// - POST /api/admin/login
// - GET  /healthz
// Returns (analyse): { ok, file?, analysis | attributes }
// ==========================================================

/** Base URL for backend API (strip trailing slash). */
const API_BASE =
  import.meta.env.VITE_BACKEND_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:4000";

/** Build absolute URL from relative path. */
function toURL(path: string) {
  return /^https?:\/\//i.test(path) ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

/* ==========================================================
   Types
   ========================================================== */

export type AnalyseAttributes = {
  category?: string;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  material?: string | null;
  shape?: string | null;
  size?: "small" | "medium" | "large" | string;
  condition?: "new" | "used" | "worn" | "damaged" | string;
  text?: string | null;
  serialNumber?: string | null;
  labels?: string[];
  keywords?: string[];
  distinctiveFeatures?: string[];
  summary?: string;
  confidence?: number;
  [k: string]: any;
};

export type AnalyseResponse = {
  ok: true;
  file?: { filename: string; path: string; url?: string }; // present for multipart; optional for JSON
  analysis?: AnalyseAttributes | Record<string, any>;       // multipart endpoint shape
  attributes?: AnalyseAttributes | Record<string, any>;     // JSON endpoint shape
  itemId?: string;
};

export type AnalyseJsonPayload = {
  itemId: string;
  imageBase64: string; // data URL or raw base64; backend strips prefix if present
  description?: string;
  locationName?: string;
  detail?: "low" | "high" | "auto";
  prompt?: string;
};
/* ==========================================================
   Store analysed item to MongoDB
   ========================================================== */
export type StoreItemPayload = {
  itemId: string;                        // unique ID for the item
  filename?: string;                     // e.g. "2025-10-10-black-backpack.jpg"
  url?: string;                          // optional URL for image
  locationName?: string;                 // e.g. "Oakville GO"
  description?: string;                  // user-provided text
  attributes: Record<string, any>;       // AI analysis result JSON
};



/**
 * Save an analysed item to MongoDB (called after Confirm).
 * Backend route: POST /api/items/store
 */
export async function storeAnalysedItem(payload: StoreItemPayload) {
  const res = await fetch(toURL("/api/items/store"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status} ${res.statusText}`);
  }

  return await res.json(); // expect { ok: true, itemId, savedAt }
}

/* ==========================================================
   Upload + Analyse (multipart)
   ========================================================== */
/** Upload a File and analyse it in one request (multipart/form-data). */
export async function uploadAndAnalyseFile(file: File): Promise<AnalyseResponse> {
  const form = new FormData();
  form.append("image", file); // server accepts any field; "image" is conventional

  const res = await fetch(toURL("/api/items/upload/analyse"), {
    method: "POST",
    body: form, // do NOT set Content-Type; browser sets boundary
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as AnalyseResponse;
}

/* ==========================================================
   Analyse (JSON base64 + metadata)
   ========================================================== */
/** Send JSON with base64 image + meta; backend saves/analyses and returns attributes. */
export async function analyseViaJson(body: AnalyseJsonPayload): Promise<AnalyseResponse> {
  const res = await fetch(toURL("/api/items/analyse"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as AnalyseResponse;
}

/** Convenience: same as analyseViaJson but accepts just base64. */
export async function uploadAndAnalyseBase64(imageBase64: string): Promise<AnalyseResponse> {
  return analyseViaJson({
    itemId: `item-${Date.now()}`,
    imageBase64,
    detail: "high",
  });
}

/* ==========================================================
   Fetch all saved items (from MongoDB or memory)
   ========================================================== */

/**
 * Fetch all analysed/saved lost items.
 * Backend: GET /api/items
 * Returns: { ok, count, items: [...] }
 */
export async function getAllItems() {
  const res = await fetch(toURL("/api/items"), {
    method: "GET",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status} ${res.statusText}`);
  }

  return await res.json();
}
/* ==========================================================
   Admin login
   ========================================================== */
export async function loginAdmin(
  email: string,
  password: string
): Promise<{ token: string }> {
  const res = await fetch(toURL("/api/admin/login"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as { token: string };
}

/* ==========================================================
   Health ping
   ========================================================== */
export function ping() {
  return fetch(toURL("/healthz"))
    .then((r) => (r.ok ? r.json() : undefined))
    .catch(() => undefined);
}
/* ==========================================================
   Search (Pinecone semantic search)
   ========================================================== */

export type SearchResult = {
  id: string;
  score: number;
  metadata: {
    filename?: string;
    description?: string;
    locationName?: string;
    category?: string;
    color?: string;
    brand?: string;
    summary?: string;
    [k: string]: any;
  };
};

export async function searchItems(query: string): Promise<SearchResult[]> {
  const res = await fetch(toURL("/api/search"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.results ?? []) as SearchResult[];
}

/* ==========================================================
   Fetch single item by ID
   ========================================================== */
export async function getItemById(id: string) {
  const res = await fetch(toURL(`/api/items/${encodeURIComponent(id)}`));
  if (!res.ok) throw new Error(`Item not found (${res.status})`);
  return (await res.json()) as { ok: true; item: any };
}

/* ==========================================================
   Submit lost item report (claim)
   ========================================================== */
export type ClaimPayload = {
  description: string;
  locationName?: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
};

export type ClaimResponse = {
  ok: true;
  claimId: string;
  matchesFound?: number;
  matches?: Array<{ matchId: string; itemId: string; score: number }>;
  message?: string;
};

export async function submitLostItemReport(payload: ClaimPayload): Promise<{ ok: true; claimId: string; sessionId: string; initialScore: number; hasMatch: boolean; matchesFound: number; message: string }> {
  const res = await fetch(toURL("/api/claims"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return await res.json();
}

/* ==========================================================
   Clarifying Q&A — store chat follow-ups against a claim
   ========================================================== */
export async function saveClarifyingQA(input: {
  claimId: string;
  question: string;
  answer?: string;
  matchId?: string;
  itemId?: string;
  source?: "auto" | "manual";
}) {
  const res = await fetch(toURL(`/api/claims/${encodeURIComponent(input.claimId)}/questions`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ==========================================================
   Chat / AI verification session endpoints
   ========================================================== */

export type ChatSessionState = {
  sessionId: string;
  claimId: string;
  foundItemId: string | null;
  initialScore: number;
  currentScore: number;
  status: "searching" | "chatting" | "completed" | "no_match" | "conflict";
  conflictGroup: string | null;
  messages: Array<{ role: "assistant" | "user"; content: string; questionType: string; timestamp: string }>;
  enrichedDescription: string;
  questionsAsked: number;
  maxQuestions: number;
};

/** GET /api/chat/sessions/:sessionId — poll full session state */
export async function getChatSession(sessionId: string): Promise<{ ok: true; session: ChatSessionState }> {
  const res = await fetch(toURL(`/api/chat/sessions/${encodeURIComponent(sessionId)}`));
  if (!res.ok) throw new Error(`Session error ${res.status}`);
  return res.json();
}

/** POST /api/chat/sessions/:sessionId/next — get next AI question */
export async function chatGetNextQuestion(sessionId: string): Promise<{
  ok: boolean; question?: string; questionType?: string; done: boolean; status?: string;
}> {
  const res = await fetch(toURL(`/api/chat/sessions/${encodeURIComponent(sessionId)}/next`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Chat error ${res.status}`);
  return res.json();
}

/** POST /api/chat/sessions/:sessionId/answer — submit rider's answer */
export async function chatSubmitAnswer(sessionId: string, answer: string): Promise<{
  ok: boolean;
  currentScore: number;
  matchFound: boolean;
  conflictDetected: boolean;
  status: string;
  questionsAsked: number;
  maxQuestions: number;
}> {
  const res = await fetch(toURL(`/api/chat/sessions/${encodeURIComponent(sessionId)}/answer`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answer }),
  });
  if (!res.ok) throw new Error(`Answer error ${res.status}`);
  return res.json();
}

/* ==========================================================
   Admin — manual queue
   ========================================================== */

export type ManualQueueItem = {
  _id: string;
  claimId: string;
  name: string;
  phone: string;
  email?: string;
  description: string;
  locationName?: string;
  createdAt: string;
  session?: ChatSessionState | null;
};

/** GET /api/chat/manual — admin: list no-match claims */
export async function getManualQueue(): Promise<{ ok: true; count: number; claims: ManualQueueItem[] }> {
  const res = await fetch(toURL("/api/chat/manual"));
  if (!res.ok) throw new Error(`Manual queue error ${res.status}`);
  return res.json();
}

/** POST /api/chat/manual/link — admin manually links a claim to a found item */
export async function manuallyLinkClaim(payload: {
  claimId: string;
  foundItemId: string;
  notes?: string;
}): Promise<{ ok: boolean; matchId: string; isConflict: boolean }> {
  const res = await fetch(toURL("/api/chat/manual/link"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Link error ${res.status}`);
  return res.json();
}

/** GET /api/claims/matches — admin: list pending matches (includes conflict flag) */
export async function getPendingMatches(): Promise<{ ok: true; count: number; matches: any[] }> {
  const res = await fetch(toURL("/api/claims/matches"));
  if (!res.ok) throw new Error(`Matches error ${res.status}`);
  return res.json();
}

/** POST /api/claims/matches/:matchId/approve */
export async function approveMatch(matchId: string, notes?: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(toURL(`/api/claims/matches/${encodeURIComponent(matchId)}/approve`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error(`Approve error ${res.status}`);
  return res.json();
}

/** POST /api/claims/matches/:matchId/reject */
export async function rejectMatch(matchId: string, notes?: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(toURL(`/api/claims/matches/${encodeURIComponent(matchId)}/reject`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error(`Reject error ${res.status}`);
  return res.json();
}
