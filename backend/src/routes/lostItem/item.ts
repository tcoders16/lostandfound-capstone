import type { FastifyInstance } from "fastify";
import { uploadAndAnalyse } from "../../controllers/lostItem/itemsController";
import { saveImagePreHandler } from "../../middleware/saveImageMiddleware";
import { ItemsController } from "../../controllers/lostItem/itemsController";


export async function itemsRoutes(app: FastifyInstance) {
  // POST /api/items/store  — save analysed item to Mongo + Pinecone
  app.post("/store", ItemsController.storeAnalysedItem);

  // POST /api/items/upload/analyse  — multipart upload + OpenAI analysis
  app.post("/upload/analyse", { preHandler: saveImagePreHandler }, uploadAndAnalyse);

  // GET /api/items  — list all found items (newest first)
  app.get("/", ItemsController.listItems);

  // GET /api/items/:id  — single item detail
  app.get("/:id", ItemsController.getItem);
}
