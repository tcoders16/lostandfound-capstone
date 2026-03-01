/**
 * seedTestData.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Populates MongoDB Atlas + Pinecone with realistic GO Transit "found items"
 * so the rider search pipeline has something to match against.
 *
 * Run from the backend/ directory:
 *   npx tsx src/test/seedTestData.ts
 * ──────────────────────────────────────────────────────────────────────────────
 */

import path from "path";
import dotenv from "dotenv";

// ── Load env FIRST (before any service imports) ──────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { connectMongo, disconnectMongo } from "../db/mongo";
import { saveAnalysedItemToMongo } from "../services/saveToDatabase/mongoDB/saveAnalysedItemService";

// ── Test items to seed ────────────────────────────────────────────────────────
const SEED_ITEMS = [
  // ── Electronics ─────────────────────────────────────────────────────────────
  {
    itemId: "item-sandisk-ssd-001",
    filename: "sandisk-1tb-ssd.jpg",
    url: "/uploads/sandisk-1tb-ssd.jpg",
    locationName: "Union Station – Platform 7",
    description:
      "SanDisk 1TB Extreme Portable SSD with orange and navy dark blue casing. Has a USB Type-C connector cable attached. Small black rubber bumper around the edge. Metal clip on the back.",
    attributes: {
      category: "electronics",
      brand: "SanDisk",
      model: "Extreme 1TB Portable SSD",
      color: "orange and navy blue",
      material: "metal and rubber",
      size: "palm-sized, roughly 111mm x 55mm",
      connector: "USB Type-C",
      features: "metal carabiner clip, rubber bumper corner guard",
      condition: "good, minor scratches on back",
      summary:
        "SanDisk 1TB Extreme Portable SSD — orange and navy blue body — USB-C cable attached — metal clip on back — found at Union Station Platform 7",
      foundDate: "2026-02-27",
      foundBy: "Platform Staff",
      itemType: "portable storage device",
    },
  },
  {
    itemId: "item-iphone15-002",
    filename: "iphone-15-black.jpg",
    url: "/uploads/iphone-15-black.jpg",
    locationName: "Bloor GO Station – Waiting Area",
    description:
      "Apple iPhone 15 in a black MagSafe leather case. Screen has a small crack in the bottom-left corner. Device is locked. Found on a bench in the waiting area.",
    attributes: {
      category: "electronics",
      brand: "Apple",
      model: "iPhone 15",
      color: "black",
      caseType: "black leather MagSafe case",
      damage: "small crack bottom-left corner of screen",
      condition: "fair",
      summary:
        "Apple iPhone 15 — black leather MagSafe case — cracked screen bottom-left — found at Bloor GO Station waiting area bench",
      foundDate: "2026-02-26",
      itemType: "smartphone",
    },
  },
  {
    itemId: "item-laptop-macbook-003",
    filename: "macbook-pro-silver.jpg",
    url: "/uploads/macbook-pro-silver.jpg",
    locationName: "Kitchener Line Train – Car 3 Overhead Rack",
    description:
      "Apple MacBook Pro 14-inch Silver. Has multiple stickers on the lid including a rainbow Apple sticker and a NASA logo sticker. Charger cable not included. Inside a grey neoprene sleeve.",
    attributes: {
      category: "electronics",
      brand: "Apple",
      model: "MacBook Pro 14-inch",
      color: "silver",
      distinctive: "rainbow Apple sticker, NASA logo sticker on lid",
      sleeve: "grey neoprene sleeve",
      condition: "good",
      summary:
        "Apple MacBook Pro 14-inch silver — stickers on lid (rainbow Apple, NASA) — grey neoprene sleeve — found on Kitchener Line train car 3 overhead rack",
      foundDate: "2026-02-25",
      itemType: "laptop computer",
    },
  },

  // ── Clothing ─────────────────────────────────────────────────────────────────
  {
    itemId: "item-jacket-north-004",
    filename: "north-face-jacket-black.jpg",
    url: "/uploads/north-face-jacket-black.jpg",
    locationName: "Mississauga GO Bus Terminal – Bay 12",
    description:
      "The North Face black puffer jacket, size Large. Has a distinctive bright yellow lining visible at the collar. Right sleeve has a small bleach stain near the cuff. Front zip pocket has a broken zipper pull replaced with a key ring.",
    attributes: {
      category: "clothing",
      brand: "The North Face",
      type: "puffer jacket",
      color: "black exterior, yellow lining",
      size: "Large",
      distinctive: "bleach stain right sleeve near cuff, broken zipper pull replaced with key ring",
      condition: "good",
      summary:
        "The North Face black puffer jacket Large — yellow lining — bleach stain right sleeve — broken zipper pull replaced with key ring — found Mississauga GO Bus Terminal Bay 12",
      foundDate: "2026-02-24",
      itemType: "outerwear jacket",
    },
  },

  // ── Accessory ────────────────────────────────────────────────────────────────
  {
    itemId: "item-wallet-brown-005",
    filename: "brown-leather-wallet.jpg",
    url: "/uploads/brown-leather-wallet.jpg",
    locationName: "Oakville GO Station – Platform B",
    description:
      "Brown leather bifold wallet with gold monogram initials 'J.K.' embossed on the front. Contains two credit cards (Visa and Mastercard visible), a Presto card, and some cash. Coach brand logo on interior. Worn edges.",
    attributes: {
      category: "accessory",
      type: "bifold wallet",
      brand: "Coach",
      color: "brown leather",
      monogram: "J.K. gold embossed on front",
      contents: "Visa card, Mastercard, Presto card, cash",
      condition: "used, worn edges",
      summary:
        "Coach brown leather bifold wallet — gold J.K. monogram — contains Visa, Mastercard, Presto, cash — found at Oakville GO Station Platform B",
      foundDate: "2026-02-25",
      itemType: "wallet",
    },
  },

  // ── Electronics (keys + fob) ─────────────────────────────────────────────────
  {
    itemId: "item-airpods-pro-006",
    filename: "airpods-pro-gen2.jpg",
    url: "/uploads/airpods-pro-gen2.jpg",
    locationName: "Barrie GO Train – Seat 22B",
    description:
      "Apple AirPods Pro 2nd generation in white MagSafe charging case. Case has a crack on the right hinge. A small green rubber keychain frog charm is attached to the carabiner loop of the case.",
    attributes: {
      category: "electronics",
      brand: "Apple",
      model: "AirPods Pro 2nd Generation",
      color: "white",
      caseDamage: "crack on right hinge of charging case",
      distinctive: "green rubber frog charm on carabiner loop",
      condition: "fair",
      summary:
        "Apple AirPods Pro 2nd Gen — white MagSafe case — crack on right hinge — green rubber frog keychain charm — found on Barrie GO Train seat 22B",
      foundDate: "2026-02-26",
      itemType: "wireless earbuds",
    },
  },

  // ── Document ─────────────────────────────────────────────────────────────────
  {
    itemId: "item-passport-blue-007",
    filename: "canadian-passport-holder.jpg",
    url: "/uploads/canadian-passport-holder.jpg",
    locationName: "Union Station – GO Concourse Near Starbucks",
    description:
      "Canadian passport in a navy blue leather passport holder with a maple leaf design. The holder also contains an Air Canada frequent flyer card and a SIN card. Found near the Starbucks in the GO Concourse.",
    attributes: {
      category: "document",
      documentType: "Canadian Passport",
      container: "navy blue leather passport holder, maple leaf design",
      otherItems: "Air Canada frequent flyer card, SIN card",
      condition: "good",
      summary:
        "Canadian passport in navy blue leather maple-leaf holder — also contains Air Canada loyalty card and SIN card — found at Union Station GO Concourse near Starbucks",
      foundDate: "2026-02-27",
      itemType: "identification document",
    },
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🌱  GO Transit Lost & Found — Seed Script");
  console.log("────────────────────────────────────────────");
  console.log(`   MONGO: ${process.env.MONGODB_URI?.slice(0, 40)}…`);
  console.log(`   PINECONE: ${process.env.PINECONE_INDEX_NAME}`);
  console.log(`   OPENAI_KEY: ${process.env.OPENAI_API_KEY?.slice(0, 14)}…`);
  console.log("");

  // Connect to MongoDB Atlas
  await connectMongo();
  console.log("✅  MongoDB connected\n");

  let success = 0;
  let failed  = 0;

  for (const item of SEED_ITEMS) {
    process.stdout.write(`  → Saving ${item.itemId} … `);
    try {
      const result = await saveAnalysedItemToMongo(item);
      if (result.ok) {
        console.log(`✅  saved`);
        success++;
      } else {
        console.log(`❌  failed: ${result.error}`);
        failed++;
      }
    } catch (err: any) {
      console.log(`❌  error: ${err.message}`);
      failed++;
    }
    // Small delay between OpenAI embedding calls to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n────────────────────────────────────────────`);
  console.log(`   ✅  Seeded:  ${success} items`);
  console.log(`   ❌  Failed:  ${failed} items`);
  console.log(`────────────────────────────────────────────\n`);

  await disconnectMongo();
  console.log("✅  Disconnected. Done!\n");
  process.exit(0);
}

main().catch(err => {
  console.error("\n[seed] Fatal error:", err);
  process.exit(1);
});
