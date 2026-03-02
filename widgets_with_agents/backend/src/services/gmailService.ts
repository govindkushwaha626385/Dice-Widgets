import { google } from "googleapis";
import { getOAuth2Client, isGoogleConfigured } from "./googleAuth.js";

const MAX_EMAILS = 10;

export interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export async function fetchRecentEmails(): Promise<{ ok: boolean; emails: GmailMessage[]; error?: string }> {
  if (!isGoogleConfigured()) {
    return { ok: false, emails: [], error: "Google credentials not configured in backend/.env" };
  }

  try {
    const auth = getOAuth2Client();
    const gmail = google.gmail({ version: "v1", auth });
    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults: MAX_EMAILS,
      q: "in:inbox",
    });

    const messages = list.data.messages ?? [];
    const emails: GmailMessage[] = [];

    for (const m of messages.slice(0, MAX_EMAILS)) {
      if (!m.id) continue;
      const msg = await gmail.users.messages.get({ userId: "me", id: m.id });
      const payload = msg.data.payload;
      const headers = payload?.headers ?? [];
      const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
      const subject = getHeader("Subject");
      const from = getHeader("From");
      const date = getHeader("Date");
      const labelIds = msg.data.labelIds ?? [];
      const unread = labelIds.includes("UNREAD");
      emails.push({
        id: m.id,
        from,
        subject,
        snippet: msg.data.snippet ?? "",
        date: formatDate(date),
        unread,
      });
    }

    return { ok: true, emails };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch Gmail";
    console.error("[Gmail]", message);
    return { ok: false, emails: [], error: message };
  }
}

function formatDate(raw: string): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 172800000) return "Yesterday";
    return d.toLocaleDateString();
  } catch {
    return raw;
  }
}
