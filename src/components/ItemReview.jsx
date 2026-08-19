// ─────────────────────────────────────────────────────────────
// 메뉴 항목별 이모지 평가 + 한줄 리뷰 (5초 평가)
//   · 닫힘 상태: 대표 이모지 + 표 수 칩 (표 없으면 얙은 "평가" 버튼)
//   · 열림 상태: 🔥/👍/😐/💀 즉시 투표 + 선택적 한줄평 + 최근 한줄평
// Supabase 미설정 시 아무것도 렌더하지 않습니다.
// ─────────────────────────────────────────────────────────────
import React, { useState, useCallback } from "react";
import { EMOJIS, dominantEmoji, totalVotes, avgLabel } from "../lib/reviews.js";
import { useReviews } from "../context/ReviewsContext.jsx";
import { BRAND } from "../theme.js";

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

export default function ItemReview({ dish }) {
  const { configured, getStat, getMyVote, submit, fetchComments } = useReviews();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [comments, setComments] = useState(null); // null=미로딩

  const loadComments = useCallback(async () => {
    setComments(await fetchComments(dish));
  }, [dish, fetchComments]);

  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      if (next && comments === null) loadComments();
      return next;
    });
  }, [comments, loadComments]);

  const vote = useCallback(
    async (emojiKey) => {
      setSending(true);
      await submit(dish, emojiKey, comment);
      setSending(false);
      if (comment.trim()) {
        setComment("");
        loadComments();
      }
    },
    [dish, comment, submit, loadComments]
  );

  if (!configured) return null;

  const stat = getStat(dish);
  const myKey = getMyVote(dish);
  const dom = dominantEmoji(stat);
  const n = totalVotes(stat);

  return (
    <span className="relative inline-flex shrink-0 items-center">
      <button
        onClick={toggle}
        aria-label={`${dish} 평가`}
        aria-expanded={open}
        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold transition-transform duration-150 ease-out active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
        style={
          n > 0
            ? { backgroundColor: BRAND.greenSoft, color: BRAND.greenDark, outlineColor: BRAND.green }
            : { color: "#a8a29e", outlineColor: BRAND.green }
        }
      >
        {n > 0 ? (
          <>
            <span className="text-[12px] leading-none">{dom?.char}</span>
            <span className="font-mono tabular-nums">{n}</span>
            {myKey && <span className="text-[9px]" style={{ color: BRAND.green }}>·내표</span>}
          </>
        ) : (
          <span className="opacity-70">＋평가</span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-60 rounded-xl border border-stone-200 bg-white p-2.5 text-left"
          style={{ boxShadow: "0 8px 28px -6px rgba(0,140,21,0.20), 0 2px 6px rgba(0,0,0,0.06)" }}
        >
          <div className="mb-1 flex items-center justify-between">
            <p className="truncate text-[12px] font-extrabold text-stone-800">{dish}</p>
            {n > 0 && (
              <span className="shrink-0 text-[10px] text-stone-400">
                평균 <b className="font-mono" style={{ color: BRAND.greenDark }}>{avgLabel(stat)}</b> · {n}표
              </span>
            )}
          </div>

          <div className="flex gap-1">
            {EMOJIS.map((e) => {
              const mine = myKey === e.key;
              const c = stat?.[e.key] || 0;
              return (
                <button
                  key={e.key}
                  onClick={() => vote(e.key)}
                  disabled={sending}
                  title={e.label}
                  className="flex flex-1 flex-col items-center gap-0.5 rounded-lg border py-1.5 transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                  style={
                    mine
                      ? { borderColor: BRAND.green, backgroundColor: BRAND.greenSoft, outlineColor: BRAND.green }
                      : { borderColor: "#e7e5e4", backgroundColor: "#fff", outlineColor: BRAND.green }
                  }
                >
                  <span className="text-[18px] leading-none">{e.char}</span>
                  <span className="font-mono text-[10px] tabular-nums text-stone-400">{c}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center gap-1">
            <input
              value={comment}
              onChange={(ev) => setComment(ev.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && myKey && vote(myKey)}
              maxLength={140}
              placeholder={myKey ? "한줄평 남기기 (선택)" : "이모지를 먼저 골라 주세요"}
              className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2 py-1.5 text-[12px] outline-none focus:border-[color:var(--sw-green)]"
              style={{ "--sw-green": BRAND.green }}
            />
            <button
              onClick={() => myKey && vote(myKey)}
              disabled={!myKey || sending || !comment.trim()}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-white transition-transform duration-150 active:scale-95 disabled:opacity-40"
              style={{ backgroundColor: BRAND.green }}
            >
              등록
            </button>
          </div>

          {comments && comments.length > 0 && (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto border-t border-dashed border-stone-100 pt-2">
              {comments.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug">
                  <span className="shrink-0">{EMOJIS.find((e) => e.key === c.emoji)?.char ?? "•"}</span>
                  <span className="min-w-0 flex-1 text-stone-600">{c.comment}</span>
                  <span className="shrink-0 text-[10px] text-stone-300">{timeAgo(c.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </span>
  );
}
