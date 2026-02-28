/**
 * pipelineTest.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * End-to-end test of the full vector pipeline:
 *
 *  1. ENV check          — all required keys are present
 *  2. OpenAI ping        — embeddings API responds
 *  3. Pinecone connect   — index describe_index_stats works
 *  4. Upsert found item  — embed rich text → upsert with type="found_item"
 *  5. Query search       — embed a lost-item description → cosine search
 *  6. Match check        — verify the upserted item appears in results
 *  7. Cleanup            — delete test vector from index
 *
 * Run:  npx tsx src/test/pipelineTest.ts
 */

import dotenv from "dotenv";
import path from "node:path";

// Load from backend root (.env) not src/
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

// ── ANSI colour helpers ───────────────────────────────────────────────────────
const G  = (s: string) => `\x1b[32m${s}\x1b[0m`; // green
const R  = (s: string) => `\x1b[31m${s}\x1b[0m`; // red
const Y  = (s: string) => `\x1b[33m${s}\x1b[0m`; // yellow
const B  = (s: string) => `\x1b[36m${s}\x1b[0m`; // cyan
const W  = (s: string) => `\x1b[1m${s}\x1b[0m`;  // bold

const PASS  = G("  PASS");
const FAIL  = R("  FAIL");
const INFO  = B("  INFO");
const WARN  = Y("  WARN");

const TEST_ITEM_ID = `pipeline-test-${Date.now()}`;

