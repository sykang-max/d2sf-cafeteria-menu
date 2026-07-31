import React, { useState, useMemo } from "react";
import { Analytics } from "@vercel/analytics/react";
import Header from "./components/Header.jsx";
import WeeklyLunchMenu from "./components/WeeklyLunchMenu.jsx";
import WelcomePopup from "./components/WelcomePopup.jsx";
import { weeks } from "./data/index.js";
import { defaultWeekId, weekRelation } from "./lib/weekDates.js";

export default function App() {
  // 등록 순서(weeks[0])가 아니라 "오늘 날짜가 속한 주차"를 기본으로 엽니다.
  // 다음 주 식단을 미리 등록해 둬도 이번 주가 먼저 보입니다.
  const [weekId, setWeekId] = useState(() => defaultWeekId(weeks));
  const week = weeks.find((w) => w.id === weekId) ?? weeks[0];
  const relation = useMemo(() => weekRelation(week, weeks), [week]);

  return (
    <div className="min-h-screen bg-white">
      <WelcomePopup />
      <Header weeks={weeks} weekId={weekId} onWeekChange={setWeekId} />
      <main>
        <WeeklyLunchMenu week={week} relation={relation} />
      </main>
      <Analytics />
    </div>
  );
}
