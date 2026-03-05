/**
 * Heimdall Employee/Vendor Settlements API client.
 * Mark Settled: POST .../admin/settlements/settlements/settlements/{ledgerId}/log.ledger (body: paymentMode, utrOrChequeNumber, etc.)
 * Payout:       POST .../admin/settlements/settlements/settlements/{ledgerId}/payout.ledger (body: optional)
 * Hold:         POST .../admin/settlements/settlements/settlements/{ledgerId}/hold. (body: { remark })
 * Auth: HEIMDALL_AUTH_TOKEN (Bearer) in .env; optional Cookie from Dice auth state (same as vouchers).
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

/** Hold endpoint uses "hold." (trailing dot) per Heimdall API. */
const HOLD_SEGMENT = "hold.";

/** Base path for employee settlements (default). */
function settlementPath(ledgerId: string, action: "log.ledger" | "payout.ledger" | "hold"): string {
  const encoded = encodeURIComponent(ledgerId);
  const segment = action === "hold" ? HOLD_SEGMENT : action;
  return `${HEIMDALL_BASE_URL}/admin/settlements/settlements/settlements/${encoded}/${segment}`;
}

/**
 * Path for vendor settlements. Default: same as employee (shared path).
 * Optional: set HEIMDALL_VENDOR_SETTLEMENTS_PATH=settlements for .../admin/settlements/vendor/... or =vendor for .../admin/vendor/settlements/...
 */
function vendorSettlementPath(ledgerId: string, action: "log.ledger" | "payout.ledger" | "hold"): string {
  const encoded = encodeURIComponent(ledgerId);
  const segment = action === "hold" ? HOLD_SEGMENT : action;
  const pathVariant = (process.env.HEIMDALL_VENDOR_SETTLEMENTS_PATH || "").toLowerCase();
  if (pathVariant === "settlements") {
    return `${HEIMDALL_BASE_URL}/admin/settlements/vendor/settlements/settlements/${encoded}/${segment}`;
  }
  if (pathVariant === "vendor") {
    return `${HEIMDALL_BASE_URL}/admin/vendor/settlements/settlements/${encoded}/${segment}`;
  }
  return `${HEIMDALL_BASE_URL}/admin/settlements/settlements/settlements/${encoded}/${segment}`;
}

export interface MarkSettledBody {
  paymentMode?: string;
  utrOrChequeNumber?: string;
  [key: string]: unknown;
}

/**
 * Mark settlement as settled (employee settlements path).
 * POST .../admin/settlements/settlements/settlements/{ledgerId}/log.ledger
 */
export async function heimdallSettlementMarkSettled(
  ledgerId: string,
  body: MarkSettledBody
): Promise<{ success: boolean; message?: string }> {
  return heimdallSettlementMarkSettledInternal(ledgerId, body, settlementPath);
}

/**
 * Mark vendor settlement as settled (default: same path as employee).
 */
export async function heimdallVendorSettlementMarkSettled(
  ledgerId: string,
  body: MarkSettledBody
): Promise<{ success: boolean; message?: string }> {
  return heimdallSettlementMarkSettledInternal(ledgerId, body, vendorSettlementPath);
}

