// ─────────────────────────────────────────────────────────────
// OG(링크 프리뷰) 이미지 생성기 — 주차별 1장씩 (코너별 요일 대표메뉴)
//   - 등록된 모든 주차에 대해 점심(중식) 5개 코너 × 5요일(월~금)의
//     대표 메뉴 1개씩을 1200×630 그리드 카드로 렌더
//     → public/og/<주차id>.png + public/og/manifest.json
//   - 코너별로 한 줄(총 5줄). 칼로리·단가 텍스트는 표기하지 않음.
//   - 단가(보라색 박스) 스페셜 메뉴 셀에는 "Special Menu" 태그를 붙인다.
//
//   /api/og 가 manifest.json의 mon~fri 구간과 오늘(KST)을 비교해
//   "이번 주" 이미지를 골라 반환한다. 그래서 다음 주 식단을 미리 등록해도
//   링크 프리뷰는 그 주가 되기 전까지 바뀌지 않는다.
//
// ▶ 주간 메뉴 갱신 시 실행:  node generate-og.mjs  (= npm run og)
// ─────────────────────────────────────────────────────────────
import puppeteer from "puppeteer";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { weeks } from "./src/data/index.js";
import { weekSpan, defaultWeekId } from "./src/lib/weekDates.js";
import { BRAND } from "./src/theme.js";

const CORNER_ORDER = ["Korean A", "Korean B", "Snap snack", "International A", "International B"];
const CORNER_COLOR = {
  "Korean A": BRAND.green,
  "Korean B": BRAND.green,
  "Snap snack": "#B45309",
  "International A": "#0D9488",
  "International B": "#0D9488",
};
const logoB64 = readFileSync("./public/d2sf-logo.png").toString("base64");
const FONT = "'Pretendard Variable', Pretendard, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
const PURPLE = "#7C3AED"; // 포스터 단가 보라색 박스와 연결되는 스페셜 색

// 코너 × 요일 대표메뉴(중식 첫 항목) + 단가 스페셜 여부(set.tag === "단가")
const buildRows = (week) =>
  CORNER_ORDER.map((corner) => ({
    corner,
    color: CORNER_COLOR[corner] ?? BRAND.charcoal,
    cells: week.days.map(([d, date]) => {
      const set = week.sets.find((s) => s.meal === "중식" && s.day === d && s.corner === corner);
      return { d, date, dish: set ? set.items[0]?.[0] ?? "—" : "—", special: set?.tag === "단가" };
    }),
  }));

