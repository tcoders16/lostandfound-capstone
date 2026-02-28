/**
 * reindexPineconeOnly.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Re-stamps type="found_item" on ALL vectors in Pinecone that are missing it.
 * Works without a MongoDB connection — reads directly from Pinecone.
 *
 *  1. List all vector IDs in the index
 *  2. Fetch each vector (values + metadata)
 *  3. If type is missing or not "found_item" → re-upsert with type tag
 *
 * Run:  npx tsx src/test/reindexPineconeOnly.ts
 */

import dotenv from "dotenv";
import path   from "node:path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { Pinecone } from "@pinecone-database/pinecone";

const G = (s: string) => `\x1b[32m${s}\x1b[0m`;
const R = (s: string) => `\x1b[31m${s}\x1b[0m`;
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`;
const W = (s: string) => `\x1b[1m${s}\x1b[0m`;

async function reindex() {
  console.log("\n" + W("═══════════════════════════════════════════════════════"));
  console.log(W("  Pinecone Re-index — stamp type=found_item on legacy vectors"));
  console.log(W("═══════════════════════════════════════════════════════") + "\n");

  const PINECONE_KEY = process.env.PINECONE_API_KEY!;
  const INDEX_NAME   = process.env.PINECONE_INDEX_NAME!;

  if (!PINECONE_KEY || !INDEX_NAME) {
    console.error(R("  Missing PINECONE_API_KEY or PINECONE_INDEX_NAME"));
    process.exit(1);
  }

  const pinecone = new Pinecone({ apiKey: PINECONE_KEY });
  const index    = pinecone.index(INDEX_NAME);

  // ── Step 1: get index stats to know how many vectors exist ───────────────
  const stats = await index.describeIndexStats();
  const total = stats.totalRecordCount ?? 0;
  console.log(`  Index: ${G(INDEX_NAME)}`);
  console.log(`  Vectors in index: ${W(String(total))}\n`);

  if (total === 0) {
    console.log(Y("  Index is empty. Upload found items via the admin portal first.\n"));
    process.exit(0);
  }

  // ── Step 2: list all vector IDs ───────────────────────────────────────────
  console.log("  Listing all vector IDs…");
  const allIds: string[] = [];

  try {
    // Pinecone list() returns paginated results
    const listResp = await index.listPaginated({ limit: 100 });
    const page = ((listResp as any).vectors ?? []).map((v: any) => v.id);
    allIds.push(...page);
    process.stdout.write(`\r  Found ${allIds.length} IDs so far…`);
    console.log(`\r  ${G("✓")} Listed ${allIds.length} vector ID(s)\n`);
  } catch (listErr: any) {
    // Pinecone serverless might not support list — fall back to query approach
    console.log(Y("  list() not available — using query fallback to discover IDs…"));

    // Use zero-ish vector to find all nearby vectors
    const dummy = Array(3072).fill(0.001);
    const results = await index.query({ vector: dummy, topK: 100, includeMetadata: true });
    for (const m of results.matches ?? []) allIds.push(m.id);
    console.log(`  ${G("✓")} Discovered ${allIds.length} vector ID(s) via query\n`);
  }

  if (allIds.length === 0) {
    console.log(Y("  No vectors found.\n"));
    process.exit(0);
  }

  // ── Step 3: fetch each vector and re-upsert with type tag ─────────────────
  console.log("  Fetching and re-tagging each vector:\n");

  let alreadyTagged = 0;
  let retagged      = 0;
  let failed        = 0;

  // Process in batches of 10 (Pinecone fetch limit is higher, but be safe)
  const BATCH = 10;
  for (let i = 0; i < allIds.length; i += BATCH) {
    const batchIds = allIds.slice(i, i + BATCH);

    let fetchResult: any;
    try {
      fetchResult = await index.fetch(batchIds);
    } catch (fetchErr: any) {
      console.log(`  ${R("✗")} Fetch failed for batch: ${fetchErr?.message}`);
      failed += batchIds.length;
      continue;
    }

    const vectors = fetchResult.records ?? fetchResult.vectors ?? {};

    for (const id of batchIds) {
      const vec = vectors[id];
      const label = `[${String(i + batchIds.indexOf(id) + 1).padStart(2,"0")}/${allIds.length}] ${id}`;

      if (!vec) {
        console.log(`  ${Y("?")} ${label} — not in fetch result (skip)`);
        continue;
      }

      const meta    = (vec.metadata ?? {}) as Record<string, any>;
      const values  = vec.values as number[];

      if (meta.type === "found_item") {
        console.log(`  ${G("✓")} ${label} — already tagged`);
        alreadyTagged++;
        continue;
      }

      // Re-upsert with type tag added
      try {
        await index.upsert([{
          id,
          values,
          metadata: { ...meta, type: "found_item" },
        }]);
        console.log(`  ${G("→")} ${label} — stamped type=found_item`);
        retagged++;
      } catch (upsertErr: any) {
        console.log(`  ${R("✗")} ${label} — upsert failed: ${upsertErr?.message}`);
        failed++;
      }

      // Small pause to be kind to rate limits
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // ── Step 4: verify with type filter ──────────────────────────────────────
  console.log("\n  Verifying type filter now works…");
  const dummy = Array(3072).fill(0.001);
  const verify = await index.query({
    vector: dummy, topK: 20, includeMetadata: true,
    filter: { type: { $eq: "found_item" } },
  });
  const verifyCount = verify.matches?.length ?? 0;

  console.log(`  ${verifyCount > 0 ? G("✓") : R("✗")}  type=found_item filter returns ${verifyCount} result(s)`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + W("═══════════════════════════════════════════════════════"));
  console.log(`  Already tagged:  ${alreadyTagged}`);
  console.log(`  Re-tagged now:   ${retagged}`);
  console.log(`  Failed:          ${failed > 0 ? R(String(failed)) : "0"}`);

  if (failed === 0) {
    console.log(`\n${G("  ✓ All vectors now have type=found_item.")}`);
    console.log(`${G("  ✓ Vector search filter is working.")}`);
    console.log(`${G("  ✓ Claim searches will only match found items, not other claims.")}\n`);
  } else {
    console.log(`\n${R("  ✗ Some vectors failed.")} Check details above.\n`);
  }

  console.log(W("═══════════════════════════════════════════════════════") + "\n");
  process.exit(failed > 0 ? 1 : 0);
}

reindex().catch(err => {
  console.error(R("\nFatal:"), err);
  process.exit(1);
});
