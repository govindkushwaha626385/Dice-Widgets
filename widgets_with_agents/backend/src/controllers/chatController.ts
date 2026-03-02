import type { Request, Response } from "express";
import OpenAI from "openai";

const openaiApiKey = (process.env.OPENAI_API_KEY ?? "").trim();

function fallbackReply(message: string): string {
  const lower = message.toLowerCase();
  if (/^(hi|hello|hey|hiya)\b/.test(lower)) return "Hi! How can I help you today?";
  if (/\b(thanks|thank you|thx)\b/.test(lower)) return "You're welcome!";
  if (/\b(bye|goodbye)\b/.test(lower)) return "Bye! Have a great day.";
  if (/\b(help|what can you do)\b/.test(lower)) {
    return "I'm your assistant. You can ask me anything—try asking about your emails, calendar, or tasks. Add OPENAI_API_KEY in backend/.env for smarter replies.";
  }
  if (message.length < 200) {
    return `You said: "${message}". Add OPENAI_API_KEY in backend/.env to get AI-powered replies.`;
  }
  return "Got it! Add OPENAI_API_KEY in backend/.env for full conversational AI.";
}

export async function postChat(req: Request, res: Response): Promise<void> {
  const message = (req.body?.message ?? "").trim();
  if (!message) {
    res.status(400).json({ error: "Message is required", reply: "" });
    return;
  }

  if (openaiApiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful personal assistant. Be concise and friendly. The user has a dashboard with emails, calendar, and tasks.",
          },
          { role: "user", content: message },
        ],
        max_tokens: 500,
      });
      const reply = completion.choices[0]?.message?.content?.trim();
      if (reply) {
        res.json({ reply });
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OpenAI request failed";
      console.error("[Chat]", msg);
      res.json({ reply: `Sorry, the AI couldn't respond: ${msg}. Try again or check your API key.` });
      return;
    }
  }

  res.json({ reply: fallbackReply(message) });
}
