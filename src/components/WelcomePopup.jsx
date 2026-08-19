import React, { useEffect, useState } from "react";
import { Sparkles, X, Megaphone, MessageCircle, Star, Mail } from "lucide-react";
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

// ── 업데이트 공지 ──
// 방문자당 1회만 노출합니다. 새 안내를 다시 띄우고 싶으면 UPDATE_VERSION 값을 바꾸세요.
const UPDATE_VERSION = "2026-08-community-v2";
const UPDATE = {
  title: "새로워진 지하식당 메뉴 🎉",
  subtitle: "커뮤니티 기능이 추가됐어요.",
  features: [
    { Icon: MessageCircle, title: "실시간 Chat", desc: "자유대화 · 맛집리스트 · 밍글링(소모임) · 주인장께 톡톡 4가지 카드" },
    { Icon: Star, title: "한줄 리뷰 & 랭킹", desc: "식단마다 이모지로 평가하고 역대 최고 평점을 확인" },
    { Icon: Mail, title: "공지사항", desc: "업데이트 소식은 언제든 우측 편지봉투(📬)에서 확인" },
  ],
};

// 연중 주 번호 계산 (원본 스니펫 로직 유지)
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export default function WelcomePopup() {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false); // 진입/퇴장 애니메이션용
  const [mode, setMode] = useState("welcome"); // 'update' | 'welcome'
  const [message, setMessage] = useState("");

  // 마운트 시: 업데이트 공지를 아직 못 봤으면 공지 우선, 아니면 주간 인사(주 1회).
  useEffect(() => {
    try {
      // 1) 업데이트 공지 (방문자당 1회)
      if (localStorage.getItem("what2eat-update-seen") !== UPDATE_VERSION) {
        setMode("update");
        setOpen(true);
        return;
      }
      // 2) 주간 환영 인사 (주 1회)
      const week = getWeekNumber(new Date());
      if (localStorage.getItem("popupLastShownWeek") === String(week)) return;
      const idx = (((week - BASE_WEEK) % MESSAGES.length) + MESSAGES.length) % MESSAGES.length;
      setMessage(MESSAGES[idx]);
      setMode("welcome");
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
    // 업데이트 공지를 닫으면 다시 뜨지 않도록 기록 (같은 주 인사 중복 방지도 함께)
    if (mode === "update") {
      try {
        localStorage.setItem("what2eat-update-seen", UPDATE_VERSION);
        localStorage.setItem("popupLastShownWeek", String(getWeekNumber(new Date())));
      } catch {
        // 무시
      }
    }
    setShow(false);
    setTimeout(() => setOpen(false), 200); // 퇴장 애니메이션 후 언마운트
  };

  if (!open) return null;

  const isUpdate = mode === "update";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isUpdate ? "업데이트 안내" : "환영 메시지"}
      onClick={close}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ease-out"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)", opacity: show ? 1 : 0 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full rounded-2xl bg-white p-7 transition-all duration-200 ease-out ${isUpdate ? "max-w-md text-left" : "max-w-sm text-center"}`}
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

        {isUpdate ? (
          <>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-extrabold"
              style={{ backgroundColor: BRAND.yellowSoft, color: BRAND.yellowText }}
            >
              <Megaphone size={13} /> 새 기능 안내
            </span>
            <h2 className="mt-3 text-[21px] font-extrabold leading-snug tracking-tight text-stone-900">{UPDATE.title}</h2>
            <p className="mt-1 text-[14px] text-stone-500">{UPDATE.subtitle}</p>

            <ul className="mt-5 space-y-3">
              {UPDATE.features.map(({ Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: BRAND.greenSoft, color: BRAND.green }}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-extrabold text-stone-900">{title}</p>
                    <p className="text-[13px] leading-snug text-stone-500">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <button
              onClick={close}
              className="mt-6 w-full rounded-xl px-4 py-2.5 text-[14px] font-bold text-white transition-transform duration-150 ease-out active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: BRAND.green, boxShadow: "0 4px 12px -2px rgba(0,140,21,0.35)", outlineColor: BRAND.green }}
            >
              둘러보기 👀
            </button>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
