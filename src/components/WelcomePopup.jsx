import React, { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { BRAND } from "../theme.js";

// 주차별로 순환하는 환영 메시지 (한 주에 한 번만 노출)
const MESSAGES = [
  "🌸 좋은 한 주 되세요! 🌸",
  "💪 이번 주도 힘내세요!",
  "😊 행복한 한 주 보내세요!",
  "🌞 활기찬 한 주 되세요!",
  "🍀 행운 가득한 한 주 되세요!",
];

// 순환 시작 기준 주차 — 이 주차에 MESSAGES[0]이 표시되고 이후 순서대로 순환
const BASE_WEEK = 25;

// 연중 주 번호 계산 (원본 스니펫 로직 유지)
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export default function WelcomePopup() {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false); // 진입/퇴장 애니메이션용
  const [message, setMessage] = useState("");

  // 마운트 시 이번 주에 아직 안 띄웠으면 1회 노출
  useEffect(() => {
    try {
      const week = getWeekNumber(new Date());
      if (localStorage.getItem("popupLastShownWeek") === String(week)) return;
      const idx = (((week - BASE_WEEK) % MESSAGES.length) + MESSAGES.length) % MESSAGES.length;
      setMessage(MESSAGES[idx]);
      setOpen(true);
      localStorage.setItem("popupLastShownWeek", String(week));
    } catch {
      // localStorage 비활성(시크릿 모드 등) 시 조용히 무시
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setShow(true));
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => {
    setShow(false);
    setTimeout(() => setOpen(false), 200); // 퇴장 애니메이션 후 언마운트
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="환영 메시지"
      onClick={close}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ease-out"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)", opacity: show ? 1 : 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl bg-white p-7 text-center transition-all duration-200 ease-out"
        style={{
          boxShadow: "0 10px 40px -8px rgba(0,140,21,0.30)",
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0) scale(1)" : "translateY(8px) scale(0.96)",
        }}
      >
        <button
          onClick={close}
          aria-label="닫기"
          className="absolute right-3 top-3 rounded-lg p-1 text-stone-400 transition-transform duration-150 ease-out hover:text-stone-600 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: BRAND.green }}
        >
          <X size={18} />
        </button>

        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: BRAND.greenSoft, color: BRAND.green }}>
          <Sparkles size={22} />
        </div>
        <p className="text-[20px] font-extrabold leading-snug tracking-tight text-stone-900">{message}</p>
        <p className="mt-2 text-[14px] text-stone-500">방문해 주셔서 감사합니다.</p>

        <button
          onClick={close}
          className="mt-5 w-full rounded-xl px-4 py-2.5 text-[14px] font-bold text-white transition-transform duration-150 ease-out active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ backgroundColor: BRAND.green, boxShadow: "0 4px 12px -2px rgba(0,140,21,0.35)", outlineColor: BRAND.green }}
        >
          오늘도 맛있게 🍽️
        </button>
      </div>
    </div>
  );
}
