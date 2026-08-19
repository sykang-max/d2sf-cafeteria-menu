// ─────────────────────────────────────────────────────────────
// 공지사항 패널 (우측 슬라이드 인 / 모바일 하단 시트)
//   notices 배열을 최신순 카드로 누적 표시합니다. 팝업과 달리 상시 열람 가능.
// ─────────────────────────────────────────────────────────────
import React, { useEffect } from "react";
import { X } from "lucide-react";
import { notices, NOTICE_TAG_STYLE } from "../data/notices.js";
import { BRAND } from "../theme.js";

const CARD_SHADOW = "0 1px 2px rgba(0,140,21,0.05), 0 6px 16px -6px rgba(0,140,21,0.10)";

export default function NoticePanel({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-stretch sm:justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="공지사항"
    >
      <div
        className="flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white sm:h-full sm:max-w-sm sm:rounded-none"
        style={{ boxShadow: "0 20px 60px -12px rgba(0,0,0,0.35)", fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: BRAND.green }}>
          <h3 className="text-[15px] font-extrabold text-white">📬 공지사항</h3>
          <button onClick={onClose} aria-label="닫기" className="rounded-lg p-1 text-white/90 transition-transform active:scale-90 hover:bg-white/15">
            <X size={18} />
          </button>
        </div>

        {/* 목록 */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-stone-50/40 px-3 py-3">
          {notices.length === 0 ? (
            <p className="mt-10 text-center text-[13px] text-stone-400">아직 등록된 공지가 없어요 📭</p>
          ) : (
            notices.map((n) => {
              const ts = n.tag ? NOTICE_TAG_STYLE[n.tag] ?? { bg: "#F5F5F4", text: "#57534E" } : null;
              return (
                <article key={n.id} className="rounded-2xl border border-stone-200/70 bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    {n.pinned && <span title="고정 공지" className="text-[12px]">📌</span>}
                    {ts && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: ts.bg, color: ts.text }}>
                        {n.tag}
                      </span>
                    )}
                    <span className="text-[11px] text-stone-400">{n.date}</span>
                  </div>
                  <h4 className="text-[15px] font-extrabold leading-snug text-stone-900">{n.title}</h4>
                  {n.body && <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-stone-600">{n.body}</p>}
                </article>
              );
            })
          )}
        </div>

        <p className="border-t border-stone-100 bg-white px-4 py-2.5 text-center text-[11px] text-stone-400">
          지하식당 운영 소식을 여기에 모아둡니다.
        </p>
      </div>
    </div>
  );
}
