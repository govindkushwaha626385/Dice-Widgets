/**
 * Backend entry point.
 * Loads .env, then starts the Express server when this file is run directly.
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const { app, startServer } = await import("./app.js");

const isMainModule =
  process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js");
if (isMainModule) {
  startServer();
}

export { app, startServer };
