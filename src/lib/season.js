// ─────────────────────────────────────────────────────────────
// 크리스마스 시즌 게이트
//   기간: [2026-11-27 00:00 KST, 2027-01-01 00:00 KST)
//   epoch(ms) 비교로 판정하므로 사용자의 로컬 타임존과 무관하게 동작합니다.
//   2027-01-01 이후에는 자동으로 false → 재배포 없이 효과가 꺼집니다.
//   미리보기: 주소 뒤에 ?xmas=1 (강제 켜기) / ?xmas=0 (강제 끄기)
// ─────────────────────────────────────────────────────────────

const START = Date.parse("2026-11-27T00:00:00+09:00");
const END = Date.parse("2027-01-01T00:00:00+09:00");

/** 지금이 크리스마스 시즌(KST 11/27~12/31)인지 — URL ?xmas=1|0 으로 덮어쓰기 가능 */
export function isChristmasSeason() {
  try {
    const q = new URLSearchParams(window.location.search).get("xmas");
    if (q === "1") return true;
    if (q === "0") return false;
  } catch {
    // SSR/샌드박스 등 window 없음 → 날짜로만 판정
  }
  const t = Date.now();
  return t >= START && t < END;
}
