// ─────────────────────────────────────────────────────────────
// 호박 터뜨리기 전 직원 랭킹 (Supabase: supabase/halloween.sql)
//   - 사람당 1행(익명 로그인 user_id 기준), 최고 점수만 남습니다.
//   - 쓰기는 submit_halloween_score RPC 로만 가능 (점수 범위·연속 제출·마감 시각을 서버에서 검사)
// ─────────────────────────────────────────────────────────────
import { supabase, ensureAnonSession } from "./supabase.js";

const BOARD_LIMIT = 20;

/** 상위 랭킹 (최고점 내림차순, 동점이면 먼저 달성한 사람이 위) */
export async function fetchLeaderboard() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("halloween_scores")
    .select("user_id, nickname, affiliation, best_score, best_at")
    .order("best_score", { ascending: false })
    .order("best_at", { ascending: true })
    .limit(BOARD_LIMIT);
  if (error) {
    console.warn("[what2eat] 할로윈 랭킹 로드 실패:", error.message);
    return [];
  }
  // PostgREST 가 숫자를 문자열로 줄 수 있어 숫자로 강제 변환
  return (data ?? []).map((r) => ({ ...r, best_score: Number(r.best_score) || 0 }));
}

/**
 * 점수 제출 → { best, rank } (실패 시 { error })
 *   error: "closed" 이벤트 마감 · "too_fast" 연속 제출 · "unavailable" 그 밖의 실패
 */
export async function submitScore(score, { nickname, affiliation }) {
  if (!supabase) return { error: "unavailable" };
  const user = await ensureAnonSession();
  if (!user) return { error: "unavailable" };
  const { data, error } = await supabase.rpc("submit_halloween_score", {
    p_score: score,
    p_nickname: nickname,
    p_affiliation: affiliation || null,
  });
  if (error) {
    const msg = error.message || "";
    if (msg.includes("event closed")) return { error: "closed" };
    if (msg.includes("too fast")) return { error: "too_fast" };
    console.warn("[what2eat] 점수 제출 실패:", msg);
    return { error: "unavailable" };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { best: Number(row?.my_best) || score, rank: Number(row?.my_rank) || null, userId: user.id };
}

/** 랭킹 변동 실시간 구독 → 해제 함수 반환 */
export function subscribeLeaderboard(onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("halloween_scores_live")
    .on("postgres_changes", { event: "*", schema: "public", table: "halloween_scores" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** 현재 익명 세션의 user id (없으면 null, 새로 로그인하지 않음) */
export async function currentUserId() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}
