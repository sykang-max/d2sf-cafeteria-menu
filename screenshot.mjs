// Usage: node screenshot.mjs <url> [label]
// 저장: ./temporary screenshots/screenshot-N[-label].png (자동 증가, 덮어쓰지 않음)
import puppeteer from "puppeteer";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const url = process.argv[2] || "http://localhost:4173";
const label = process.argv[3] ? `-${process.argv[3]}` : "";
const outDir = "temporary screenshots";
mkdirSync(outDir, { recursive: true });

let n = 1;
try {
  const used = readdirSync(outDir)
    .map((f) => /screenshot-(\d+)/.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  if (used.length) n = Math.max(...used) + 1;
} catch {}

const out = join(outDir, `screenshot-${n}${label}.png`);

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, 600)); // 폰트/이미지 안정화
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("saved:", out);
