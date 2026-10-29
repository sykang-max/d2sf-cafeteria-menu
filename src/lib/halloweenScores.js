// ─────────────────────────────────────────────────────────────
// 호박 터뜨리기 전 직원 랭킹 (Supabase: supabase/halloween.sql)
//   - DB 는 브라우저(익명 로그인 user_id)당 1행, 최고 점수만 남습니다.
//   - 화면 랭킹은 "닉네임 · 소속"이 같으면 한 사람으로 보고 최고 점수 1개만 보여줍니다.
//     (같은 사람이 PC·휴대폰에서 각각 하면 DB 에는 2행이지만 랭킹에는 1줄)
//   - 쓰기는 submit_halloween_score RPC 로만 가능 (점수 범위·연속 제출·마감 시각을 서버에서 검사)
// ─────────────────────────────────────────────────────────────
import { supabase, ensureAnonSession } from "./supabase.js";

const FETCH_LIMIT = 1000; // 전 직원 규모라 전체를 받아 화면에서 합칩니다

/** 같은 사람 판정 키: 앞뒤·중복 공백과 대소문자 차이는 무시 */
const personKey = (r) =>
  [r.nickname, r.affiliation || ""].map((s) => s.trim().replace(/\s+/g, " ").toLowerCase()).join("\u0000");

/**
 * 전체 랭킹 (최고점 내림차순), 닉네임·소속 기준 1인 1줄.
 * 각 줄의 userIds 에는 합쳐진 모든 user_id 가 들어 있어 "나" 표시에 씁니다.
 * rank 는 공동 순위 (같은 점수면 같은 순위 · 1,1,1,4 …). 목록 순서는 먼저 달성한 사람이 위.
 */
export async function fetchLeaderboard() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("halloween_scores")
    .select("user_id, nickname, affiliation, best_score, best_at")
    .order("best_score", { ascending: false })
    .order("best_at", { ascending: true })
    .limit(FETCH_LIMIT);
  if (error) {
    console.warn("[what2eat] 할로윈 랭킹 로드 실패:", error.message);
    return [];
  }
  // 정렬된 순서대로 처음 나온 행이 그 사람의 최고 기록
  const byPerson = new Map();
  for (const raw of data ?? []) {
    // PostgREST 가 숫자를 문자열로 줄 수 있어 숫자로 강제 변환
    const r = { ...raw, best_score: Number(raw.best_score) || 0 };
    const key = personKey(r);
    const hit = byPerson.get(key);
    if (hit) hit.userIds.push(r.user_id);
    else byPerson.set(key, { ...r, userIds: [r.user_id] });
  }
  const list = [...byPerson.values()];
  list.forEach((r, i) => {
    r.rank = i > 0 && r.best_score === list[i - 1].best_score ? list[i - 1].rank : i + 1;
  });
  return list;
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
