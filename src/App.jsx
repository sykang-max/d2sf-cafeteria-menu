import React, { useState, useMemo } from "react";
import { Analytics } from "@vercel/analytics/react";
import { MessageCircle, Mail } from "lucide-react";
import { BRAND } from "./theme.js";
import Header from "./components/Header.jsx";
import WeeklyLunchMenu from "./components/WeeklyLunchMenu.jsx";
import WelcomePopup from "./components/WelcomePopup.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import NoticePanel from "./components/NoticePanel.jsx";
import { ReviewsProvider } from "./context/ReviewsContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { weeks } from "./data/index.js";
import { latestNoticeId } from "./data/notices.js";
import { defaultWeekId, weekRelation } from "./lib/weekDates.js";

const NOTICE_SEEN_KEY = "what2eat-notice-seen";

export default function App() {
  // 등록 순서(weeks[0])가 아니라 "오늘 날짜가 속한 주차"를 기본으로 엽니다.
  // 다음 주 식단을 미리 등록해 둬도 이번 주가 먼저 보입니다.
  const [weekId, setWeekId] = useState(() => defaultWeekId(weeks));
  const [chatOpen, setChatOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  // 안 읽은 공지(빨간 점): 저장된 마지막 열람 id가 최신 공지 id와 다르면 표시
  const [noticeUnread, setNoticeUnread] = useState(() => {
    try {
      return Boolean(latestNoticeId) && localStorage.getItem(NOTICE_SEEN_KEY) !== latestNoticeId;
    } catch {
      return Boolean(latestNoticeId);
    }
  });
  const week = weeks.find((w) => w.id === weekId) ?? weeks[0];
  const relation = useMemo(() => weekRelation(week, weeks), [week]);

  const openNotice = () => {
    setNoticeOpen(true);
    setNoticeUnread(false);
    try {
      if (latestNoticeId) localStorage.setItem(NOTICE_SEEN_KEY, latestNoticeId);
    } catch {
      // localStorage 비활성 시 무시
    }
  };

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
          onOpenNotice={openNotice}
          noticeUnread={noticeUnread}
        />
        <main>
          <WeeklyLunchMenu week={week} relation={relation} />
        </main>
        {/* 모바일 전용 플로팅 버튼 (우하단 한 줄, 아이콘만) — 공지 + Chat. 데스크탑은 헤더 버튼 사용 */}
        {!chatOpen && !noticeOpen && (
          <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3 sm:hidden">
            <button
              onClick={openNotice}
              aria-label="공지사항 열기"
              className="relative inline-flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-150 ease-out active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: BRAND.yellow, color: BRAND.charcoal, boxShadow: "0 12px 28px -6px rgba(0,0,0,0.28)", outlineColor: BRAND.green }}
            >
              <Mail size={20} />
              {noticeUnread && (
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full" style={{ backgroundColor: "#EF4444", boxShadow: "0 0 0 2px #fff" }} />
              )}
            </button>
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
        {noticeOpen && <NoticePanel onClose={() => setNoticeOpen(false)} />}
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
