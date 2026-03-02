/**
 * One-time script: open the transaction URL, log in manually, then save session.
 * Run: cd backend && npx tsx scripts/save-dice-auth-state.ts
 * Then add to backend/.env: DICE_AUTH_STATE_PATH=./dice-auth-state.json
 */
import path from "path";
import { chromium } from "playwright";

const BASE_URL = process.env.DICE_TRANSACTION_BASE_URL ?? "https://corporate.dice.tech/app/transaction";
const OUT_PATH = path.resolve(process.cwd(), "dice-auth-state.json");

async function main() {
  console.log("Opening browser. Log in at the transaction page, then come back here.");
  console.log("URL:", BASE_URL);
  console.log("");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

  console.log("Browser window opened. Log in now. When you see the expenses table, press Enter in this terminal...");
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  await context.storageState({ path: OUT_PATH });
  console.log("Saved session to:", OUT_PATH);
  console.log("");
  console.log("Add this to backend/.env:");
  console.log("  DICE_AUTH_STATE_PATH=./dice-auth-state.json");
  console.log("");
  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
