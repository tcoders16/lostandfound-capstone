// src/controllers/lostItem/itemsController.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { analyzeImage } from "../../services/lostItem/openai/analyseImage";
import { saveAnalysedItemToMongo } from "../../services/saveToDatabase/mongoDB/saveAnalysedItemService";
import { itemsRepo } from "../../repositories/lostItem/itemsRepo";


const StoreSchema = z.object({
  itemId: z.string().min(1),
  filename: z.string().optional(),
  url: z.string().optional(),
  locationName: z.string().optional(),
  description: z.string().optional(),
  attributes: z.record(z.any()),
});

export async function uploadAndAnalyse(req: FastifyRequest, reply: FastifyReply) {
  try {
    const saved = req.savedFile;
    if (!saved) {
      return reply.code(400).send({ ok: false, error: "No image saved" });
    }

    const result = await analyzeImage({
      itemId: saved.filename,
      localPath: saved.fullpath,
      detail: "high",
    });

    return reply.send({
      ok: true,
      file: {
        filename: saved.filename,
        path: saved.fullpath,
        url: saved.url ?? `/upload/${saved.filename}`,
      },
      analysis: result?.attributes ?? result ?? {},
    });
  } catch (err: any) {
    req.log.error({ err }, "uploadAndAnalyse failed");
    const raw = err?.message || String(err);
    const message =
      process.env.NODE_ENV === "production" && raw.length > 100
        ? "Upload/analysis failed"
        : raw || "Upload/analysis failed";
    return reply.code(500).send({ ok: false, error: message });
  }
}

export async function storeAnalysedItem(
  req: FastifyRequest<{ Body: z.infer<typeof StoreSchema> }>,
  reply: FastifyReply
) {
  try {
    const body = StoreSchema.parse(req.body);
    const res = await saveAnalysedItemToMongo({
      itemId: body.itemId,
      filename: body.filename ?? body.itemId,
      url: body.url,
      locationName: body.locationName,
      description: body.description,
      attributes: body.attributes,
    });
    if (!res.ok) return reply.code(500).send(res);
    return reply.send({ ok: true, itemId: body.itemId });
  } catch (err: any) {
    const status = err?.name === "ZodError" ? 400 : 500;
    return reply.code(status).send({ ok: false, error: err?.message || "Invalid payload" });
  }
}

/** GET /api/items — list all found items */
export async function listItems(
  _req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const items = await itemsRepo.list(200);
    return reply.send({ ok: true, count: items.length, items });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err?.message || "Failed to list items" });
  }
}

/** GET /api/items/:id — get a single item by itemId */
export async function getItem(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const item = await itemsRepo.get(req.params.id);
    if (!item) return reply.code(404).send({ ok: false, error: "Item not found" });
    return reply.send({ ok: true, item });
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err?.message || "Failed to get item" });
  }
}

export const ItemsController = {
  uploadAndAnalyse,
  storeAnalysedItem,
  listItems,
  getItem,
};
