import React, { useState, useMemo, useEffect } from "react";
import { Search, X, CalendarDays, LayoutList, Flame, Info, UtensilsCrossed, Feather, Beef } from "lucide-react";
import { CUISINE, TAG, MEALS, BRAND } from "../theme.js";

/**
 * 지하식당 주간 식단표 (프레젠테이션 컴포넌트)
 * 주차 데이터는 `week` prop으로 주입받습니다 — { id, label, range, days, sets, staticTakeout }.
 * 로직·레이아웃은 원본 그대로 유지하고, 팔레트만 써브웨이 그린·옐로우 체계로 재배색.
 */

const sum = (items) => items.reduce((s, [, k]) => s + k, 0);
const CUISINES = ["전체", ...Object.keys(CUISINE)];

// 카드의 부드러운 그린 틴트 그림자 (base → elevated 레이어링)
const CARD_SHADOW = "0 1px 2px rgba(0,140,21,0.05), 0 6px 16px -6px rgba(0,140,21,0.10)";

function CuisineTag({ c }) {
  return (
    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: CUISINE[c], backgroundColor: CUISINE[c] + "1a" }}>
      {c}
    </span>
  );
}

function SetCard({ s, showKcal }) {
  const total = sum(s.items);
  const t = s.tag ? TAG[s.tag] : null;
  return (
    <div className="rounded-2xl border border-stone-200/70 bg-white p-4 transition-transform duration-200 ease-out hover:-translate-y-0.5" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-start justify-between gap-2 border-b border-dashed border-stone-200 pb-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="text-[14px] font-extrabold text-stone-900">{s.corner}</h4>
            <CuisineTag c={s.cuisine} />
            {t && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: t.color }}>{t.label}</span>}
          </div>
          {s.price > 0 && <p className="mt-0.5 text-[11px] text-stone-400">{s.price.toLocaleString()}원</p>}
        </div>
        {showKcal && !s.side && (
          <span className="shrink-0 rounded-lg px-2 py-1 font-mono text-[12px] font-bold" style={{ backgroundColor: BRAND.greenSoft, color: BRAND.greenDark }}>
            {total}
            <span className="text-[9px] font-normal">kcal</span>
          </span>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
        {s.items.map(([n, k], i) => (
          <div key={i} className="flex items-baseline justify-between gap-2">
            <span className="text-[13.5px] text-stone-700">{n}</span>
            {showKcal && <span className="shrink-0 font-mono text-[11px] tabular-nums text-stone-300">{k}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeeklyLunchMenu({ week }) {
  const { days: DAYS, sets: SETS, staticTakeout: STATIC_TAKEOUT, range } = week;

  const [meal, setMeal] = useState("중식");
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState("전체");
  const [view, setView] = useState("day");
  const [showKcal, setShowKcal] = useState(true);

  // 주차가 바뀌면 필터를 초기화 (선택한 코너/검색어가 새 주차에 없을 수 있으므로)
  useEffect(() => {
    setQ("");
    setCuisine("전체");
  }, [week.id]);

  const visible = useMemo(
    () =>
      SETS.filter((s) => {
        if (s.meal !== meal) return false;
        if (cuisine !== "전체" && s.cuisine !== cuisine) return false;
        if (q) {
          const hay = (s.corner + " " + s.items.map(([n]) => n).join(" ")).toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [SETS, meal, cuisine, q]
  );

  const corners = [...new Set(SETS.filter((s) => s.meal === meal).map((s) => s.corner))];

  const analysis = useMemo(() => {
    const main = visible.filter((s) => !s.side);
    const byDay = DAYS.map(([d]) => {
      const ds = main.filter((s) => s.day === d).map((s) => ({ corner: s.corner, kcal: sum(s.items) }));
      if (ds.length === 0) return null;
      const light = ds.reduce((a, b) => (b.kcal < a.kcal ? b : a));
      const heavy = ds.reduce((a, b) => (b.kcal > a.kcal ? b : a));
      return { day: d, light, heavy };
    }).filter(Boolean);
    const all = main.map((s) => sum(s.items));
    const avg = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
    return { byDay, avg };
  }, [DAYS, visible]);

  const staticVisible = useMemo(
    () => STATIC_TAKEOUT.filter(([n, c]) => (cuisine === "전체" || c === cuisine) && (!q || n.toLowerCase().includes(q.toLowerCase()))),
    [STATIC_TAKEOUT, cuisine, q]
  );

  return (
    <div className="w-full bg-white" style={{ fontFamily: "'Pretendard Variable', Pretendard, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif", color: BRAND.charcoal }}>
      <div className="mx-auto max-w-6xl px-5 py-8">
        <header className="text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-bold" style={{ backgroundColor: BRAND.greenSoft, color: BRAND.green }}>
            <UtensilsCrossed size={14} /> 오늘 지하식당, 신선하게 한 끼
          </div>
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-stone-900">이번 주 식단표 🥗</h1>
          <p className="mt-1 text-[14px] text-stone-500">{range}</p>
        </header>

        <div className="mt-5 flex justify-center gap-1.5">
          {MEALS.map((mlabel) => {
            const active = meal === mlabel;
            return (
              <button
                key={mlabel}
                onClick={() => {
                  setMeal(mlabel);
                  setCuisine("전체");
                }}
                className="rounded-xl px-4 py-2 text-[14px] font-bold transition-transform duration-150 ease-out active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={active ? { backgroundColor: BRAND.green, color: "#fff", boxShadow: "0 4px 12px -2px rgba(0,140,21,0.35)", outlineColor: BRAND.green } : { backgroundColor: "#F4F4F3", color: "#78716c", outlineColor: BRAND.green }}
              >
                {mlabel}
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-3 rounded-2xl border border-stone-200/80 bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 focus-within:border-[color:var(--sw-green)]" style={{ "--sw-green": BRAND.green }}>
            <Search size={16} className="text-stone-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="메뉴 검색… (예: 파스타, 순대국밥, 떡볶이)"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-stone-400"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="검색어 지우기" className="rounded transition-transform duration-150 active:scale-90 focus-visible:outline focus-visible:outline-2" style={{ outlineColor: BRAND.green }}>
                <X size={15} className="text-stone-400 hover:text-stone-600" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {CUISINES.map((c) => {
                const active = cuisine === c;
                const activeColor = c === "전체" ? BRAND.green : CUISINE[c];
                return (
                  <button
                    key={c}
                    onClick={() => setCuisine(c)}
                    className="rounded-full border px-3 py-1 text-[13px] font-semibold transition-transform duration-150 ease-out active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                    style={active ? { backgroundColor: activeColor, borderColor: "transparent", color: "#fff", outlineColor: activeColor } : { backgroundColor: "#fff", borderColor: "#e7e5e4", color: "#78716c", outlineColor: BRAND.green }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
                <button onClick={() => setView("day")} className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors" style={view === "day" ? { backgroundColor: BRAND.green, color: "#fff" } : { color: "#78716c" }}>
                  <CalendarDays size={13} />
                  요일별
                </button>
                <button onClick={() => setView("corner")} className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors" style={view === "corner" ? { backgroundColor: BRAND.green, color: "#fff" } : { color: "#78716c" }}>
                  <LayoutList size={13} />
                  코너별
                </button>
              </div>
              <button
                onClick={() => setShowKcal((x) => !x)}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors"
                style={showKcal ? { borderColor: BRAND.green, backgroundColor: BRAND.greenSoft, color: BRAND.greenDark } : { borderColor: "#e7e5e4", backgroundColor: "#fff", color: "#a8a29e" }}
              >
                <Flame size={13} /> kcal
              </button>
            </div>
          </div>
        </div>

        {visible.length === 0 && staticVisible.length === 0 ? (
          <p className="mt-12 text-center text-[14px] text-stone-400">😢 조건에 맞는 메뉴가 없어요.</p>
        ) : view === "day" ? (
          <div className="mt-5 space-y-5">
            {DAYS.map(([d, date]) => {
              const sets = visible.filter((s) => s.day === d);
              if (sets.length === 0) return null;
              return (
                <div key={d}>
                  <h3 className="mb-2 flex items-baseline gap-2 text-[17px] font-extrabold text-stone-900">
                    {d}요일 <span className="text-[12px] font-normal text-stone-400">{date}</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sets.map((s, i) => (
                      <SetCard key={i} s={s} showKcal={showKcal} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {corners.map((cn) => {
              const sets = visible.filter((s) => s.corner === cn);
              if (sets.length === 0) return null;
              return (
                <div key={cn}>
                  <h3 className="mb-2 text-[17px] font-extrabold text-stone-900">{cn}</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sets.map((s, i) => (
                      <SetCard key={i} s={{ ...s, corner: `${s.day}요일` }} showKcal={showKcal} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {meal === "테이크아웃" && staticVisible.length > 0 && (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
            <h3 className="text-[14px] font-extrabold text-stone-700">
              상시 운영 메뉴 <span className="text-[11px] font-normal text-stone-400">(요일 무관)</span>
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {staticVisible.map(([n, c, k], i) => (
                <div key={i} className="flex items-center justify-between gap-2 border-b border-dashed border-stone-100 py-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <CuisineTag c={c} />
                    <span className="truncate text-[13px] text-stone-700">{n}</span>
                  </div>
                  {showKcal && <span className="shrink-0 font-mono text-[11px] text-stone-300">{k}kcal</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {showKcal && meal !== "테이크아웃" && analysis.byDay.length > 0 && (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold text-stone-900">
                <Flame size={16} style={{ color: BRAND.green }} /> {meal} 칼로리 분석
              </h3>
              <span className="text-[12px] text-stone-500">
                코너 평균{" "}
                <strong className="font-mono" style={{ color: BRAND.greenDark }}>
                  {analysis.avg} kcal
                </strong>
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-stone-400">요일별 가장 가벼운 / 든든한 코너 (사이드·추가배식 제외)</p>
            <div className="mt-3 space-y-2">
              {analysis.byDay.map(({ day, light, heavy }) => (
                <div key={day} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span className="w-7 shrink-0 font-bold text-stone-500">{day}</span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: BRAND.greenSoft, color: BRAND.greenDark }}>
                    <Feather size={12} /> 가볍게 · {light.corner} <b className="font-mono">{light.kcal}</b>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: BRAND.yellowSoft, color: BRAND.yellowText }}>
                    <Beef size={12} /> 든든하게 · {heavy.corner} <b className="font-mono">{heavy.kcal}</b>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-stone-400">※ 점심 한 끼 적정선 600–800 kcal. 수치는 1인분 추정치이며 실제 제공량과 다를 수 있습니다.</p>
          </div>
        )}

        <footer className="mt-8 flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2.5 text-[11px] leading-relaxed text-stone-400">
          <Info size={13} className="mt-0.5 shrink-0" />
          출처: 화재서초 식단표 · Slack D2SF #5_공유해요_지하식당 · 칼로리는 추정치 · 매주 공지로 업데이트
        </footer>
      </div>
    </div>
  );
}
