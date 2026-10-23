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
import { HALLOWEEN } from "./src/lib/halloween.js";

const CORNER_ORDER = ["Korean A", "Korean B", "Snack", "International A", "International B"];
const CORNER_COLOR = {
  "Korean A": BRAND.green,
  "Korean B": BRAND.green,
  "Snack": "#B45309",
  "International A": "#0D9488",
  "International B": "#0D9488",
};
// 표시용 코너명 → 데이터 파일에서 쓰이는 코너명 후보(과거 주차 호환).
// 데이터가 "Snack"으로 바뀌기 전 일부 주차는 "Snap snack"을 썼을 수 있어 둘 다 매칭.
const CORNER_ALIASES = {
  "Snack": ["Snack", "Snap snack"],
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
      const names = CORNER_ALIASES[corner] ?? [corner];
      const set = week.sets.find((s) => s.meal === "중식" && s.day === d && names.includes(s.corner));
      return { d, date, dish: set ? set.items[0]?.[0] ?? "—" : "—", special: set?.tag === "단가" };
    }),
  }));

// ── 할로윈 위크 스킨 ── 이벤트 기간(src/lib/halloween.js start~end)에 걸친 주차만 적용.
//   기간이 끝난 다음 주차부터는 자동으로 기본 디자인. 장식은 SVG로 그려 CI(리눅스, 이모지 폰트 없음)에서도 동일.
const overlapsHalloween = ({ mon, fri }) => {
  const s = new Date(HALLOWEEN.start), e = new Date(HALLOWEEN.end);
  const monStart = new Date(`${ymd(mon)}T00:00:00+09:00`);
  const friEnd = new Date(`${ymd(fri)}T23:59:59+09:00`);
  return monStart < e && friEnd >= s;
};
const pumpkinSvg = (size, rot = 0) => `<svg width="${size}" height="${size}" viewBox="-50 -56 100 100" style="transform:rotate(${rot}deg)">
  <ellipse cx="-21" cy="0" rx="31" ry="42" fill="#C85A0E"/><ellipse cx="21" cy="0" rx="31" ry="42" fill="#C85A0E"/>
  <ellipse cx="0" cy="0" rx="35" ry="42" fill="#F27A1A"/>
  <path d="M-4 -39 L6 -39 L10 -54 L0 -52 Z" fill="#5E7D3A"/>
  <path d="M-18 -4 L-7 -4 L-12.5 -17 Z M18 -4 L7 -4 L12.5 -17 Z" fill="#FFD36B"/>
  <path d="M-21 9 L-14 15 L-8 10 L0 17 L8 10 L14 15 L21 9 Q0 31 -21 9 Z" fill="#FFD36B"/>
</svg>`;
const batSvg = (w) => `<svg width="${w}" height="${w * 0.45}" viewBox="-60 -20 120 54">
  <path d="M0 0 Q-25 -26 -60 -12 Q-47 4 -38 8 Q-28 0 -20 10 Q-12 2 0 12 Q12 2 20 10 Q28 0 38 8 Q47 4 60 -12 Q25 -26 0 0 Z" fill="#1B1426"/>
  <ellipse cx="0" cy="4" rx="8" ry="12" fill="#1B1426"/>
</svg>`;

