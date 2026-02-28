// src/middleware/saveImage.middleware.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  ensureUploadDir,
  saveFromBase64,
  saveFromMultipart,
} from "../services/storage/localStorageService";

type SavedFile = { filename: string; fullpath: string; url?: string };

declare module "fastify" {
  interface FastifyRequest {
    savedFile?: SavedFile;
  }
}

export async function saveImagePreHandler(req: FastifyRequest, reply: FastifyReply) {
  await ensureUploadDir();

  const ct = String(req.headers["content-type"] || "");
  const isMultipart = /multipart\/form-data/i.test(ct);

  if (isMultipart) {
    const saved = await saveFromMultipart(req);
    if (!saved) {
      return reply.code(400).send({ ok: false, error: "No image file found (field: image)" });
    }
    req.savedFile = saved;
    return;
  }

  const { imageBase64 } = (req.body || {}) as { imageBase64?: string };
  if (!imageBase64) {
    return reply
      .code(400)
      .send({ ok: false, error: "Provide multipart field 'image' or JSON { imageBase64 }" });
  }

  req.savedFile = await saveFromBase64(imageBase64);
} 