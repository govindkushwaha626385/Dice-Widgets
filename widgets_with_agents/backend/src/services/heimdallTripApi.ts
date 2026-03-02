/**
 * Heimdall trip API client.
 * POST https://heimdall.eka.io/admin/trips/{tripId}/delete
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
 * Delete a trip via Heimdall API.
 * POST https://heimdall.eka.io/admin/trips/{tripId}/delete
 */
export async function heimdallDeleteTrip(
  tripId: string
): Promise<{ success: boolean; message?: string }> {
  if (!AUTH_TOKEN) {
    return {
      success: false,
      message: "HEIMDALL_AUTH_TOKEN (or HEIMDALL_TOKEN) not set in backend .env",
    };
  }
  const url = `${HEIMDALL_BASE_URL}/admin/trips/${encodeURIComponent(tripId)}/delete`;
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
      return { success: true, message: "Trip deleted successfully." };
    }
    const short = text.slice(0, 300).replace(/\s+/g, " ");
    return { success: false, message: `Heimdall ${res.status}: ${short || res.statusText}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Request failed: ${msg}` };
  }
}