/* ── helper: mask key for display ─────────────────────────────────────────── */
function mask(key: string | undefined): string {
  if (!key) return R("(missing)");
  return G(key.slice(0, 12) + "…" + key.slice(-4));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
async function main() {
  console.log("\n" + W("═══════════════════════════════════════════════════════"));
  console.log(W("  GO Transit Lost & Found — Vector Pipeline Diagnostics"));
  console.log(W("═══════════════════════════════════════════════════════") + "\n");

  let passed = 0;
  let failed = 0;

  /* ── 1. ENV CHECK ────────────────────────────────────────────────────────── */
  console.log(W("[ 1 ] Environment Variables"));

  const OPENAI_KEY   = process.env.OPENAI_API_KEY;
  const PINECONE_KEY = process.env.PINECONE_API_KEY;
  const INDEX_NAME   = process.env.PINECONE_INDEX_NAME;
  const MONGO_URI    = process.env.MONGODB_URI;

  const envRows = [
    ["OPENAI_API_KEY",        OPENAI_KEY],
    ["PINECONE_API_KEY",      PINECONE_KEY],
    ["PINECONE_INDEX_NAME",   INDEX_NAME],
    ["MONGODB_URI",           MONGO_URI],
  ];

  for (const row of envRows) {
    const [k, v] = row;
    const ok = !!v && (v as string).trim().length > 0;
    console.log(`  ${ok ? G("✓") : R("✗")} ${(k as string).padEnd(24)} ${mask(v as string | undefined)}`);
    if (!ok) failed++;
    else passed++;
  }

  if (!OPENAI_KEY || !PINECONE_KEY || !INDEX_NAME) {
    console.log(`\n${FAIL} Cannot continue — missing required keys.\n`);
    process.exit(1);
  }

  /* ── 2. OPENAI EMBEDDING ─────────────────────────────────────────────────── */
  console.log(`\n${W("[ 2 ] OpenAI Embeddings (text-embedding-3-large)")}`);
  const openai = new OpenAI({ apiKey: OPENAI_KEY });

  let queryVector: number[] | null = null;
  let foundItemVector: number[] | null = null;

  try {
    // Simulate a FOUND ITEM description (what admin would enter)
    const foundItemText = [
      "Black Sony WH-1000XM4 wireless headphones",
      "Found at Oakville GO",
      "Category: electronics",
      "Brand: Sony",
      "Model: WH-1000XM4",
      "Color: black",
      "Condition: used",
      "Keywords: headphones, wireless, noise-cancelling, Sony",
      "Distinctive features: scratch on right ear cup, red cable attached",
    ].join(". ");

    const foundResp = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: foundItemText,
    });
    foundItemVector = foundResp.data[0].embedding;
    console.log(`${PASS}  Found-item embedding — ${foundItemVector.length} dims`);

    // Simulate a LOST ITEM QUERY (what rider would describe)
    const lostItemQuery = "[electronics] Black Sony headphones with scratch, lost at Oakville GO on Feb 14";

    const queryResp = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: lostItemQuery,
    });
    queryVector = queryResp.data[0].embedding;
    console.log(`${PASS}  Query embedding      — ${queryVector.length} dims`);
    passed += 2;
  } catch (err: any) {
    console.log(`${FAIL}  OpenAI error: ${err?.message}`);
    failed++;
    process.exit(1);
  }

  /* ── 3. PINECONE CONNECT + INDEX STATS ───────────────────────────────────── */
  console.log(`\n${W("[ 3 ] Pinecone Connection")}`);
  const pinecone = new Pinecone({ apiKey: PINECONE_KEY });
  const index = pinecone.index(INDEX_NAME);

  let indexDim = 0;
  try {
    const stats = await index.describeIndexStats();
    indexDim = stats.dimension ?? 0;
    const totalVectors = stats.totalRecordCount ?? 0;
    const namespaces   = Object.keys(stats.namespaces ?? {}).join(", ") || "(default)";

    console.log(`${PASS}  Connected to index: ${G(INDEX_NAME)}`);
    console.log(`${INFO}  Dimension:          ${indexDim}`);
    console.log(`${INFO}  Total vectors:      ${totalVectors}`);
    console.log(`${INFO}  Namespaces:         ${namespaces}`);

    if (indexDim !== 3072) {
      console.log(`${WARN}  Expected dimension 3072 (text-embedding-3-large) — got ${indexDim}.`);
      console.log(`${WARN}  Create a NEW index with dimension=3072 and update PINECONE_INDEX_NAME.`);
      failed++;
    } else {
      console.log(`${PASS}  Dimension matches text-embedding-3-large (3072)`);
      passed++;
    }
    passed++;
  } catch (err: any) {
    console.log(`${FAIL}  Pinecone connect error: ${err?.message}`);
    failed++;
    process.exit(1);
  }

  /* ── 4. UPSERT TEST FOUND ITEM ───────────────────────────────────────────── */
  console.log(`\n${W("[ 4 ] Upsert Found Item → Pinecone")}`);

  try {
    await index.upsert([{
      id: TEST_ITEM_ID,
      values: foundItemVector!,
      metadata: {
        type:        "found_item",
        description: "Black Sony WH-1000XM4 wireless headphones, scratch on right ear cup",
        locationName:"Oakville GO",
        category:    "electronics",
        brand:       "Sony",
        model:       "WH-1000XM4",
        color:       "black",
        summary:     "Black Sony noise-cancelling headphones with distinctive scratch",
      },
    }]);
    console.log(`${PASS}  Upserted test item: ${G(TEST_ITEM_ID)}`);
    console.log(`${INFO}  Metadata: type=found_item, brand=Sony, location=Oakville GO`);
    passed++;

    // Small wait for Pinecone to index
    console.log(`${INFO}  Waiting 3s for Pinecone to index the vector…`);
    await new Promise(r => setTimeout(r, 3000));
  } catch (err: any) {
    console.log(`${FAIL}  Upsert failed: ${err?.message}`);
    failed++;
  }

  /* ── 5. SEARCH WITH TYPE FILTER ──────────────────────────────────────────── */
  console.log(`\n${W("[ 5 ] Vector Search (type=found_item filter)")}`);

  let filteredResults: any[] = [];
  try {
    const filtered = await index.query({
      vector: queryVector!,
      topK: 5,
      includeMetadata: true,
      filter: { type: { $eq: "found_item" } },
    });

    filteredResults = filtered.matches ?? [];
    console.log(`${PASS}  Filter query returned ${filteredResults.length} result(s)`);

    for (const m of filteredResults) {
      const pct = Math.round((m.score ?? 0) * 100);
      const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
      const scoreColor = pct >= 80 ? G : pct >= 60 ? Y : R;
      console.log(`       ${scoreColor(bar)} ${scoreColor(pct + "%")}  ${m.id}`);
      if (m.metadata?.type) console.log(`               type=${m.metadata.type}  location=${m.metadata.locationName ?? "—"}`);
    }
    passed++;
  } catch (err: any) {
    console.log(`${FAIL}  Filtered search error: ${err?.message}`);
    failed++;
  }

  /* ── 6. SEARCH WITHOUT FILTER (verify fallback) ──────────────────────────── */
  console.log(`\n${W("[ 6 ] Vector Search (unfiltered — all vectors)")}`);

  try {
    const unfiltered = await index.query({
      vector: queryVector!,
      topK: 5,
      includeMetadata: true,
    });

    const unfilteredResults = unfiltered.matches ?? [];
    console.log(`${PASS}  Unfiltered query returned ${unfilteredResults.length} result(s)`);

    for (const m of unfilteredResults.slice(0, 3)) {
      const pct = Math.round((m.score ?? 0) * 100);
      const typeTag = (m.metadata?.type as string) ?? "no-type";
      const typeColor = typeTag === "found_item" ? G : typeTag === "claim" ? Y : R;
      console.log(`       ${pct}%  ${m.id}  [${typeColor(typeTag)}]`);
    }
    passed++;
  } catch (err: any) {
    console.log(`${FAIL}  Unfiltered search error: ${err?.message}`);
    failed++;
  }

  /* ── 7. MATCH VERIFICATION ───────────────────────────────────────────────── */
  console.log(`\n${W("[ 7 ] Match Verification (does test item appear?)")}`);

  const testItemInResults = filteredResults.find(m => m.id === TEST_ITEM_ID);
  if (testItemInResults) {
    const pct = Math.round((testItemInResults.score ?? 0) * 100);
    console.log(`${PASS}  Test item found in results with ${G(pct + "%")} similarity`);
    if (pct >= 80) {
      console.log(`${PASS}  Score ${pct}% ≥ 80% threshold → would trigger AI chat`);
    } else {
      console.log(`${WARN}  Score ${pct}% < 80% → would go to manual queue (description not specific enough or index not fresh yet)`);
    }
    passed++;
  } else {
    console.log(`${WARN}  Test item not found in top-5 results — likely the index needs a few seconds to catch up.`);
    console.log(`${INFO}  This is normal on first upsert. Re-run the test in 5 seconds.`);
    failed++;
  }

  /* ── 8. CLEANUP ──────────────────────────────────────────────────────────── */
  console.log(`\n${W("[ 8 ] Cleanup")}`);
  try {
    await index.deleteOne(TEST_ITEM_ID);
    console.log(`${PASS}  Deleted test vector: ${TEST_ITEM_ID}`);
    passed++;
  } catch (err: any) {
    console.log(`${WARN}  Cleanup failed (non-fatal): ${err?.message}`);
  }

  /* ── SUMMARY ─────────────────────────────────────────────────────────────── */
  console.log("\n" + W("═══════════════════════════════════════════════════════"));
  console.log(`  Results:  ${G(passed + " passed")}  ${failed > 0 ? R(failed + " failed") : "0 failed"}`);

  if (failed === 0) {
    console.log(`\n${G("  ✓ Pipeline is healthy.")} Pinecone + OpenAI are connected and working.`);
    console.log(`${G("  ✓ type=found_item filter is working.")} Claim vectors won't pollute search.`);
    console.log(`${G("  ✓ Vector search returns cosine similarity scores.")} 80%+ triggers AI chat.`);
  } else {
    console.log(`\n${R("  ✗ Some checks failed.")} See details above.`);
  }

  console.log(W("═══════════════════════════════════════════════════════") + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(R("\nUnhandled error:"), err);
  process.exit(1);
});
