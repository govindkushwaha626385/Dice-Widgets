import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load .env before any app code so Google/auth see process.env (ESM hoists imports, so do this first)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const { app, startServer } = await import("./app.js");

// When run directly (e.g. node dist/index.js or tsx src/index.ts), start the server
const isMain = process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js");
if (isMain) {
  startServer();
}

export { app, startServer };
