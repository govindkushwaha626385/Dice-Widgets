/**
 * Heimdall voucher API client.
 * Calls heimdall.eka.io to approve or decline vouchers.
 * Auth: HEIMDALL_AUTH_TOKEN (Bearer) in .env; optional cookies from Dice auth state.
 */

import fs from "fs";
import { getDiceAuthStatePath } from "../config/diceAuthPath.js";

// Config from env
const HEIMDALL_BASE_URL =
  process.env.HEIMDALL_BASE_URL || "https://heimdall.eka.io";
const AUTH_TOKEN =
  process.env.HEIMDALL_AUTH_TOKEN || process.env.HEIMDALL_TOKEN || "";

// Types for reading Dice auth state (Playwright storage state format)
interface StorageCookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

interface StorageState {
  cookies?: StorageCookie[];
  origins?: unknown[];
}

/** Build Cookie header from dice-auth-state.json for eka.io / dice.tech domains. */
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
      const allowed = domain.includes("eka.io") || domain.includes("dice.tech");
      if (!allowed) return false;
      if (c.expires !== -1 && c.expires !== undefined && c.expires < now) return false;
      return true;
    });
    return relevant.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
  } catch {
    return "";
  }
}

/** Headers for Heimdall: JSON, Bearer token, optional Cookie. */
function buildHeimdallHeaders(): Record<string, string> {
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

/** POST approve for one voucher. */
export async function heimdallApprove(
  voucherId: string
): Promise<{ success: boolean; message?: string }> {
  if (!AUTH_TOKEN) {
    return {
      success: false,
      message: "HEIMDALL_AUTH_TOKEN (or HEIMDALL_TOKEN) not set in backend .env",
    };
  }
  const url = `${HEIMDALL_BASE_URL}/admin/settlements/vouchers/finance/${encodeURIComponent(voucherId)}/approve`;
  const headers = buildHeimdallHeaders();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: "{}",
      redirect: "follow",
    });
    const text = await res.text();
    if (res.ok) return { success: true };
    const short = text.slice(0, 300).replace(/\s+/g, " ");
    return { success: false, message: `Heimdall ${res.status}: ${short || res.statusText}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Request failed: ${msg}` };
  }
}

export async function heimdallDecline(
  voucherId: string,
  remarks: string
): Promise<{ success: boolean; message?: string }> {
  if (!AUTH_TOKEN) {
    return {
      success: false,
      message: "HEIMDALL_AUTH_TOKEN (or HEIMDALL_TOKEN) not set in backend .env",
    };
  }
  const url = `${HEIMDALL_BASE_URL}/admin/settlements/vouchers/finance/${encodeURIComponent(voucherId)}/decline`;
  const headers = buildHeimdallHeaders();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ remarks: remarks || "" }),
      redirect: "follow",
    });
    const text = await res.text();
    if (res.ok) return { success: true };
    const short = text.slice(0, 300).replace(/\s+/g, " ");
    return { success: false, message: `Heimdall ${res.status}: ${short || res.statusText}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Request failed: ${msg}` };
  }
}
