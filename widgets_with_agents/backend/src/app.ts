/**
 * Backend app: Express server, CORS, JSON body, and API route mounting.
 * Entry point for the server is index.ts.
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// --- Load environment (backend/.env) ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

import express from "express";
import cors from "cors";

// Route modules
import { authRoutes } from "./routes/authRoutes.js";
import { profileRoutes } from "./routes/profileRoutes.js";
import { googleRoutes } from "./routes/googleRoutes.js";
import { chatRoutes } from "./routes/chatRoutes.js";
import { thesysRoutes } from "./routes/thesysRoutes.js";
import { expensesScraperRoutes } from "./routes/expensesScraperRoutes.js";
import { vouchersScraperRoutes } from "./routes/vouchersScraperRoutes.js";
import { tripsScraperRoutes } from "./routes/tripsScraperRoutes.js";
import { vendorAdvanceScraperRoutes } from "./routes/vendorAdvanceScraperRoutes.js";
import { employeeSettlementsRoutes } from "./routes/employeeSettlementsRoutes.js";
import { vendorSettlementsRoutes } from "./routes/vendorSettlementsRoutes.js";
import { transfersAccountsRoutes } from "./routes/transfersAccountsRoutes.js";
import { diceAuthRoutes } from "./routes/diceAuthRoutes.js";

const PORT = process.env.PORT ?? 3001;
export const app = express();

// --- Middleware ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// --- API routes (all under /api) ---
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api", googleRoutes);
app.use("/api", chatRoutes);
app.use("/api", thesysRoutes);
app.use("/api", expensesScraperRoutes);
app.use("/api", vouchersScraperRoutes);
app.use("/api", tripsScraperRoutes);
app.use("/api", vendorAdvanceScraperRoutes);
app.use("/api", employeeSettlementsRoutes);
app.use("/api", vendorSettlementsRoutes);
app.use("/api", transfersAccountsRoutes);
app.use("/api", diceAuthRoutes);

// Health check (used by Electron to wait for backend)
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- Start server ---
export function startServer(): Promise<{ port: number }> {
  return new Promise((resolve) => {
    app.listen(PORT, async () => {
      console.log(`Backend running at http://localhost:${PORT}`);
      const { isGoogleConfigured } = await import("./services/googleAuth.js");
      console.log(
        `Google (Gmail/Calendar/Tasks): ${isGoogleConfigured() ? "configured" : "not configured — add GOOGLE_* to backend/.env"}`
      );
      resolve({ port: Number(PORT) });
    });
  });
}
