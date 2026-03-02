import type { Request, Response } from "express";
import { isGoogleConfigured } from "../services/googleAuth.js";
import { fetchRecentEmails } from "../services/gmailService.js";
import { fetchUpcomingEvents } from "../services/calendarService.js";
import { fetchTasks } from "../services/tasksService.js";

export async function getGoogleStatus(_req: Request, res: Response): Promise<void> {
  res.json({ configured: isGoogleConfigured() });
}

export async function getEmails(_req: Request, res: Response): Promise<void> {
  const result = await fetchRecentEmails();
  if (!result.ok) {
    res.status(400).json({ error: result.error, emails: [] });
    return;
  }
  res.json({ emails: result.emails });
}

export async function getCalendarEvents(_req: Request, res: Response): Promise<void> {
  const result = await fetchUpcomingEvents();
  if (!result.ok) {
    res.status(400).json({ error: result.error, events: [] });
    return;
  }
  res.json({ events: result.events });
}

export async function getTasks(_req: Request, res: Response): Promise<void> {
  const result = await fetchTasks();
  if (!result.ok) {
    res.status(400).json({ error: result.error, tasks: [] });
    return;
  }
  res.json({ tasks: result.tasks });
}
