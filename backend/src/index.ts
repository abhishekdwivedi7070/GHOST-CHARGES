import "dotenv/config";
import cors from "cors";
import express from "express";
import { pool, query } from "./db.js";

const port = Number(process.env.PORT) || 3001;
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

const app = express();

app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

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
    phase: 1,
    health: "/health",
  });
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
