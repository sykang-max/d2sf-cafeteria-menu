import React, { useState, useMemo, useEffect } from "react";
import { Search, X, CalendarDays, CalendarCheck, LayoutList, Flame, Info, UtensilsCrossed, Feather, Beef } from "lucide-react";
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

  // 오늘 요일(브라우저 기준)을 주차 데이터의 요일 키와 매칭
  const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
  const todayKey = WEEKDAY[new Date().getDay()];
  const todayEntry = DAYS.find(([d]) => d === todayKey);
  const todayInWeek = Boolean(todayEntry);

  const [meal, setMeal] = useState("중식");
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState("전체");
  const [view, setView] = useState("today"); // 랜딩 기본 화면: 오늘의 메뉴
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
  const todaySets = visible.filter((s) => s.day === todayKey);

  // 특정 요일 하루치 칼로리 분석 (요일 헤더용) — 가장 가벼운/든든한 코너 + 평균
  const dayAnalysis = (d) => {
    const main = visible.filter((s) => !s.side && s.day === d);
    if (main.length === 0) return null;
    const ds = main.map((s) => ({ corner: s.corner, kcal: sum(s.items) }));
    const light = ds.reduce((a, b) => (b.kcal < a.kcal ? b : a));
    const heavy = ds.reduce((a, b) => (b.kcal > a.kcal ? b : a));
    const avg = Math.round(ds.reduce((a, b) => a + b.kcal, 0) / ds.length);
    return { light, heavy, avg };
  };

  const staticVisible = useMemo(
    () => STATIC_TAKEOUT.filter(([n, c]) => (cuisine === "전체" || c === cuisine) && (!q || n.toLowerCase().includes(q.toLowerCase()))),
    [STATIC_TAKEOUT, cuisine, q]
  );

  // 섹션으로 부드럽게 점프 (요일별·코너별 공용). 코너명에 공백이 있어 id용으로 치환.
  const slug = (s) => s.replace(/\s+/g, "-");
  const jumpTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // 요일 헤더에 인라인으로 들어가는 하루치 분석 칩 (kcal 켜짐 & 테이크아웃 아님 & 데이터 존재 시)
  const renderAnalysis = (a) =>
    showKcal && meal !== "테이크아웃" && a ? (
      <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 font-bold text-stone-600">
          <Flame size={12} style={{ color: BRAND.green }} /> 평균 <b className="font-mono" style={{ color: BRAND.greenDark }}>{a.avg}<span className="text-[9px] font-normal">kcal</span></b>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: BRAND.greenSoft, color: BRAND.greenDark }}>
          <Feather size={12} /> 가볍게 · {a.light.corner} <b className="font-mono">{a.light.kcal}<span className="text-[9px] font-normal">kcal</span></b>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: BRAND.yellowSoft, color: BRAND.yellowText }}>
          <Beef size={12} /> 든든하게 · {a.heavy.corner} <b className="font-mono">{a.heavy.kcal}<span className="text-[9px] font-normal">kcal</span></b>
        </span>
      </div>
    ) : null;

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
                <button onClick={() => setView("today")} className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors" style={view === "today" ? { backgroundColor: BRAND.green, color: "#fff" } : { color: "#78716c" }}>
                  <CalendarCheck size={13} />
                  오늘
                </button>
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
        ) : view === "today" ? (
          <div className="mt-5">
            {!todayInWeek ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-8 text-center" style={{ boxShadow: CARD_SHADOW }}>
                <p className="text-[15px] font-bold text-stone-700">오늘({todayKey}요일)은 식단 운영일이 아니에요 🌿</p>
                <p className="mt-1 text-[13px] text-stone-400">평일(월~금) 식단은 '요일별' 탭에서 확인하세요.</p>
                <button onClick={() => setView("day")} className="mt-4 rounded-xl px-4 py-2 text-[13px] font-bold text-white transition-transform duration-150 ease-out active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ backgroundColor: BRAND.green, outlineColor: BRAND.green }}>
                  요일별 보기
                </button>
              </div>
            ) : todaySets.length === 0 ? (
              <p className="mt-12 text-center text-[14px] text-stone-400">😢 오늘 조건에 맞는 메뉴가 없어요.</p>
            ) : (
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <h3 className="flex items-center gap-2 text-[18px] font-extrabold text-stone-900">
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-extrabold text-white" style={{ backgroundColor: BRAND.green }}>오늘</span>
                    {todayKey}요일 <span className="text-[12px] font-normal text-stone-400">{todayEntry?.[1]}</span>
                  </h3>
                  {renderAnalysis(dayAnalysis(todayKey))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {todaySets.map((s, i) => (
                    <SetCard key={i} s={s} showKcal={showKcal} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : view === "day" ? (
          <div className="mt-5 space-y-5">
            {/* 요일 바로가기 (sticky) */}
            <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-1.5 border-b border-stone-100 bg-white/90 px-1 py-2 backdrop-blur">
              {DAYS.filter(([d]) => visible.some((s) => s.day === d)).map(([d, date]) => (
                <button
                  key={d}
                  onClick={() => jumpTo(`day-${d}`)}
                  className="inline-flex items-baseline gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-[13px] font-bold text-stone-600 transition-transform duration-150 ease-out hover:border-subway-green hover:text-subway-green active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-subway-green"
                >
                  {d}
                  <span className="text-[10px] font-normal text-stone-400">{date}</span>
                </button>
              ))}
            </div>
            {DAYS.map(([d, date]) => {
              const sets = visible.filter((s) => s.day === d);
              if (sets.length === 0) return null;
              return (
                <div key={d} id={`day-${d}`} className="scroll-mt-16">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h3 className="flex items-baseline gap-2 text-[17px] font-extrabold text-stone-900">
                      {d}요일 <span className="text-[12px] font-normal text-stone-400">{date}</span>
                    </h3>
                    {renderAnalysis(dayAnalysis(d))}
                  </div>
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
            {/* 코너 바로가기 (sticky) */}
            <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-1.5 border-b border-stone-100 bg-white/90 px-1 py-2 backdrop-blur">
              {corners.filter((cn) => visible.some((s) => s.corner === cn)).map((cn) => (
                <button
                  key={cn}
                  onClick={() => jumpTo(`corner-${slug(cn)}`)}
                  className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1 text-[13px] font-bold text-stone-600 transition-transform duration-150 ease-out hover:border-subway-green hover:text-subway-green active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-subway-green"
                >
                  {cn}
                </button>
              ))}
            </div>
            {corners.map((cn) => {
              const sets = visible.filter((s) => s.corner === cn);
              if (sets.length === 0) return null;
              return (
                <div key={cn} id={`corner-${slug(cn)}`} className="scroll-mt-16">
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

        <footer className="mt-8 flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50/60 px-4 py-2.5 text-[11px] leading-relaxed text-stone-400">
          <Info size={13} className="mt-0.5 shrink-0" />
          출처: 화재서초 식단표 · Slack D2SF #5_공유해요_지하식당 · 칼로리는 추정치 · 매주 공지로 업데이트
        </footer>
      </div>
    </div>
  );
}
