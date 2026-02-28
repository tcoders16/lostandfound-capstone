/**
 * reindexAll.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches every item from MongoDB and re-upserts it to Pinecone with
 * metadata.type = "found_item" so the type filter works correctly.
 *
 * Run once after the type-tagging fix was deployed:
 *   npx tsx src/test/reindexAll.ts
 */

import dotenv from "dotenv";
import path   from "node:path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { connectMongo } from "../db/mongo";
import { ItemModel }    from "../models/Items";
import { PineconeService } from "../services/pinecone/pineconeService";

const G = (s: string) => `\x1b[32m${s}\x1b[0m`;
const R = (s: string) => `\x1b[31m${s}\x1b[0m`;
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`;
const W = (s: string) => `\x1b[1m${s}\x1b[0m`;

async function reindexAll() {
  console.log("\n" + W("═══════════════════════════════════════════════════════"));
  console.log(W("  Re-index: stamp type=found_item on all Pinecone vectors"));
  console.log(W("═══════════════════════════════════════════════════════") + "\n");

  // ── Connect to MongoDB Atlas ──────────────────────────────────────────────
  console.log("  Connecting to MongoDB Atlas…");
  await connectMongo();
  console.log(G("  ✓ MongoDB connected\n"));

  // ── Fetch all items ───────────────────────────────────────────────────────
  const items = await ItemModel.find({}).lean().exec();
  console.log(`  Found ${W(String(items.length))} item(s) in MongoDB\n`);

  if (items.length === 0) {
    console.log(Y("  No items to re-index. Upload some found items first via the admin portal.\n"));
    process.exit(0);
  }

  let success = 0;
  let failure = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const n    = `[${String(i + 1).padStart(2, "0")}/${items.length}]`;

    // Build description: prefer stored description, fall back to attributes.summary
    const description =
      (item as any).description?.trim() ||
      (item as any).attributes?.summary?.trim() ||
      "";

    process.stdout.write(`  ${n} ${(item as any).itemId} — `);

    try {
      await PineconeService.embedAndUpsertItem({
        itemId:      (item as any).itemId,
        description,
        locationName:(item as any).locationName,
        attributes:  (item as any).attributes ?? {},
      });
      console.log(G("done"));
      success++;
    } catch (err: any) {
      console.log(R(`FAILED — ${err?.message}`));
      failure++;
    }

    // Small throttle to avoid OpenAI rate limits
    if (i < items.length - 1) await new Promise(r => setTimeout(r, 350));
  }

  console.log("\n" + W("═══════════════════════════════════════════════════════"));
  console.log(`  ${G(success + " re-indexed")}  ${failure > 0 ? R(failure + " failed") : "0 failed"}`);

  if (failure === 0) {
    console.log(`\n${G("  ✓ All items now tagged type=found_item in Pinecone.")}`);
    console.log(`${G("  ✓ Vector search type filter will now return correct results.")}\n`);
  } else {
    console.log(`\n${R("  ✗ Some items failed to re-index.")} Check error details above.\n`);
  }

  console.log(W("═══════════════════════════════════════════════════════") + "\n");
  process.exit(failure > 0 ? 1 : 0);
}

reindexAll().catch(err => {
  console.error(R("\nFatal:"), err);
  process.exit(1);
});