const HALLOWEEN_CSS = `
  body { background:
      radial-gradient(760px 360px at 100% -10%, #FDE7D3 0%, rgba(253,231,211,0) 60%),
      radial-gradient(560px 320px at -6% 116%, #FFF1DC 0%, rgba(255,241,220,0) 58%),
      #FFFCF8; }
  .stripe { height:10px; background:repeating-linear-gradient(135deg,#F27A1A 0 18px,#1B1426 18px 36px); }
  .bar { height:82px; position:relative; }
  .wk { background:#F27A1A; color:#1B0F05; display:flex; align-items:center; gap:8px; box-shadow:0 8px 20px rgba(200,90,14,.3); }
  .bats { position:absolute; left:520px; top:10px; display:flex; gap:26px; align-items:flex-start; opacity:.9; }
  .bats svg:nth-child(2) { margin-top:22px; }
  .hero { justify-content:space-between; align-items:center; }
  .hero .l { display:flex; align-items:baseline; gap:13px; }
  .hero .t { display:flex; align-items:center; gap:8px; }
  .event { display:flex; align-items:center; gap:10px; background:#1B1426; color:#F1EADF; border-radius:999px;
    padding:7px 18px 7px 10px; font-size:15px; font-weight:800; box-shadow:0 8px 20px rgba(27,20,38,.25); }
  .event em { font-style:normal; color:#FFD36B; }
  .event small { font-size:13px; font-weight:600; color:#A899BB; }
  .foot b { color:#C85A0E; }
  .deco { position:absolute; opacity:.95; }
`;

const buildHtml = (week, rows, hw = false) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
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
  ${hw ? HALLOWEEN_CSS : ""}
</style></head><body>
  ${hw ? `<div class="stripe"></div>` : ""}
  <div class="bar">
    <div class="brand">
      <span class="logo"><img src="data:image/png;base64,${logoB64}" alt="D2SF"/></span>
      <div><h1>카페테리아 주간 메뉴</h1><p>D2SF Cafeteria</p></div>
    </div>
    ${hw ? `<div class="bats">${batSvg(54)}${batSvg(40)}${batSvg(48)}</div>` : ""}
    <span class="wk">${hw ? pumpkinSvg(26) : ""}${week.label}</span>
  </div>
  ${hw ? `<div class="hero">
    <div class="l">
      <span class="t">${pumpkinSvg(34, -8)} 할로윈 위크 메뉴</span>
      <span class="r">${week.range}</span>
    </div>
    <span class="event">${pumpkinSvg(24, 6)}<em>호박 터뜨리기</em> 랭킹전 <small>10/29(목) 12:00 마감</small></span>
  </div>` : `<div class="hero">
    <span class="t">🍱 이번 주 메뉴</span>
    <span class="r">${week.range}</span>
  </div>`}
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
  <div class="foot"><span>코너별 요일 대표메뉴${hw ? " · 메뉴 페이지에서 호박 게임 진행 중" : ""}</span><span><b>what2eat-d2sf.vercel.app</b></span></div>
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
  const hw = overlapsHalloween(weekSpan(week));
  await page.setContent(buildHtml(week, rows, hw), { waitUntil: "load" });
  await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
  await new Promise((r) => setTimeout(r, 400));

  const file = `og/${week.id}.png`;
  await page.screenshot({ path: `./public/${file}`, clip: { x: 0, y: 0, width: 1200, height: 630 } });

  const { mon, fri } = weekSpan(week);
  manifest.push({ id: week.id, label: week.label, range: week.range, mon: ymd(mon), fri: ymd(fri), file });

  const specials = rows.flatMap((r) => r.cells).filter((c) => c.special).length;
  console.log(`  ${week.label.padEnd(9)} ${ymd(mon)}~${ymd(fri)} → public/${file} (Special ${specials}칸)${hw ? " 🎃" : ""}`);
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

// index.html 의 og:image/twitter:image 캐시버스터를 자동 갱신.
// 손으로 ?r= 숫자를 올릴 필요 없이, OG 재생성마다 새 토큰으로 교체한다.
// 토큰 = 최신 주차 id + base36 타임스탬프 (주마다 그리고 재생성마다 바뀜).
const ogToken = `${weeks[0].id}-${Date.now().toString(36)}`;
const html = readFileSync("./index.html", "utf8").replace(
  /https:\/\/what2eat-d2sf\.vercel\.app\/api\/og\?[^"]*/g,
  `https://what2eat-d2sf.vercel.app/api/og?v=${ogToken}`,
);
writeFileSync("./index.html", html);
console.log(`OG 캐시버스터 갱신: /api/og?v=${ogToken}`);
