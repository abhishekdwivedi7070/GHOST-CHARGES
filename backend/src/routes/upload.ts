import { Router } from "express";
import multer from "multer";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HttpError } from "../http.js";
import { insertTransactions } from "../import/insertTransactions.js";
import { parseBankCsv } from "../import/parseCsv.js";

const SAMPLE_CSV_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "data",
  "sample-transactions.csv",
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const name = file.originalname.toLowerCase();

    if (name.endsWith(".csv") || file.mimetype === "text/csv") {
      callback(null, true);
      return;
    }

    callback(new HttpError(400, "Please upload a .csv file."));
  },
});

export const uploadRouter = Router();

uploadRouter.get("/sample.csv", async (_req, res, next) => {
  try {
    const csv = await readFile(SAMPLE_CSV_PATH);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="ghostcharges-sample-transactions.csv"',
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

uploadRouter.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    void (async () => {
      try {
        if (!req.file) {
          throw new HttpError(400, "Attach a CSV file in the 'file' field.");
        }

        const parsed = parseBankCsv(req.file.buffer);
        const inserted = await insertTransactions(parsed.rows);

        res.status(201).json({
          importBatchId: inserted.importBatchId,
          rowsReceived: parsed.rows.length + parsed.skipped.length,
          rowsInserted: inserted.rowsInserted,
          rowsSkipped: parsed.skipped.length,
          skipped: parsed.skipped.slice(0, 20),
          preview: inserted.preview,
        });
      } catch (caught) {
        next(caught);
      }
    })();
  });
});
