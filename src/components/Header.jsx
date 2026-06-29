import React from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { BRAND } from "../theme.js";

/**
 * 상단 그린 바 헤더 — D2SF 로고 + 타이틀 + 주차 선택 + 옐로우 배지.
 * 로고(회색 PNG)는 그린 바 위에서 잘 보이도록 흰색 pill 안에 넣습니다.
 * 주차가 2개 이상이면 드롭다운, 1개면 주차 라벨만 노출. 모바일/데스크탑 반응형.
 */
export default function Header({ weeks, weekId, onWeekChange }) {
  const current = weeks.find((w) => w.id === weekId) ?? weeks[0];
  const multiple = weeks.length > 1;

  return (
    <header style={{ backgroundColor: BRAND.green }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        {/* 로고 + 타이틀 */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-sm">
            <img src="/d2sf-logo.png" alt="D2SF" className="h-5 w-auto sm:h-6" />
          </span>
          <div className="leading-tight">
            <h1 className="text-[18px] font-extrabold tracking-tight text-white sm:text-[20px]">지하식당 식단표</h1>
            <p className="text-[11px] font-medium text-white/70">D2SF Cafeteria</p>
          </div>
        </div>

        {/* 주차 선택 + 옐로우 배지 */}
        <div className="flex items-center gap-2">
          <span
            className="hidden items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-extrabold sm:inline-flex"
            style={{ backgroundColor: BRAND.yellow, color: BRAND.charcoal }}
          >
            <Sparkles size={13} /> 신선한 한 끼
          </span>

          {multiple ? (
            <div className="relative">
              <select
                value={weekId}
                onChange={(e) => onWeekChange(e.target.value)}
                aria-label="주차 선택"
                className="appearance-none rounded-xl bg-white/15 py-1.5 pl-3 pr-8 text-[13px] font-bold text-white outline-none ring-1 ring-white/30 transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white"
              >
                {weeks.map((w) => (
                  <option key={w.id} value={w.id} className="text-stone-900">
                    {w.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white" />
            </div>
          ) : (
            <span className="rounded-xl bg-white/15 px-3 py-1.5 text-[13px] font-bold text-white ring-1 ring-white/30">{current.label}</span>
          )}
        </div>
      </div>
    </header>
  );
}
