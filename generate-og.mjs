// ─────────────────────────────────────────────────────────────
// OG(링크 프리뷰) 이미지 생성기
//   - weeks[0] (최신 주차)의 "월요일 점심(중식)" 을 1200×630 카드로 렌더
//   - 디자인은 실제 웹페이지 브랜딩을 그대로 차용:
//     Pretendard 폰트 · rounded-2xl 카드 · 그린 틴트 소프트 그림자
//     · 은은한 쿠진 태그 · greenSoft kcal 배지 · 그린/옐로우 팔레트
//   - public/og.png 로 저장 (배포 시 /og.png 로 서빙)
//   - index.html 의 <!-- OG:START --> ~ <!-- OG:END --> 블록을 자동 갱신
//     (og:image 에 ?v=<주차id> 를 붙여 카카오/슬랙 캐시를 무효화)
//
// ▶ 매주 식단 갱신 후 한 번 실행하세요:  node generate-og.mjs  (= npm run og)
// ─────────────────────────────────────────────────────────────
import puppeteer from "puppeteer";
import { readFileSync, writeFileSync } from "node:fs";
import { weeks } from "./src/data/index.js";
import { BRAND, CUISINE, TAG } from "./src/theme.js";

const SITE = "https://what2eat-d2sf.vercel.app";
const week = weeks[0];
const sum = (items) => items.reduce((s, [, k]) => s + k, 0);

// 월요일 중식(점심) 코너 — 추가배식대(side) 제외. 사이트와 동일한 코너 배치.
const CORNER_ORDER = ["Korean A", "Korean B", "International A", "International B", "Snap snack"];
const mondayLunch = week.sets.filter((s) => s.meal === "중식" && s.day === "월" && !s.side);
const corners = CORNER_ORDER.map((name) => mondayLunch.find((s) => s.corner === name)).filter(Boolean);

// 카드용: 코너명 + 쿠진 + 태그 + 총 kcal + 대표메뉴 3개(메인 1 + 보조 2)
const rows = corners.map((s) => ({
  corner: s.corner,
  cuisine: s.cuisine,
  color: CUISINE[s.cuisine] ?? BRAND.charcoal,
  tag: s.tag ? TAG[s.tag] : null,
  kcal: sum(s.items),
  main: s.items[0]?.[0] ?? "",
  subs: s.items.slice(1, 3).map((it) => it[0]),
}));

const mondayDate = week.days?.find((d) => d[0] === "월")?.[1] ?? "";
const logoB64 = readFileSync("./public/d2sf-logo.png").toString("base64");

// 링크 프리뷰에 함께 노출되는 고정 설명 문구
const description = "D2SF 구내식당 주간 식단표 — 조식·중식·석식·테이크아웃, 메뉴 검색, 칼로리 분석";
const title = `D2SF 구내식당 — ${week.label} 월요일 점심`;

