/**
 * Heimdall Transfers API: recall payout.
 * POST .../admin/transfers/eka/{transferId}/recall
 * Auth: HEIMDALL_AUTH_TOKEN (Bearer) + optional Cookie from Dice auth state.
 */

import fs from "fs";
import { getDiceAuthStatePath } from "../config/diceAuthPath.js";

const HEIMDALL_BASE_URL =
  process.env.HEIMDALL_BASE_URL || "https://heimdall.eka.io";
const AUTH_TOKEN =
  process.env.HEIMDALL_AUTH_TOKEN || process.env.HEIMDALL_TOKEN || "";

interface StorageCookie {
  name: string;
  value: string;
  domain: string;
  expires?: number;
}
interface StorageState {
  cookies?: StorageCookie[];
}

function getCookieHeaderForHeimdall(): string {
  const statePath = getDiceAuthStatePath();
  if (!statePath) return "";
  try {
    const raw = fs.readFileSync(statePath, "utf-8");
    const state = JSON.parse(raw) as StorageState;
    const cookies = state.cookies || [];
    const now = Math.floor(Date.now() / 1000);
    const relevant = cookies.filter((c) => {
      const domain = (c.domain || "").toLowerCase();
      if (!domain.includes("eka.io") && !domain.includes("dice.tech")) return false;
      if (c.expires !== -1 && c.expires !== undefined && c.expires < now) return false;
      return true;
    });
    return relevant.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
  } catch {
    return "";
  }
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "DiceWidgets/1.0",
  };
  if (AUTH_TOKEN) {
    headers["Authorization"] = AUTH_TOKEN.startsWith("Bearer ")
      ? AUTH_TOKEN
      : `Bearer ${AUTH_TOKEN}`;
  }
  const cookie = getCookieHeaderForHeimdall();
  if (cookie) headers["Cookie"] = cookie;
  return headers;
}

export interface RecallResult {
  success: boolean;
  message?: string;
}

/**
 * Recall a transfer by ID.
 * POST https://heimdall.eka.io/admin/transfers/eka/{transferId}/recall
 */
export async function heimdallRecallTransfer(transferId: string): Promise<RecallResult> {
  const id = transferId.trim();
  if (!id) return { success: false, message: "Transfer ID required" };
  const url = `${HEIMDALL_BASE_URL}/admin/transfers/eka/${encodeURIComponent(id)}/recall`;
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text || `Recall failed (${res.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json.message === "string") message = json.message;
      else if (typeof json.error === "string") message = json.error;
    } catch {
      // use text as message
    }
    return { success: false, message };
  }
  try {
    const data = text ? JSON.parse(text) : {};
    if (data.success === true) return { success: true, message: data.message };
    return { success: true, message: data.message ?? "Recall successful." };
  } catch {
    return { success: true, message: "Recall successful." };
  }
}