async function heimdallSettlementMarkSettledInternal(
  ledgerId: string,
  body: MarkSettledBody,
  pathFn: (id: string, action: "log.ledger") => string
): Promise<{ success: boolean; message?: string }> {
  if (!AUTH_TOKEN) {
    return {
      success: false,
      message: "HEIMDALL_AUTH_TOKEN (or HEIMDALL_TOKEN) not set in backend .env",
    };
  }
  const url = pathFn(ledgerId, "log.ledger");
  const headers = buildHeaders();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      redirect: "follow",
    });
    const text = await res.text();
    if (res.ok) {
      return { success: true, message: "Marked as settled successfully." };
    }
    const short = text.slice(0, 300).replace(/\s+/g, " ");
    let msg = `Heimdall ${res.status}: ${short || res.statusText}`;
    if (res.status === 409 || /Settlement not found/i.test(short)) {
      msg += " Refresh the list after signing in to Dice to use real ledger IDs, or the settlement may already be settled or on hold.";
    } else if (res.status === 404) {
      msg += " If this is vendor settlements, try HEIMDALL_VENDOR_SETTLEMENTS_PATH=settlements or =vendor in .env.";
    }
    return { success: false, message: msg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Request failed: ${msg}` };
  }
}

export interface PayoutBody {
  [key: string]: unknown;
}

/**
 * Send settlement to payout (employee path).
 */
export async function heimdallSettlementPayout(
  ledgerId: string,
  body: PayoutBody = {}
): Promise<{ success: boolean; message?: string }> {
  return heimdallSettlementPayoutInternal(ledgerId, body, settlementPath);
}

/** Vendor settlement payout (default: same path as employee). */
export async function heimdallVendorSettlementPayout(
  ledgerId: string,
  body: PayoutBody = {}
): Promise<{ success: boolean; message?: string }> {
  return heimdallSettlementPayoutInternal(ledgerId, body, vendorSettlementPath);
}

async function heimdallSettlementPayoutInternal(
  ledgerId: string,
  body: PayoutBody,
  pathFn: (id: string, action: "payout.ledger") => string
): Promise<{ success: boolean; message?: string }> {
  if (!AUTH_TOKEN) {
    return {
      success: false,
      message: "HEIMDALL_AUTH_TOKEN (or HEIMDALL_TOKEN) not set in backend .env",
    };
  }
  const url = pathFn(ledgerId, "payout.ledger");
  const headers = buildHeaders();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      redirect: "follow",
    });
    const text = await res.text();
    if (res.ok) {
      return { success: true, message: "Sent to payout successfully." };
    }
    const short = text.slice(0, 300).replace(/\s+/g, " ");
    let msg = `Heimdall ${res.status}: ${short || res.statusText}`;
    if (res.status === 409 || /Settlement not found/i.test(short)) {
      msg += " Refresh the list after signing in to Dice to use real ledger IDs.";
    } else if (res.status === 404) {
      msg += " If vendor settlements, try HEIMDALL_VENDOR_SETTLEMENTS_PATH=settlements or =vendor in .env.";
    }
    return { success: false, message: msg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Request failed: ${msg}` };
  }
}

export interface HoldBody {
  remark?: string;
  [key: string]: unknown;
}

/**
 * Put settlement on hold (employee path).
 */
export async function heimdallSettlementHold(
  ledgerId: string,
  body: HoldBody = {}
): Promise<{ success: boolean; message?: string }> {
  return heimdallSettlementHoldInternal(ledgerId, body, settlementPath);
}

/** Vendor settlement hold (default: same path as employee). */
export async function heimdallVendorSettlementHold(
  ledgerId: string,
  body: HoldBody = {}
): Promise<{ success: boolean; message?: string }> {
  return heimdallSettlementHoldInternal(ledgerId, body, vendorSettlementPath);
}

async function heimdallSettlementHoldInternal(
  ledgerId: string,
  body: HoldBody,
  pathFn: (id: string, action: "hold") => string
): Promise<{ success: boolean; message?: string }> {
  if (!AUTH_TOKEN) {
    return {
      success: false,
      message: "HEIMDALL_AUTH_TOKEN (or HEIMDALL_TOKEN) not set in backend .env",
    };
  }
  const url = pathFn(ledgerId, "hold");
  const headers = buildHeaders();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      redirect: "follow",
    });
    const text = await res.text();
    if (res.ok) {
      return { success: true, message: "Settlement put on hold successfully." };
    }
    const short = text.slice(0, 300).replace(/\s+/g, " ");
    let msg = `Heimdall ${res.status}: ${short || res.statusText}`;
    if (res.status === 409 || /Settlement not found/i.test(short)) {
      msg += " Refresh the list after signing in to Dice to use real ledger IDs.";
    } else if (res.status === 404) {
      msg += " If vendor settlements, try HEIMDALL_VENDOR_SETTLEMENTS_PATH=settlements or =vendor in .env.";
    }
    return { success: false, message: msg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Request failed: ${msg}` };
  }
}
