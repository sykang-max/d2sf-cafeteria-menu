// ─────────────────────────────────────────────────────────────
// /api/og — 링크 프리뷰 이미지 라우터
//   요청 시점의 KST(서울) 요일을 계산해, 그 요일의 점심 프리뷰 이미지
//   (public/og-<요일>.png)를 반환합니다. 주말이면 월요일 이미지로 폴백.
//   → 링크를 올리는 "그 날의 점심"이 항상 프리뷰로 노출됩니다.
//
//   요일별 이미지는 `npm run og` (generate-og.mjs) 로 주 1회 생성합니다.
// ─────────────────────────────────────────────────────────────

const KST_TO_CODE = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "mon", Sun: "mon" };

export default async function handler(req, res) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", weekday: "short" }).format(new Date());
  const code = KST_TO_CODE[weekday] || "mon";

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const base = `${proto}://${host}`;

  const fetchPng = async (c) => {
    const r = await fetch(`${base}/og-${c}.png`);
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  };

  let buf = await fetchPng(code);
  if (!buf && code !== "mon") buf = await fetchPng("mon"); // 폴백

  if (!buf) {
    res.status(404).send("og image not found");
    return;
  }

  res.setHeader("Content-Type", "image/png");
  // CDN 캐시는 짧게(요일 전환 반영) + 만료 후에도 즉시 응답(stale-while-revalidate)
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
  res.status(200).send(buf);
}
