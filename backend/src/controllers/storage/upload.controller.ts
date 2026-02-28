// src/controllers/storage/upload.controller.ts
import { FastifyReply, FastifyRequest } from "fastify";
import { storageService } from "../../services/storage/localStorageService";

async function uploadSingle(req: FastifyRequest, reply: FastifyReply) {
  await storageService.ensureUploadDir();

  // saveFromMultipart reads the file stream from req (any field name)
  const saved = await storageService.saveFromMultipart(req);
  if (!saved) {
    return reply.code(400).send({ ok: false, error: "No file uploaded" });
  }

  return reply.send({ ok: true, data: saved }); // { filename, fullpath, url }
}

export const uploadController = { uploadSingle };