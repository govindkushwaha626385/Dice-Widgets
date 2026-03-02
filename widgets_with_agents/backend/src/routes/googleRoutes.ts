import { Router } from "express";
import { getGoogleStatus, getEmails, getCalendarEvents, getTasks } from "../controllers/googleController.js";

export const googleRoutes = Router();

googleRoutes.get("/google/status", getGoogleStatus);
googleRoutes.get("/gmail/emails", getEmails);
googleRoutes.get("/calendar/events", getCalendarEvents);
googleRoutes.get("/tasks/list", getTasks);
