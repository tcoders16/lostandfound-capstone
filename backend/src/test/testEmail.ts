// src/test/testEmail.ts
// ─────────────────────────────────────────────────────────────────────────────
// Quick smoke-test for the email pipeline.
// Run from backend/ directory:
//   npx tsx src/test/testEmail.ts your-real-email@gmail.com
//
// Sends a sample "match approved" email to the address you specify.
// Make sure SMTP_USER and SMTP_PASS are set in backend/.env first!
// ─────────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import { sendMatchApprovedEmail, sendMatchDeclinedEmail } from "../services/email/emailService";

const recipient = process.argv[2] || process.env.SMTP_USER || "";

if (!recipient || recipient.includes("your-email")) {
  console.error("❌  Usage: npx tsx src/test/testEmail.ts <recipient@example.com>");
  console.error("   Make sure SMTP_USER and SMTP_PASS are set in backend/.env first.");
  process.exit(1);
}

const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

if (!SMTP_USER || SMTP_USER === "your-email@gmail.com") {
  console.error("❌  SMTP_USER is not configured in backend/.env");
  console.error("   1. Open backend/.env");
  console.error("   2. Set SMTP_USER=your-real-gmail@gmail.com");
  console.error("   3. Set SMTP_PASS=your-16-char-app-password");
  console.error("   4. Get App Password: Google Account → Security → 2-Step Verification → App Passwords");
  process.exit(1);
}

if (!SMTP_PASS || SMTP_PASS === "your-app-password") {
  console.error("❌  SMTP_PASS is not configured in backend/.env");
  console.error("   Get App Password: Google Account → Security → 2-Step Verification → App Passwords");
  process.exit(1);
}

async function main() {
  console.log(`\n🔧  Testing email pipeline…`);
  console.log(`   SMTP host : smtp.gmail.com:587`);
  console.log(`   From      : ${SMTP_USER}`);
  console.log(`   To        : ${recipient}\n`);

  try {
    // Test 1: Match Approved email (with collection token)
    console.log("📧  Sending test "Match Approved" email…");
    await sendMatchApprovedEmail({
      riderName:        "Alex Johnson",
      riderEmail:       recipient,
      claimId:          "claim-TEST-12345678",
      foundDescription: "SanDisk 1TB Extreme Portable SSD — orange and navy case, USB-C",
      foundLocation:    "Union Station — Platform 7 lost item bin",
      matchScore:       0.91,
      adminNotes:       "This is a test email from the GO Transit Lost & Found system.",
      collectionToken:  "GOT-20260228-A3F8C291-73",
    });
    console.log("   ✅  Match Approved email sent!\n");

    // Test 2: Match Declined email
    console.log("📧  Sending test "Match Declined" email…");
    await sendMatchDeclinedEmail({
      riderName:  "Alex Johnson",
      riderEmail: recipient,
      claimId:    "claim-TEST-12345678",
    });
    console.log("   ✅  Match Declined email sent!\n");

    console.log("🎉  All emails sent successfully. Check your inbox!\n");
  } catch (err: any) {
    console.error("\n❌  Email send failed:", err.message);
    if (err.message?.includes("Invalid login") || err.message?.includes("535")) {
      console.error("\n   ⚠️  Gmail authentication failed. Make sure:");
      console.error("   • You are using an App Password (not your Gmail login password)");
      console.error("   • 2-Step Verification is enabled on your Google account");
      console.error("   • Get App Password: Google Account → Security → 2-Step Verification → App Passwords");
    }
    process.exit(1);
  }
}

main();
