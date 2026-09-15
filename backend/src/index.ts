import "dotenv/config";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { pool, query } from "./db.js";
import { HttpError } from "./http.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { uploadRouter } from "./routes/upload.js";

const port = Number(process.env.PORT) || 3001;
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

const app = express();

app.use(cors({ origin: frontendOrigin }));
app.use(express.json());
app.use(uploadRouter);
app.use(subscriptionsRouter);

app.get("/health", async (_req, res) => {
  try {
    await query("SELECT 1 AS ok");
    const rules = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM category_rules",
    );

    res.json({
      ok: true,
      service: "ghostcharges-api",
      db: "connected",
      categoryRules: Number(rules.rows[0]?.count ?? 0),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    res.status(503).json({
      ok: false,
      service: "ghostcharges-api",
      db: "disconnected",
      error: message,
    });
  }
});

app.get("/", (_req, res) => {
  res.json({
    name: "GhostCharges API",
    phase: 3,
    health: "/health",
    upload: "POST /upload",
    sample: "GET /sample.csv",
    subscriptions: "GET /subscriptions/:batchId",
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "CSV is too large. Max size is 5MB."
        : error.message;
    res.status(400).json({ error: message });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  console.error(error);
  res.status(500).json({ error: message });
});

const server = app.listen(port, () => {
  console.log(`GhostCharges API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
