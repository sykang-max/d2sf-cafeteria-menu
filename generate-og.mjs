// ─────────────────────────────────────────────────────────────
// OG(링크 프리뷰) 이미지 생성기
//   - weeks[0] (최신 주차)의 "월요일 점심(중식)" 을 1200×630 카드로 렌더
//   - public/og.png 로 저장 (배포 시 /og.png 로 서빙)
//   - index.html 의 <!-- OG:START --> ~ <!-- OG:END --> 블록을 자동 갱신
//     (og:image 에 ?v=<주차id> 를 붙여 카카오/슬랙 캐시를 무효화)
//
// ▶ 매주 식단 갱신 후 한 번 실행하세요:  node generate-og.mjs
// ─────────────────────────────────────────────────────────────
import puppeteer from "puppeteer";
import { readFileSync, writeFileSync } from "node:fs";
import { weeks } from "./src/data/index.js";
import { BRAND, CUISINE } from "./src/theme.js";

const SITE = "https://what2eat-d2sf.vercel.app";
const week = weeks[0];

// 월요일 중식(점심) 코너 — 추가배식대(side) 제외, 게시판 순서 유지
const CORNER_ORDER = ["Korean A", "Korean B", "Snap snack", "International A", "International B"];
const mondayLunch = week.sets.filter((s) => s.meal === "중식" && s.day === "월" && !s.side);
const corners = CORNER_ORDER
  .map((name) => mondayLunch.find((s) => s.corner === name))
  .filter(Boolean);

// 카드용: 코너명 + 대표메뉴(첫 항목)
const rows = corners.map((s) => ({
  corner: s.corner,
  dish: s.items[0]?.[0] ?? "",
  color: CUISINE[s.cuisine] ?? BRAND.charcoal,
}));

const mondayDate = week.days?.find((d) => d[0] === "월")?.[1] ?? "";
const logoB64 = readFileSync("./public/d2sf-logo.png").toString("base64");

// description (텍스트 프리뷰용): 대표메뉴 나열
const descMenus = rows.map((r) => `${r.corner} ${r.dish}`).join(" · ");
const description = `${week.range} · 월요일 점심 — ${descMenus}`;
const title = `D2SF 지하식당 — ${week.label} 월요일 점심`;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1200px; height:630px; }
  body {
    font-family:'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif;
    background:
      radial-gradient(1100px 500px at 88% -12%, ${BRAND.greenSoft} 0%, rgba(230,244,232,0) 60%),
      radial-gradient(700px 400px at -8% 115%, ${BRAND.yellowSoft} 0%, rgba(255,244,204,0) 55%),
      #ffffff;
    color:${BRAND.charcoal}; overflow:hidden;
  }
  .bar { height:128px; background:${BRAND.green}; display:flex; align-items:center;
    justify-content:space-between; padding:0 52px; }
  .brand { display:flex; align-items:center; gap:20px; }
  .logo { background:#fff; border-radius:18px; padding:14px 20px; display:flex;
    box-shadow:0 8px 24px rgba(0,80,15,.28); }
  .logo img { height:44px; width:auto; display:block; }
  .brand h1 { color:#fff; font-size:34px; font-weight:800; letter-spacing:-.02em; }
  .brand p  { color:rgba(255,255,255,.72); font-size:15px; font-weight:600; margin-top:3px; }
  .wk { background:${BRAND.yellow}; color:${BRAND.yellowText}; font-weight:800;
    font-size:24px; padding:12px 26px; border-radius:999px; box-shadow:0 8px 22px rgba(122,90,0,.22); }
  .body { padding:34px 52px 0; }
  .hl { display:flex; align-items:baseline; gap:16px; margin-bottom:22px; }
  .hl .big { font-size:46px; font-weight:800; letter-spacing:-.03em; }
  .hl .dot { color:${BRAND.green}; }
  .hl .date { font-size:24px; font-weight:700; color:${BRAND.green}; }
  .grid { display:flex; flex-direction:column; gap:14px; }
  .row { display:flex; align-items:center; gap:18px; }
  .chip { flex:0 0 200px; font-size:18px; font-weight:800; color:#fff; padding:11px 0;
    text-align:center; border-radius:13px; box-shadow:0 6px 16px rgba(0,0,0,.12); }
  .dish { font-size:29px; font-weight:700; letter-spacing:-.02em; color:${BRAND.charcoal};
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .foot { position:absolute; bottom:26px; left:52px; right:52px; display:flex;
    justify-content:space-between; align-items:center; color:#8a8a8a; font-size:17px; font-weight:600; }
  .foot b { color:${BRAND.green}; }
</style></head><body>
  <div class="bar">
    <div class="brand">
      <span class="logo"><img src="data:image/png;base64,${logoB64}" alt="D2SF"/></span>
      <div><h1>지하식당 식단표</h1><p>D2SF Cafeteria</p></div>
    </div>
    <span class="wk">${week.label}</span>
  </div>
  <div class="body">
    <div class="hl">
      <span class="big">월요일 점심<span class="dot">.</span></span>
      <span class="date">${mondayDate} (월)</span>
    </div>
    <div class="grid">
      ${rows.map((r) => `<div class="row">
        <span class="chip" style="background:${r.color}">${r.corner}</span>
        <span class="dish">${r.dish}</span>
      </div>`).join("")}
    </div>
  </div>
  <div class="foot"><span>매주 월요일 점심 메뉴 미리보기</span><span><b>what2eat-d2sf.vercel.app</b></span></div>
</body></html>`;

// 1) 카드 렌더 → public/og.png
const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: "./public/og.png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

// 2) index.html OG 블록 갱신
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const img = `${SITE}/og.png?v=${week.id}`;
const block = `<!-- OG:START (generate-og.mjs 가 매주 자동 갱신) -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="D2SF 지하식당 식단표" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:url" content="${SITE}/" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${img}" />
    <!-- OG:END -->`;

let indexHtml = readFileSync("./index.html", "utf8");
indexHtml = indexHtml.replace(/<!-- OG:START[\s\S]*?<!-- OG:END -->/, block);
writeFileSync("./index.html", indexHtml, "utf8");

console.log(`OG 생성 완료: ${week.label} (${week.id})`);
console.log(`  - public/og.png (${rows.length}개 코너)`);
console.log(`  - index.html OG 블록 갱신, og:image=${img}`);
