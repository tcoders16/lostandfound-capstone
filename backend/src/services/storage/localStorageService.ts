import path from "node:path";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import type { FastifyRequest } from "fastify";

export const UPLOAD_DIR = path.join(process.cwd(), "upload");

/** Ensure upload folder exists */
export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/** Detect file extension */
function extFromMime(m?: string) {
  if (!m) return ".jpg";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("png")) return ".png";
  if (m.includes("webp")) return ".webp";
  if (m.includes("gif")) return ".gif";
  return ".jpg";
}

/** Turn description into safe filename text */
export function slugify(text: string, max = 50) {
  return (text || "")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max) || "item";
}

/** Today's date formatted as yyyy-mm-dd */
export function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Generate readable name: 2025-10-10-black-backpack.jpg */
export function buildReadableFilename(desc: string, ext: string) {
  const date = todayStamp();
  const name = slugify(desc);
  return `${date}-${name}${ext}`;
}

/** Save multipart file directly with readable filename */
export async function saveFromMultipart(req: FastifyRequest, desc = "item") {
  const file = await (req as any).file?.();
  if (!file) return null;

  const mimetype = file.mimetype as string;
  const ext = extFromMime(mimetype);
  const filename = buildReadableFilename(desc, ext);
  const fullpath = path.join(UPLOAD_DIR, filename);

  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(fullpath);
    file.file.pipe(ws);
    ws.on("finish", resolve);
    ws.on("error", reject);
  });

  return { filename, fullpath, url: `/uploads/${filename}` };
}

/** Save base64 image with readable name */
export async function saveFromBase64(imageBase64: string, desc = "item") {
  const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  const mime = match?.[1] || "image/jpeg";
  const b64 = match?.[2] || imageBase64;
  const ext = extFromMime(mime);
  const filename = buildReadableFilename(desc, ext);
  const fullpath = path.join(UPLOAD_DIR, filename);

  await fs.writeFile(fullpath, Buffer.from(b64, "base64"));
  return { filename, fullpath, url: `/uploads/${filename}` };
}

export const storageService = {
  ensureUploadDir,
  saveFromMultipart,
  saveFromBase64,
  todayStamp,
  slugify,
  buildReadableFilename,
};