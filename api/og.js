// ─────────────────────────────────────────────────────────────
// /api/og — 링크 프리뷰 이미지 라우터
//   오늘(KST) 날짜가 속한 주차의 프리뷰 이미지를 반환한다.
//   주차별 이미지와 색인은 `npm run og` (generate-og.mjs)가 만든다:
//     public/og/<주차id>.png · public/og/manifest.json
//
//   웹페이지(App.jsx)와 같은 규칙으로 주차를 고르므로, 다음 주 식단을
//   미리 등록해도 그 주가 되기 전까지 프리뷰는 이번 주로 유지된다.
//     1) 오늘이 속한 주차(월~금)  2) 없으면 다가오는 가장 가까운 주차
//     3) 그것도 없으면 가장 최근 지난 주차
//
//   서버는 UTC로 도니 반드시 KST(UTC+9)로 환산해서 비교한다.
// ─────────────────────────────────────────────────────────────

const kstToday = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

// mon/fri/today 는 모두 "YYYY-MM-DD" — 사전순 비교가 곧 날짜 비교다.
export const pickWeek = (weeks, today) => {
  if (!weeks?.length) return null;

  const current = weeks.find((w) => w.mon <= today && today <= w.fri);
  if (current) return current;

  const upcoming = weeks.filter((w) => w.mon > today).sort((a, b) => (a.mon < b.mon ? -1 : 1))[0];
  if (upcoming) return upcoming;

  return weeks.filter((w) => w.fri < today).sort((a, b) => (a.fri > b.fri ? -1 : 1))[0] ?? weeks[0];
};

export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const origin = `${proto}://${host}`;

  // manifest를 못 읽으면 예전 단일 이미지(og.png)로 폴백한다.
  let file = "og.png";
  let picked = null;
  try {
    const mres = await fetch(`${origin}/og/manifest.json`);
    if (mres.ok) {
      const { weeks } = await mres.json();
      picked = pickWeek(weeks, kstToday());
      if (picked?.file) file = picked.file;
    }
  } catch {
    /* 폴백 유지 */
  }

  const r = await fetch(`${origin}/${file}`);
  if (!r.ok) {
    res.status(404).send("og image not found");
    return;
  }
  const buf = Buffer.from(await r.arrayBuffer());

  res.setHeader("Content-Type", "image/png");
  // 날짜가 바뀌면 곧 새 주차 이미지로 넘어가야 하므로 CDN 캐시는 짧게.
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=3600");
  if (picked) res.setHeader("X-Menu-Week", picked.id);
  res.status(200).send(buf);
}
