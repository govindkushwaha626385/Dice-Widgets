import { Router } from "express";
import { postChatC1, postAnalysis, postAnalysisChartData } from "../controllers/thesysController.js";

export const thesysRoutes = Router();
thesysRoutes.post("/chat/c1", postChatC1);
thesysRoutes.post("/analysis", postAnalysis);
thesysRoutes.post("/analysis/chart-data", postAnalysisChartData);
