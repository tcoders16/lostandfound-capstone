// src/lib/tokenGenerator.ts
// ── GO Transit Lost & Found — Collection Token Generator ──────────────────
//
// Format:  GOT-YYYYMMDD-XXXXXXXX-CC
// Example: GOT-20260228-A3F8C291-73
//
// Parts:
//   GOT        — prefix (GO Transit)
//   YYYYMMDD   — approval date (8 digits)
//   XXXXXXXX   — 8-char uppercase hex from SHA-256(claimId + matchId + ms timestamp)
//   CC         — 2-digit Luhn-style checksum (sum of all character codes % 97)
//
// Properties:
//   • Unique: SHA-256 of {claimId, matchId, timestamp} — collision probability negligible
//   • Verifiable: checksum is deterministic from the first three parts
//   • Human-readable: uppercase hex, no ambiguous chars
//   • Date-stamped: YYYYMMDD lets staff confirm token was issued on a specific day
//   • No sensitive data exposed: claimId/matchId are not reversible from the hash

import { createHash } from "node:crypto";

/** Generate a collection token. Call at the moment of admin approval. */
export function generateCollectionToken(claimId: string, matchId: string): string {
  const now      = new Date();
  const year     = now.getFullYear();
  const month    = String(now.getMonth() + 1).padStart(2, "0");
  const day      = String(now.getDate()).padStart(2, "0");
  const datePart = `${year}${month}${day}`;

  // Entropy: claimId + matchId + high-res timestamp
  const entropy  = `${claimId}::${matchId}::${now.getTime()}::${Math.random()}`;
  const hashHex  = createHash("sha256").update(entropy).digest("hex");
  const hashPart = hashHex.substring(0, 8).toUpperCase();

  // Luhn-style checksum: sum of ASCII codes of all token chars so far, mod 97
  const body          = `GOT${datePart}${hashPart}`;
  const checksumValue = [...body].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 97;
  const checksumPart  = String(checksumValue).padStart(2, "0");

  return `GOT-${datePart}-${hashPart}-${checksumPart}`;
}

/** Verify a collection token's checksum (does not re-validate the hash part). */
export function verifyTokenChecksum(token: string): boolean {
  // Expected format: GOT-YYYYMMDD-XXXXXXXX-CC
  const parts = token.split("-");
  if (parts.length !== 4) return false;
  const [prefix, datePart, hashPart, checksumStr] = parts;
  if (prefix !== "GOT") return false;
  if (!/^\d{8}$/.test(datePart)) return false;
  if (!/^[0-9A-F]{8}$/.test(hashPart)) return false;

  const body          = `GOT${datePart}${hashPart}`;
  const expected      = [...body].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 97;
  const expectedStr   = String(expected).padStart(2, "0");
  return checksumStr === expectedStr;
}
