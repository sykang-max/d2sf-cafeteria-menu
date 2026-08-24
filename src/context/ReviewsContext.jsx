// ─────────────────────────────────────────────────────────────
// 리뷰·별점 전역 상태 (익명 인증 · 통계 캐시 · 제출 · Realtime · 랭킹)
//
// 통계는 Postgres 뷰 menu_review_stats(dish, fire, up, meh, skull)를 통째로
// (메뉴 이름 단위, 수백 행 수준) 한 번에 읽어 메모리에 캐시하고,
// 리뷰가 바뀌면 Realtime 이벤트로 디바운스 재조회합니다.
// ─────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured, ensureAnonSession } from "../lib/supabase.js";
import { EMOJI_BY_KEY, normalizeDish, toRanking, num } from "../lib/reviews.js";

const ReviewsContext = createContext(null);

const EMPTY_STATS = {};

export function ReviewsProvider({ children }) {
  const [ready, setReady] = useState(false);         // 익명 세션 준비 완료
  const [userId, setUserId] = useState(null);
  const [statsByDish, setStatsByDish] = useState(EMPTY_STATS); // dish -> {dish,fire,up,meh,skull}
  const [myVotes, setMyVotes] = useState({});        // dish -> emojiKey
  const refetchTimer = useRef(null);

  // 통계 전체 조회 (뷰). 실패해도 앱은 계속 동작.
  const fetchStats = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("menu_review_stats").select("*");
    if (error) {
      console.warn("[what2eat] 리뷰 통계 조회 실패:", error.message);
      return;
    }
    const map = {};
    for (const row of data ?? []) map[row.dish] = row;
    setStatsByDish(map);
  }, []);

  // 내 표 조회 (dish -> emoji)
  const fetchMyVotes = useCallback(async (uid) => {
    if (!supabase || !uid) return;
    const { data, error } = await supabase
      .from("menu_reviews")
      .select("dish, emoji")
      .eq("user_id", uid);
    if (error) return;
    const map = {};
    for (const row of data ?? []) map[row.dish] = row.emoji;
    setMyVotes(map);
  }, []);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => fetchStats(), 400);
  }, [fetchStats]);

  // 초기화: 익명 로그인 → 통계/내표 로드 → Realtime 구독
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let channel = null;
    let cancelled = false;

    (async () => {
      const user = await ensureAnonSession();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      setReady(true);
      await Promise.all([fetchStats(), user?.id ? fetchMyVotes(user.id) : null]);
      if (cancelled) return;

      channel = supabase
        .channel("menu_reviews_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "menu_reviews" }, scheduleRefetch)
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchStats, fetchMyVotes, scheduleRefetch]);

  // 리뷰 제출/변경 (유저당 메뉴 1표, 재투표 시 갱신)
  const submit = useCallback(
    async (dishRaw, emojiKey, comment = "") => {
      const dish = normalizeDish(dishRaw);
      const emoji = EMOJI_BY_KEY[emojiKey];
      if (!supabase || !emoji) return { error: "not-ready" };

      const user = await ensureAnonSession();
      if (!user?.id) return { error: "no-auth" };
      setUserId(user.id);

      const cleanComment = comment.trim().slice(0, 140) || null;
      const { error } = await supabase
        .from("menu_reviews")
        .upsert(
          { user_id: user.id, dish, emoji: emojiKey, score: emoji.score, comment: cleanComment },
          { onConflict: "user_id,dish" }
        );
      if (error) {
        console.warn("[what2eat] 리뷰 제출 실패:", error.message);
        return { error: error.message };
      }

      // 낙관적 반영: 내 표를 갱신하고 통계는 재조회.
      setMyVotes((prev) => ({ ...prev, [dish]: emojiKey }));
      fetchStats();
      return { ok: true };
    },
    [fetchStats]
  );

  // 특정 메뉴의 최근 한줄평 (열람 시 지연 조회)
  const fetchComments = useCallback(async (dishRaw, limit = 6) => {
    if (!supabase) return [];
    const dish = normalizeDish(dishRaw);
    const { data, error } = await supabase
      .from("menu_reviews")
      .select("emoji, comment, created_at")
      .eq("dish", dish)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return data ?? [];
  }, []);

  // 통계를 "대표메뉴" 이름 기준으로 합산합니다. 과거 "코너 · 메뉴" 형식으로 저장된
  // 행과 "메뉴" 행을 같은 메뉴로 모아, 카드 칩과 랭킹이 항상 동일한 누적 수치를 씁니다.
  const mergedByDish = useMemo(() => {
    const merged = {};
    for (const s of Object.values(statsByDish)) {
      const raw = String(s.dish);
      const i = raw.indexOf(" · ");
      const dish = normalizeDish(i >= 0 ? raw.slice(i + 3) : raw);
      const m = merged[dish] || (merged[dish] = { dish, fire: 0, up: 0, meh: 0, skull: 0 });
      m.fire += num(s.fire);
      m.up += num(s.up);
      m.meh += num(s.meh);
      m.skull += num(s.skull);
    }
    return merged;
  }, [statsByDish]);

  const ranking = useMemo(() => toRanking(Object.values(mergedByDish)), [mergedByDish]);

  const value = useMemo(
    () => ({
      configured: isSupabaseConfigured,
      ready,
      userId,
      statsByDish,
      myVotes,
      ranking,
      submit,
      fetchComments,
      // 카드 칩도 합산 통계(대표메뉴 기준)를 사용 — 랭킹과 수치가 일치합니다.
      getStat: (dish) => mergedByDish[normalizeDish(dish)] ?? null,
      getMyVote: (dish) => myVotes[normalizeDish(dish)] ?? null,
    }),
    [ready, userId, statsByDish, mergedByDish, myVotes, ranking, submit, fetchComments]
  );

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error("useReviews must be used within <ReviewsProvider>");
  return ctx;
}
