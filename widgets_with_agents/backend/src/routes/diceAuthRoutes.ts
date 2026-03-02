import path from "path";
import { Router, Request, Response } from "express";
import { hasDiceAuth, setDiceAuthPathOverride } from "../config/diceAuthPath.js";

export const diceAuthRoutes = Router();

diceAuthRoutes.get("/widgets/dice-auth/status", (_req: Request, res: Response) => {
  res.json({ hasAuth: hasDiceAuth() });
});

/** Set path override (e.g. when Electron saves auth in dev and backend was started separately). Only from localhost. */
diceAuthRoutes.post("/widgets/dice-auth/set-path", (req: Request, res: Response) => {
  const remote = req.ip || req.socket?.remoteAddress || "";
  if (remote !== "127.0.0.1" && remote !== "::1" && remote !== "::ffff:127.0.0.1") {
    return res.status(403).json({ error: "Only localhost can set path" });
  }
  const { path: p } = req.body as { path?: string };
  const trimmed = typeof p === "string" ? p.trim() : "";
  if (!trimmed || !path.isAbsolute(trimmed)) {
    return res.status(400).json({ error: "Absolute path required" });
  }
  setDiceAuthPathOverride(trimmed);
  res.json({ ok: true });
});
