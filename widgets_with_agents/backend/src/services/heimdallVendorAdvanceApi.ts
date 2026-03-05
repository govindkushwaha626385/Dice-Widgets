/**
 * Heimdall Vendor Advance API client.
 * Approve: POST .../admin/vendor/advances/{numericId}/approve
 * Decline: POST .../admin/vendor/advances/{numericId}/decline (body: { remarks })
 * Auth: HEIMDALL_AUTH_TOKEN (Bearer) in .env.
 */

const HEIMDALL_BASE_URL =
  process.env.HEIMDALL_BASE_URL || "https://heimdall.eka.io";
const AUTH_TOKEN =
  process.env.HEIMDALL_AUTH_TOKEN || process.env.HEIMDALL_TOKEN || "";

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
  return headers;
}

/**
 * Approve a vendor advance.
 * POST https://heimdall.eka.io/admin/vendor/advances/{numericId}/approve
 */
export async function heimdallVendorAdvanceApprove(
  numericId: number
): Promise<{ success: boolean; message?: string }> {
  if (!AUTH_TOKEN) {
    return {
      success: false,
      message: "HEIMDALL_AUTH_TOKEN (or HEIMDALL_TOKEN) not set in backend .env",
    };
  }
  const url = `${HEIMDALL_BASE_URL}/admin/vendor/advances/${numericId}/approve`;
  const headers = buildHeaders();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: "{}",
      redirect: "follow",
    });
    const text = await res.text();
    if (res.ok) {
      return { success: true, message: "Approved successfully." };
    }
    const short = text.slice(0, 300).replace(/\s+/g, " ");
    return { success: false, message: `Heimdall ${res.status}: ${short || res.statusText}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Request failed: ${msg}` };
  }
}

/**
 * Decline a vendor advance with remarks.
 * POST https://heimdall.eka.io/admin/vendor/advances/{numericId}/decline
 */
export async function heimdallVendorAdvanceDecline(
  numericId: number,
  remarks: string
): Promise<{ success: boolean; message?: string }> {
  if (!AUTH_TOKEN) {
    return {
      success: false,
      message: "HEIMDALL_AUTH_TOKEN (or HEIMDALL_TOKEN) not set in backend .env",
    };
  }
  const url = `${HEIMDALL_BASE_URL}/admin/vendor/advances/${numericId}/decline`;
  const headers = buildHeaders();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ remarks: remarks || "" }),
      redirect: "follow",
    });
    const text = await res.text();
    if (res.ok) {
      return { success: true, message: "Declined successfully." };
    }
    const short = text.slice(0, 300).replace(/\s+/g, " ");
    return { success: false, message: `Heimdall ${res.status}: ${short || res.statusText}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Request failed: ${msg}` };
  }
}
