// ─────────────────────────────────────────────────────────────
// /api/og — 링크 프리뷰 이미지 라우터
//   주간 프리뷰 이미지(public/og.png, 코너별 요일 대표메뉴)를 반환한다.
//   짧은 CDN 캐시로 주간 갱신이 빠르게 반영되게 한다.
//   이미지는 `npm run og` (generate-og.mjs)로 주 1회 생성한다.
// ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];

  const r = await fetch(`${proto}://${host}/og.png`);
  if (!r.ok) {
    res.status(404).send("og image not found");
    return;
  }
  const buf = Buffer.from(await r.arrayBuffer());

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
  res.status(200).send(buf);
}
