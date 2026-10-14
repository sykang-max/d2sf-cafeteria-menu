import React, { useState, useMemo } from "react";
import { Analytics } from "@vercel/analytics/react";
import { MessageCircle } from "lucide-react";
import { BRAND } from "./theme.js";
import Header from "./components/Header.jsx";
import WeeklyLunchMenu from "./components/WeeklyLunchMenu.jsx";
import WelcomePopup from "./components/WelcomePopup.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import { ReviewsProvider } from "./context/ReviewsContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { weeks } from "./data/index.js";
import { defaultWeekId, weekRelation } from "./lib/weekDates.js";
import HalloweenFx from "./components/HalloweenFx.jsx";
import HalloweenGame from "./components/HalloweenGame.jsx";
import { isHalloweenActive, loadFxPref, saveFxPref } from "./lib/halloween.js";

export default function App() {
  // 등록 순서(weeks[0])가 아니라 "오늘 날짜가 속한 주차"를 기본으로 엽니다.
  // 다음 주 식단을 미리 등록해 둬도 이번 주가 먼저 보입니다.
  const [weekId, setWeekId] = useState(() => defaultWeekId(weeks));
  const [chatOpen, setChatOpen] = useState(false);
  // 할로윈 위크(10/26~10/31) — 기간 밖이면 효과·게임 버튼 모두 숨김
  const [halloween] = useState(() => isHalloweenActive());
  const [fxOn, setFxOn] = useState(() => loadFxPref());
  const [gameOpen, setGameOpen] = useState(false);
  const toggleFx = () => {
    setFxOn((v) => {
      saveFxPref(!v);
      return !v;
    });
  };
  const week = weeks.find((w) => w.id === weekId) ?? weeks[0];
  const relation = useMemo(() => weekRelation(week, weeks), [week]);

  return (
    <ReviewsProvider>
      <div className="min-h-screen bg-white">
        <WelcomePopup />
        <Header
          weeks={weeks}
          weekId={weekId}
          onWeekChange={setWeekId}
          chatEnabled={isSupabaseConfigured}
          onOpenChat={() => setChatOpen(true)}
          halloween={halloween}
          onOpenGame={() => setGameOpen(true)}
        />
        <main>
          <WeeklyLunchMenu week={week} relation={relation} />
        </main>
        {halloween && fxOn && <HalloweenFx />}
        {/* 모바일 전용 플로팅 버튼 (우하단, 아이콘만) — (할로윈 게임) + Chat. 데스크탑은 헤더 버튼 사용 */}
        {!chatOpen && !gameOpen && (halloween || isSupabaseConfigured) && (
          <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3 sm:hidden">
            {halloween && (
              <button
                onClick={() => setGameOpen(true)}
                aria-label="호박 게임 열기"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full text-[22px] transition-transform duration-150 ease-out active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: "#F27A1A", boxShadow: "0 12px 28px -6px rgba(242,122,26,0.55)", outlineColor: BRAND.green }}
              >
                🎃
              </button>
            )}
            {isSupabaseConfigured && (
              <button
                onClick={() => setChatOpen(true)}
                aria-label="Chat 열기"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform duration-150 ease-out active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: BRAND.green, boxShadow: "0 12px 28px -6px rgba(0,140,21,0.5)", outlineColor: BRAND.green }}
              >
                <MessageCircle size={20} />
              </button>
            )}
          </div>
        )}
        {gameOpen && <HalloweenGame onClose={() => setGameOpen(false)} fxOn={fxOn} onToggleFx={toggleFx} />}
        {chatOpen && (
          <ChatProvider>
            <ChatPanel onClose={() => setChatOpen(false)} />
          </ChatProvider>
        )}
        <Analytics />
      </div>
    </ReviewsProvider>
  );
}
