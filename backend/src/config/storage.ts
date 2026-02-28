// Central place for upload folder paths + mkdir
import path from "node:path";
import fs from "node:fs";

export const UPLOAD_DIR = path.resolve(process.cwd(), "upload"); 
// ^ process.cwd() when you run `npm start` inside backend/ → backend/upload

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}