const FONT = "'Pretendard Variable', Pretendard, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1200px; height:630px; }
  body {
    font-family:${FONT}; color:${BRAND.charcoal};
    -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
    background:
      radial-gradient(900px 420px at 92% -10%, ${BRAND.greenSoft} 0%, rgba(230,244,232,0) 62%),
      radial-gradient(620px 360px at -6% 118%, ${BRAND.yellowSoft} 0%, rgba(255,244,204,0) 58%),
      #ffffff;
    overflow:hidden;
  }
  /* 상단 그린 바 — 사이트 헤더와 동일 */
  .bar { height:96px; background:${BRAND.green}; display:flex; align-items:center;
    justify-content:space-between; padding:0 48px; }
  .brand { display:flex; align-items:center; gap:18px; }
  .logo { background:#fff; border-radius:16px; padding:12px 18px; display:flex;
    box-shadow:0 8px 22px rgba(0,70,12,.26); }
  .logo img { height:38px; width:auto; display:block; }
  .brand h1 { color:#fff; font-size:30px; font-weight:800; letter-spacing:-.02em; }
  .brand p  { color:rgba(255,255,255,.72); font-size:14px; font-weight:600; margin-top:2px; }
  .wk { background:${BRAND.yellow}; color:${BRAND.yellowText}; font-weight:800;
    font-size:22px; padding:11px 24px; border-radius:999px; box-shadow:0 8px 20px rgba(122,90,0,.22); }
  /* 히어로 — 사이트의 greenSoft 필 + 타이틀 톤 */
  .body { padding:16px 48px 0; }
  .hero { display:flex; align-items:center; gap:14px; margin-bottom:12px; }
  .pill { display:inline-flex; align-items:center; gap:7px; background:${BRAND.greenSoft};
    color:${BRAND.green}; font-size:17px; font-weight:800; padding:7px 15px; border-radius:999px; }
  .hero .date { font-size:17px; font-weight:700; color:#a8a29e; }
  /* 코너 카드 — 사이트 SetCard 스타일 */
  .grid { display:flex; flex-direction:column; gap:8px; }
  .card { display:flex; align-items:center; gap:20px; background:#fff;
    border:1px solid rgba(231,229,228,.8); border-radius:18px; padding:11px 20px;
    box-shadow:0 1px 2px rgba(0,140,21,.05), 0 12px 26px -12px rgba(0,140,21,.16); }
  .left { flex:0 0 264px; display:flex; flex-direction:column; gap:5px; }
  .cn { font-size:21px; font-weight:800; letter-spacing:-.02em; color:#1c1917; line-height:1; }
  .meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .ctag { font-size:12.5px; font-weight:700; padding:3px 9px; border-radius:7px; }
  .tag { font-size:12px; font-weight:800; color:#fff; padding:3px 9px; border-radius:7px; }
  .kcal { font-size:13px; font-weight:800; padding:4px 10px; border-radius:9px;
    background:${BRAND.greenSoft}; color:${BRAND.greenDark};
    font-family:'JetBrains Mono',ui-monospace,monospace; }
  .kcal s { text-decoration:none; font-size:9px; font-weight:600; }
  .right { min-width:0; flex:1; }
  .dish-main { font-size:22px; font-weight:800; letter-spacing:-.02em; color:#1c1917;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2; }
  .dish-sub { font-size:15px; font-weight:600; color:#78716c; margin-top:3px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .foot { position:absolute; bottom:20px; left:48px; right:48px; display:flex;
    justify-content:space-between; align-items:center; color:#a8a29e; font-size:15px; font-weight:600; }
  .foot b { color:${BRAND.green}; }
</style></head><body>
  <div class="bar">
    <div class="brand">
      <span class="logo"><img src="data:image/png;base64,${logoB64}" alt="D2SF"/></span>
      <div><h1>구내식당 식단표</h1><p>D2SF Cafeteria</p></div>
    </div>
    <span class="wk">${week.label}</span>
  </div>
  <div class="body">
    <div class="hero">
      <span class="pill">🍱 이번 주 월요일 점심</span>
      <span class="date">${mondayDate} (월)</span>
    </div>
    <div class="grid">
      ${rows.map((r) => `<div class="card">
        <div class="left">
          <span class="cn">${r.corner}</span>
          <span class="meta">
            <span class="ctag" style="color:${r.color};background:${r.color}1a">${r.cuisine}</span>
            ${r.tag ? `<span class="tag" style="background:${r.tag.color}">${r.tag.label}</span>` : ""}
            <span class="kcal">${r.kcal}<s>kcal</s></span>
          </span>
        </div>
        <div class="right">
          <div class="dish-main">${r.main}</div>
          <div class="dish-sub">${r.subs.join(" · ")}</div>
        </div>
      </div>`).join("")}
    </div>
  </div>
  <div class="foot"><span>매주 월요일 점심 메뉴 미리보기</span><span><b>what2eat-d2sf.vercel.app</b></span></div>
</body></html>`;

// 1) 카드 렌더 → public/og.png (Pretendard 로드 대기)
const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle0" });
await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: "./public/og.png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

// 2) index.html OG 블록 갱신
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const img = `${SITE}/og.png?v=${week.id}`;
const block = `<!-- OG:START (generate-og.mjs 가 매주 자동 갱신) -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="D2SF 구내식당 식단표" />
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
