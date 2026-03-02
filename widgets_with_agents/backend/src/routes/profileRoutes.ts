import { Router } from "express";
import { getProfile } from "../controllers/authController.js";

export const profileRoutes = Router();

profileRoutes.get("/me", getProfile);
