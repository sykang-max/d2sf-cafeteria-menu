import React, { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import Header from "./components/Header.jsx";
import WeeklyLunchMenu from "./components/WeeklyLunchMenu.jsx";
import WelcomePopup from "./components/WelcomePopup.jsx";
import { weeks } from "./data/index.js";

export default function App() {
  const [weekId, setWeekId] = useState(weeks[0].id);
  const week = weeks.find((w) => w.id === weekId) ?? weeks[0];

  return (
    <div className="min-h-screen bg-white">
      <WelcomePopup />
      <Header weeks={weeks} weekId={weekId} onWeekChange={setWeekId} />
      <main>
        <WeeklyLunchMenu week={week} />
      </main>
      <Analytics />
    </div>
  );
}
