// ─────────────────────────────────────────────────────────────
// 한줄 리뷰 · 이모지 별점 — 설정과 순수 헬퍼 (React/네트워크 의존 없음)
// ─────────────────────────────────────────────────────────────

// 이모지 4단계 평가. score 는 랭킹 평균 계산용(1~4, 높을수록 좋음).
export const EMOJIS = [
  { key: "fire", char: "🔥", label: "최고", score: 4, color: "#EA580C" },
  { key: "up", char: "👍", label: "좋아", score: 3, color: "#008C15" },
  { key: "meh", char: "😐", label: "그냥", score: 2, color: "#CA8A04" },
  { key: "skull", char: "💀", label: "별로", score: 1, color: "#57534E" },
];

export const EMOJI_BY_KEY = Object.fromEntries(EMOJIS.map((e) => [e.key, e]));
export const EMOJI_KEYS = EMOJIS.map((e) => e.key);

// 랭킹에 노출되기 위한 최소 표 수 (1표만 받아도 랭킹에 올라옵니다).
export const RANKING_MIN_VOTES = 1;

/**
 * 메뉴 이름 정규화 — 주가 바뀌어도 같은 메뉴로 누적되도록 키를 통일.
 * 앞뒤 공백 제거 + 내부 연속 공백 1칸으로 축소. (조리표기 [뚝]/[철판] 등은 유지)
 */
export const normalizeDish = (name) => String(name ?? "").trim().replace(/\s+/g, " ");

/** 통계 행 → 총 표 수 */
export const totalVotes = (stat) =>
  stat ? EMOJI_KEYS.reduce((s, k) => s + (stat[k] || 0), 0) : 0;

/** 통계 행 → 가장 많이 받은 이모지({key,char,...}) 또는 null */
export const dominantEmoji = (stat) => {
  if (!stat) return null;
  let best = null;
  for (const e of EMOJIS) {
    const c = stat[e.key] || 0;
    if (c > 0 && (!best || c > (stat[best.key] || 0))) best = e;
  }
  return best;
};

/** 평균 점수(1~4) → 소수 1자리 문자열, 표 없으면 "-" */
export const avgLabel = (stat) => {
  const n = totalVotes(stat);
  if (!n) return "-";
  const sum = EMOJIS.reduce((s, e) => s + (stat[e.key] || 0) * e.score, 0);
  return (sum / n).toFixed(1);
};

/** 통계 배열 → 랭킹 정렬(평균 desc, 동점 시 표 많은 순). 최소 표 수 필터. */
export const toRanking = (stats, minVotes = RANKING_MIN_VOTES) =>
  stats
    .map((s) => ({ ...s, n: totalVotes(s), avg: Number(avgLabel(s)) }))
    .filter((s) => s.n >= minVotes)
    .sort((a, b) => b.avg - a.avg || b.n - a.n);
