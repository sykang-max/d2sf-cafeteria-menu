// ─────────────────────────────────────────────────────────────
// OG(링크 프리뷰) 이미지 생성기 — 요일별 5장 (월~금)
//   - weeks[0] (최신 주차)의 각 영업일 점심(중식)을 1200×630 카드로 렌더
//   - public/og-mon.png … og-fri.png 로 저장
//   - 런타임에는 /api/og 함수가 KST 오늘 요일에 맞는 이미지를 골라 반환
//   - 디자인 레퍼런스: subway.co.kr — 화이트 중심 + 그린/옐로우 포인트,
//     노란 원형 액센트, 굵은 검정 헤딩, 둥근 pill, 경쾌하고 밝은 톤
//   - 배치: Korean A · Korean B / International A · International B (2단)
//           + Snap snack (전체폭)
//
// ▶ 주간 메뉴 갱신 시 한 번 실행:  node generate-og.mjs  (= npm run og)
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
      radial-gradient(680px 300px at 100% 0%, ${BRAND.yellowSoft} 0%, rgba(255,244,204,0) 62%),
      radial-gradient(560px 320px at 0% 100%, ${BRAND.greenSoft} 0%, rgba(230,244,232,0) 60%),
      #ffffff;
    overflow:hidden;
  }
  .top { height:8px; background:linear-gradient(90deg, ${BRAND.green}, #00A91C); }
  /* 헤더 — 화이트, 가벼움 */
  .bar { display:flex; align-items:center; justify-content:space-between; padding:24px 48px 0; }
  .brand { display:flex; align-items:center; gap:15px; }
  .logo { height:42px; width:auto; display:block; }
  .bt1 { font-size:23px; font-weight:800; letter-spacing:-.02em; color:#1a1a1a; line-height:1.05; }
  .bt2 { font-size:13px; font-weight:600; color:#a8a29e; margin-top:3px; }
  .wk { background:${BRAND.green}; color:#fff; font-weight:800; font-size:20px;
    padding:10px 22px; border-radius:999px; box-shadow:0 6px 16px rgba(0,140,21,.28); }
  /* 히어로 — 노란 원형 액센트(써브웨이 'S' 무드) */
  .hero { display:flex; align-items:center; gap:18px; padding:18px 48px 14px; }
  .hl { position:relative; display:inline-flex; align-items:center; }
  .hl .circle { position:absolute; left:-16px; top:50%; transform:translateY(-50%);
    width:58px; height:58px; background:${BRAND.yellow}; border-radius:50%; z-index:0; }
  .hl .t { position:relative; z-index:1; font-size:42px; font-weight:800; letter-spacing:-.03em; color:#1a1a1a; }
  .hl .day { color:${BRAND.green}; }
  .hdate { font-size:18px; font-weight:700; color:#a8a29e; }
  /* 카드 — 밝고 가벼운 화이트 (얇은 보더 + 옅은 그림자) */
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:0 48px; }
  .card { display:flex; flex-direction:column; gap:9px; background:#fff;
    border:1px solid #EEECE8; border-radius:18px; padding:15px 20px;
    box-shadow:0 3px 12px rgba(26,26,26,.05); }
  .card.full { grid-column:1 / -1; }
  .chead { display:flex; align-items:center; gap:8px; }
  .cn { font-size:19px; font-weight:800; letter-spacing:-.02em; color:#1a1a1a; }
  .ctag { font-size:12px; font-weight:700; padding:3px 10px; border-radius:999px; }
  .tag { font-size:11.5px; font-weight:800; color:#fff; padding:3px 10px; border-radius:999px; }
  .kcal { margin-left:auto; font-size:13px; font-weight:700; color:#b6b2ab;
    font-family:'JetBrains Mono',ui-monospace,monospace; }
  .kcal s { text-decoration:none; font-size:9.5px; }
  .dish-main { font-size:23px; font-weight:800; letter-spacing:-.02em; color:#1a1a1a;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2; }
  .dish-sub { font-size:15px; font-weight:600; color:#9a958e; margin-top:2px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .foot { position:absolute; bottom:20px; left:48px; right:48px; display:flex;
    justify-content:space-between; align-items:center; font-size:15px; font-weight:600; color:#b6b2ab; }
  .foot b { color:${BRAND.green}; }
</style></head><body>
  <div class="top"></div>
  <div class="bar">
    <div class="brand">
      <img class="logo" src="data:image/png;base64,${logoB64}" alt="D2SF"/>
      <div>
        <div class="bt1">카페테리아 주간 메뉴</div>
        <div class="bt2">D2SF Cafeteria · Weekly Menu</div>
      </div>
    </div>
    <span class="wk">${week.label}</span>
  </div>
  <div class="hero">
    <span class="hl"><span class="circle"></span><span class="t"><span class="day">${dayKey}요일</span> 점심</span></span>
    <span class="hdate">${dayDate}</span>
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
  <div class="foot"><span>카페테리아 점심 메뉴 미리보기</span><span><b>what2eat-d2sf.vercel.app</b></span></div>
</body></html>`;
}

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
console.log(`OG 생성 완료: ${week.label} · 요일별 ${targets.length}장`);
