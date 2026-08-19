import React, { useState, useMemo } from "react";
import { Analytics } from "@vercel/analytics/react";
import Header from "./components/Header.jsx";
import WeeklyLunchMenu from "./components/WeeklyLunchMenu.jsx";
import WelcomePopup from "./components/WelcomePopup.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import { ReviewsProvider } from "./context/ReviewsContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { weeks } from "./data/index.js";
import { defaultWeekId, weekRelation } from "./lib/weekDates.js";

export default function App() {
  // 등록 순서(weeks[0])가 아니라 "오늘 날짜가 속한 주차"를 기본으로 엽니다.
  // 다음 주 식단을 미리 등록해 둬도 이번 주가 먼저 보입니다.
  const [weekId, setWeekId] = useState(() => defaultWeekId(weeks));
  const [chatOpen, setChatOpen] = useState(false);
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
        />
        <main>
          <WeeklyLunchMenu week={week} relation={relation} />
        </main>
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
