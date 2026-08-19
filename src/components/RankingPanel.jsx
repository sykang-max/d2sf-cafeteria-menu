// ─────────────────────────────────────────────────────────────
// 역대 최고 평점 식단 랭킹 (모달)
//   누적 평균 점수(1~4) 상위 식단. 최소 표 수(RANKING_MIN_VOTES) 이상만 노출.
// ─────────────────────────────────────────────────────────────
import React from "react";
import { X, Trophy } from "lucide-react";
import { EMOJIS, dominantEmoji, RANKING_MIN_VOTES } from "../lib/reviews.js";
import { useReviews } from "../context/ReviewsContext.jsx";
import { BRAND } from "../theme.js";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function RankingPanel({ open, onClose }) {
  const { ranking, ready } = useReviews();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="역대 최고 평점 식단"
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
        style={{ boxShadow: "0 20px 60px -12px rgba(0,0,0,0.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: BRAND.green }}>
          <h3 className="flex items-center gap-2 text-[16px] font-extrabold text-white">
            <Trophy size={17} style={{ color: BRAND.yellow }} /> 역대 최고 평점 식단
          </h3>
          <button onClick={onClose} aria-label="닫기" className="rounded-lg p-1 text-white/90 transition-transform active:scale-90 hover:bg-white/15">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(80vh-60px)] overflow-y-auto p-4">
          {ranking.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-[14px] font-bold text-stone-600">
                {ready ? "아직 랭킹이 없어요 🍽️" : "불러오는 중…"}
              </p>
              <p className="mt-1 text-[12px] text-stone-400">
                식단마다 이모지 평가가 {RANKING_MIN_VOTES}표 이상 쌓이면 여기 랭킹에 올라와요.
              </p>
            </div>
          ) : (
            <ol className="space-y-1.5">
              {ranking.map((r, i) => {
                const dom = dominantEmoji(r);
                return (
                  <li
                    key={r.dish}
                    className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-3 py-2"
                    style={i < 3 ? { backgroundColor: BRAND.greenSoft, borderColor: "transparent" } : undefined}
                  >
                    <span className="w-7 shrink-0 text-center text-[15px] font-extrabold" style={{ color: i < 3 ? BRAND.greenDark : "#a8a29e" }}>
                      {MEDAL[i] ?? i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-stone-800">{r.dish}</span>
                    <span className="shrink-0 text-[15px]">{dom?.char}</span>
                    <span className="shrink-0 rounded-md px-2 py-0.5 text-[12px] font-bold" style={{ backgroundColor: "#fff", color: BRAND.greenDark, border: `1px solid ${BRAND.greenSoft}` }}>
                      <span className="font-mono">{r.avg.toFixed(1)}</span>
                      <span className="ml-1 text-[10px] font-normal text-stone-400">{r.n}표</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-dashed border-stone-100 pt-3 text-[11px] text-stone-400">
            {EMOJIS.map((e) => (
              <span key={e.key} className="inline-flex items-center gap-0.5">
                {e.char} {e.label}({e.score})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
