// ─────────────────────────────────────────────────────────────
// 배포 반영 대기 — 슬랙에 링크를 던지기 전에 Vercel 배포가 끝났는지 확인한다.
//
// 왜 필요한가: push 직후 곧바로 슬랙에 올리면 슬랙 크롤러가 "예전 index.html"을
// 읽어 예전 og:image URL(r=이전커밋)을 캐시해 버린다. 그러면 버전 파라미터를
// 붙여도 새 프리뷰가 안 보인다. 그래서 사이트가 이번 커밋(OG_REV)으로
// 갱신될 때까지 기다린 뒤 알림을 보낸다.
//
// 환경변수: SITE_URL(필수), OG_REV(필수 · 커밋 해시 앞 7자)
//   (선택) DEPLOY_WAIT_SECONDS 최대 대기(기본 480), DEPLOY_POLL_SECONDS 간격(기본 15)
//
// 실패해도 항상 exit 0 — 알림 자체를 막지는 않고 경고만 남긴다.
// ─────────────────────────────────────────────────────────────
const { SITE_URL, OG_REV } = process.env;
const MAX_SECONDS = Number(process.env.DEPLOY_WAIT_SECONDS || 480);
const POLL_SECONDS = Number(process.env.DEPLOY_POLL_SECONDS || 15);

if (!SITE_URL || !OG_REV) {
  console.log("SITE_URL 또는 OG_REV 미설정 → 배포 대기를 건너뜁니다.");
  process.exit(0);
}

const needle = `/api/og?r=${OG_REV}`;
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
const started = Date.now();

console.log(`배포 반영 대기: ${SITE_URL} 에서 "${needle}" 확인 (최대 ${MAX_SECONDS}초)`);

let attempt = 0;
while ((Date.now() - started) / 1000 < MAX_SECONDS) {
  attempt += 1;
  try {
    // CDN 캐시를 피하려고 매번 다른 쿼리로 요청한다(HTML 만 확인, 응답은 버림).
    const res = await fetch(`${SITE_URL}${SITE_URL.includes("?") ? "&" : "?"}__deploycheck=${attempt}`, {
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      redirect: "follow",
    });
    if (res.ok) {
      const html = await res.text();
      if (html.includes(needle)) {
        console.log(`배포 확인 완료 (${attempt}회차, ${Math.round((Date.now() - started) / 1000)}초)`);
        process.exit(0);
      }
      const found = html.match(/\/api\/og\?r=([A-Za-z0-9._-]+)/)?.[1];
      console.log(`  ${attempt}회차 — 아직 이전 리비전${found ? `(r=${found})` : ""}`);
    } else {
      console.log(`  ${attempt}회차 — HTTP ${res.status}`);
    }
  } catch (e) {
    console.log(`  ${attempt}회차 — 요청 실패: ${e.message}`);
  }
  await sleep(POLL_SECONDS);
}

console.log(
  `⚠️ ${MAX_SECONDS}초 안에 배포가 확인되지 않았습니다 → 알림은 그대로 보냅니다.\n` +
    `   슬랙 프리뷰가 예전 이미지로 보이면 배포 완료 후 공지를 다시 올려 주세요.`,
);