const buildHtml = (week, rows) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1200px; height:630px; }
  body {
    font-family:${FONT}; color:${BRAND.charcoal};
    -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
    background:
      radial-gradient(820px 380px at 100% -12%, ${BRAND.greenSoft} 0%, rgba(230,244,232,0) 60%),
      radial-gradient(560px 320px at -6% 116%, ${BRAND.yellowSoft} 0%, rgba(255,244,204,0) 58%),
      #ffffff;
    overflow:hidden;
  }
  .bar { height:92px; background:${BRAND.green}; display:flex; align-items:center;
    justify-content:space-between; padding:0 44px; }
  .brand { display:flex; align-items:center; gap:16px; }
  .logo { background:#fff; border-radius:14px; padding:11px 16px; display:flex;
    box-shadow:0 8px 22px rgba(0,70,12,.26); }
  .logo img { height:34px; width:auto; display:block; }
  .brand h1 { color:#fff; font-size:27px; font-weight:800; letter-spacing:-.02em; }
  .brand p  { color:rgba(255,255,255,.72); font-size:13px; font-weight:600; margin-top:2px; }
  .wk { background:${BRAND.yellow}; color:${BRAND.yellowText}; font-weight:800;
    font-size:20px; padding:10px 22px; border-radius:999px; box-shadow:0 8px 20px rgba(122,90,0,.22); }
  .hero { display:flex; align-items:baseline; gap:13px; padding:18px 44px 12px; }
  .hero .t { font-size:30px; font-weight:800; letter-spacing:-.02em; }
  .hero .r { font-size:18px; font-weight:700; color:#a8a29e; }
  .table { padding:0 44px; display:grid; grid-template-columns:150px repeat(${week.days.length}, 1fr); gap:8px; }
  .corner { display:flex; align-items:center; gap:8px; font-size:17px; font-weight:800;
    letter-spacing:-.02em; color:#1a1a1a; padding-right:6px; }
  .corner .dot { width:9px; height:9px; border-radius:50%; flex:0 0 auto; }
  .cell { background:#fff; border:1px solid #ECEAE6; border-radius:11px; padding:8px 11px;
    box-shadow:0 2px 8px rgba(26,26,26,.04); min-width:0; }
  .cell.special { border-color:#D6BEF5; background:#FBF9FE; }
  .dhead { display:flex; align-items:center; justify-content:space-between; gap:6px; }
  .dhead .d { font-size:12px; font-weight:800; white-space:nowrap; }
  .dhead .d s { text-decoration:none; color:#bcb8b1; font-weight:600; margin-left:3px; }
  .sp { flex:0 0 auto; background:${PURPLE}; color:#fff; font-size:9.5px; font-weight:800;
    letter-spacing:.02em; padding:2px 8px; border-radius:999px; white-space:nowrap; }
  .cell .m { font-size:15px; font-weight:700; color:#1a1a1a; margin-top:4px; line-height:1.25;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .foot { position:absolute; bottom:18px; left:44px; right:44px; display:flex;
    justify-content:space-between; align-items:center; font-size:14px; font-weight:600; color:#b6b2ab; }
  .foot b { color:${BRAND.green}; }
</style></head><body>
  <div class="bar">
    <div class="brand">
      <span class="logo"><img src="data:image/png;base64,${logoB64}" alt="D2SF"/></span>
      <div><h1>카페테리아 주간 메뉴</h1><p>D2SF Cafeteria</p></div>
    </div>
    <span class="wk">${week.label}</span>
  </div>
  <div class="hero">
    <span class="t">🍱 이번 주 메뉴</span>
    <span class="r">${week.range}</span>
  </div>
  <div class="table">
    ${rows.map((r) => `
      <div class="corner"><span class="dot" style="background:${r.color}"></span>${r.corner}</div>
      ${r.cells.map((c) => `<div class="cell${c.special ? " special" : ""}">
        <div class="dhead">
          <span class="d" style="color:${r.color}">${c.d}<s>${c.date}</s></span>
          ${c.special ? `<span class="sp">Special Menu</span>` : ""}
        </div>
        <div class="m">${c.dish}</div>
      </div>`).join("")}
    `).join("")}
  </div>
  <div class="foot"><span>코너별 요일 대표메뉴</span><span><b>what2eat-d2sf.vercel.app</b></span></div>
</body></html>`;

// 로컬 시간대 기준 YYYY-MM-DD (toISOString은 UTC로 밀리므로 쓰지 않음)
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

mkdirSync("./public/og", { recursive: true });

const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

const manifest = [];
for (const week of weeks) {
  const rows = buildRows(week);
  await page.setContent(buildHtml(week, rows), { waitUntil: "load" });
  await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
  await new Promise((r) => setTimeout(r, 400));

  const file = `og/${week.id}.png`;
  await page.screenshot({ path: `./public/${file}`, clip: { x: 0, y: 0, width: 1200, height: 630 } });

  const { mon, fri } = weekSpan(week);
  manifest.push({ id: week.id, label: week.label, range: week.range, mon: ymd(mon), fri: ymd(fri), file });

  const specials = rows.flatMap((r) => r.cells).filter((c) => c.special).length;
  console.log(`  ${week.label.padEnd(9)} ${ymd(mon)}~${ymd(fri)} → public/${file} (Special ${specials}칸)`);
}
await browser.close();

// /api/og 가 오늘(KST)에 맞는 주차를 고를 때 쓰는 색인. 최신 주차가 앞.
manifest.sort((a, b) => (a.mon < b.mon ? 1 : -1));
writeFileSync("./public/og/manifest.json", JSON.stringify({ weeks: manifest }, null, 2) + "\n");

// public/og.png 는 manifest를 못 읽을 때만 쓰이는 폴백.
// 생성 시점 기준 "이번 주" 이미지를 복사해 둔다.
const fallbackId = defaultWeekId(weeks);
copyFileSync(`./public/og/${fallbackId}.png`, "./public/og.png");

console.log(`OG 생성 완료: ${manifest.length}개 주차 + manifest.json (폴백 og.png ← ${fallbackId})`);
