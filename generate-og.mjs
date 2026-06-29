// ─────────────────────────────────────────────────────────────
// OG(링크 프리뷰) 이미지 생성기 — 요일별 5장 (월~금)
//   - weeks[0] (최신 주차)의 각 영업일 점심(중식)을 1200×630 카드로 렌더
//   - public/og-mon.png … og-fri.png 로 저장
//   - 런타임에는 /api/og 함수가 KST 오늘 요일에 맞는 이미지를 골라 반환하므로
//     "링크를 올리는 그 날의 점심" 프리뷰가 자동으로 노출됩니다.
//   - 배치: Korean A · Korean B / International A · International B (2단)
//           + Snap snack (전체폭)
//   - 디자인: 실제 웹페이지 브랜딩 (Pretendard · 소프트 카드 · 쿠진 태그 · kcal 배지)
//
// ▶ 주간 메뉴를 갱신할 때 한 번 실행하세요:  node generate-og.mjs  (= npm run og)
//   요일별 회전은 /api/og 가 자동 처리하므로 매일 실행할 필요는 없습니다.
// ─────────────────────────────────────────────────────────────
import puppeteer from "puppeteer";
import { readFileSync } from "node:fs";
import { weeks } from "./src/data/index.js";
import { BRAND, CUISINE, TAG } from "./src/theme.js";

const week = weeks[0];
const sum = (items) => items.reduce((s, [, k]) => s + k, 0);
const DAY_CODE = { 월: "mon", 화: "tue", 수: "wed", 목: "thu", 금: "fri" };
const CORNER_ORDER = ["Korean A", "Korean B", "International A", "International B", "Snap snack"];
const logoB64 = readFileSync("./public/d2sf-logo.png").toString("base64");
const FONT = "'Pretendard Variable', Pretendard, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

// 특정 요일의 점심(중식) 코너 → 카드 데이터
function rowsForDay(dayKey) {
  const lunch = week.sets.filter((s) => s.meal === "중식" && s.day === dayKey && !s.side);
  return CORNER_ORDER.map((name) => lunch.find((s) => s.corner === name))
    .filter(Boolean)
    .map((s) => ({
      corner: s.corner,
      cuisine: s.cuisine,
      color: CUISINE[s.cuisine] ?? BRAND.charcoal,
      tag: s.tag ? TAG[s.tag] : null,
      kcal: sum(s.items),
      main: s.items[0]?.[0] ?? "",
      subs: s.items.slice(1, 3).map((it) => it[0]),
      full: s.corner === "Snap snack",
    }));
}

function buildHtml(dayKey, dayDate, rows) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
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
  .body { padding:20px 48px 0; }
  .hero { display:flex; align-items:center; gap:14px; margin-bottom:14px; }
  .pill { display:inline-flex; align-items:center; gap:7px; background:${BRAND.greenSoft};
    color:${BRAND.green}; font-size:19px; font-weight:800; padding:8px 17px; border-radius:999px; }
  .hero .date { font-size:18px; font-weight:700; color:#a8a29e; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:13px; }
  .card { display:flex; flex-direction:column; gap:9px; background:#fff;
    border:1px solid rgba(231,229,228,.8); border-radius:18px; padding:15px 20px;
    box-shadow:0 1px 2px rgba(0,140,21,.05), 0 12px 26px -12px rgba(0,140,21,.16); }
  .card.full { grid-column:1 / -1; }
  .chead { display:flex; align-items:center; gap:8px; }
  .cn { font-size:20px; font-weight:800; letter-spacing:-.02em; color:#1c1917; }
  .ctag { font-size:12.5px; font-weight:700; padding:3px 9px; border-radius:7px; }
  .tag { font-size:12px; font-weight:800; color:#fff; padding:3px 9px; border-radius:7px; }
  .kcal { margin-left:auto; font-size:13px; font-weight:800; padding:4px 10px; border-radius:9px;
    background:${BRAND.greenSoft}; color:${BRAND.greenDark};
    font-family:'JetBrains Mono',ui-monospace,monospace; }
  .kcal s { text-decoration:none; font-size:9px; font-weight:600; }
  .dish-main { font-size:24px; font-weight:800; letter-spacing:-.02em; color:#1c1917;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2; }
  .dish-sub { font-size:15.5px; font-weight:600; color:#78716c; margin-top:3px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .foot { position:absolute; bottom:18px; left:48px; right:48px; display:flex;
    justify-content:space-between; align-items:center; color:#a8a29e; font-size:15px; font-weight:600; }
  .foot b { color:${BRAND.green}; }
</style></head><body>
  <div class="bar">
    <div class="brand">
      <span class="logo"><img src="data:image/png;base64,${logoB64}" alt="D2SF"/></span>
      <div><h1>카페테리아 주간 메뉴</h1><p>D2SF Cafeteria</p></div>
    </div>
    <span class="wk">${week.label}</span>
  </div>
  <div class="body">
    <div class="hero">
      <span class="pill">🍱 ${dayKey}요일 점심</span>
      <span class="date">${dayDate} (${dayKey})</span>
    </div>
    <div class="grid">
      ${rows.map((r) => `<div class="card${r.full ? " full" : ""}">
        <div class="chead">
          <span class="cn">${r.corner}</span>
          <span class="ctag" style="color:${r.color};background:${r.color}1a">${r.cuisine}</span>
          ${r.tag ? `<span class="tag" style="background:${r.tag.color}">${r.tag.label}</span>` : ""}
          <span class="kcal">${r.kcal}<s>kcal</s></span>
        </div>
        <div>
          <div class="dish-main">${r.main}</div>
          <div class="dish-sub">${r.subs.join(" · ")}</div>
        </div>
      </div>`).join("")}
    </div>
  </div>
  <div class="foot"><span>카페테리아 점심 메뉴 미리보기</span><span><b>what2eat-d2sf.vercel.app</b></span></div>
</body></html>`;
}

// 영업일(월~금)별로 한 장씩 생성
const targets = week.days.filter(([d]) => DAY_CODE[d] && week.sets.some((s) => s.meal === "중식" && s.day === d));

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
for (const [dayKey, dayDate] of targets) {
  const rows = rowsForDay(dayKey);
  await page.setContent(buildHtml(dayKey, dayDate, rows), { waitUntil: "load" });
  await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
  await new Promise((r) => setTimeout(r, 500));
  const out = `./public/og-${DAY_CODE[dayKey]}.png`;
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log(`  - ${out}  (${dayKey} ${dayDate}, ${rows.length}개 코너)`);
}
await browser.close();
console.log(`OG 생성 완료: ${week.label} · 요일별 ${targets.length}장 (런타임 회전은 /api/og 가 처리)`);
