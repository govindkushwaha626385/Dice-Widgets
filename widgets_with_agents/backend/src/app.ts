import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load backend/.env: try cwd first (when "cd backend && npm run dev"), then path relative to this file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFromCwd = path.join(process.cwd(), ".env");
const envFromFile = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envFromCwd });
dotenv.config({ path: envFromFile });

import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/authRoutes.js";
import { profileRoutes } from "./routes/profileRoutes.js";
import { googleRoutes } from "./routes/googleRoutes.js";
import { chatRoutes } from "./routes/chatRoutes.js";
import { thesysRoutes } from "./routes/thesysRoutes.js";
import { expensesScraperRoutes } from "./routes/expensesScraperRoutes.js";
import { vouchersScraperRoutes } from "./routes/vouchersScraperRoutes.js";
import { diceAuthRoutes } from "./routes/diceAuthRoutes.js";

export const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api", googleRoutes);
app.use("/api", chatRoutes);
app.use("/api", thesysRoutes);
app.use("/api", expensesScraperRoutes);
app.use("/api", vouchersScraperRoutes);
app.use("/api", diceAuthRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

export function startServer(): Promise<{ port: number }> {
  return new Promise((resolve) => {
    app.listen(PORT, async () => {
      console.log(`Backend running at http://localhost:${PORT}`);
      const { isGoogleConfigured } = await import("./services/googleAuth.js");
      console.log(`Google (Gmail/Calendar/Tasks): ${isGoogleConfigured() ? "configured" : "not configured — add GOOGLE_* to backend/.env"}`);
      resolve({ port: Number(PORT) });
    });
  });
}
