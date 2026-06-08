import React, { useState, useMemo } from "react";
import { Search, X, CalendarDays, LayoutList, Flame, Info, UtensilsCrossed, Feather, Beef } from "lucide-react";

/**
 * 지하식당 주간 식단표 — 6월 2주차 (2026.06.08~06.12)
 * 출처: 화재서초 게시판 식단표 / Slack D2SF #5_공유해요_지하식당
 * 칼로리(kcal)는 1인분 추정치이며 실제 제공량과 다를 수 있습니다.
 */

const CUISINE = { 한식: "#c2410c", 중식: "#b91c1c", 일식: "#1d4ed8", 양식: "#15803d", 분식: "#a21caf", 기타: "#57534e" };
const TAG = {
  단가: { label: "단가 10,500", color: "#7c3aed" },
  건강: { label: "건강 메뉴", color: "#15803d" },
  welgreen: { label: "Welgreen Day", color: "#16a34a" },
  월드컵: { label: "월드컵 기념", color: "#1d4ed8" },
  맛집: { label: "맛집따라잡기", color: "#ea580c" },
  수산물: { label: "수산물 DAY", color: "#0891b2" },
};
const MEALS = ["조식", "중식", "석식", "테이크아웃"];
const DAYS = [["월", "06.08"], ["화", "06.09"], ["수", "06.10"], ["목", "06.11"], ["금", "06.12"]];

const S = (meal, day, corner, price, cuisine, items, tag = null, side = false) => ({ meal, day, corner, price, cuisine, items, tag, side });

const SETS = [
  // ───────── 조식 ─────────
  S("조식","월","백반",9400,"한식",[["[뚝]쇠고기뭇국",110],["현미밥",300],["중화풍해물볶음",250],["고구마순볶음",90],["콩자반",120],["열무김치",15],["오렌지주스",110]]),
  S("조식","화","백반",9400,"한식",[["[뚝]장터국밥",480],["현미밥",300],["햄계란전",200],["멸치볶음",130],["참나물생채",40],["깍두기",20],["사과",70]]),
  S("조식","수","백반",9400,"한식",[["[뚝]바지락해장국",90],["현미밥",300],["닭고기고구마조림",260],["양념김구이",50],["양배추된장무침",50],["깍두기",20],["요거트&씨리얼",150]]),
  S("조식","목","백반",9400,"한식",[["[뚝]쑥갓어묵국",90],["현미밥",300],["파채간장불고기",350],["맛살채소볶음",130],["허브생채",40],["포기김치",15],["양상추샐러드",60]]),
  S("조식","금","백반",9400,"한식",[["[뚝]들깨버섯탕",130],["현미밥",300],["쇠고기떡볶음",320],["돌자반",70],["오이생채",30],["포기김치",15],["방울토마토",30]]),
  S("조식","월","라면코너",7700,"분식",[["참깨라면",500],["단무지",20],["포기김치",15],["반줄말이",180]]),
  S("조식","화","라면코너",7700,"분식",[["무파마라면",500],["단무지",20],["포기김치",15],["반줄말이",180]]),
  S("조식","수","라면코너",7700,"분식",[["너구리라면",500],["단무지",20],["포기김치",15],["반줄말이",180]]),
  S("조식","목","라면코너",7700,"분식",[["신라면",500],["단무지",20],["포기김치",15],["반줄말이",180]]),
  S("조식","금","라면코너",7700,"분식",[["진짬뽕",520],["단무지",20],["포기김치",15],["반줄말이",180]]),

  // ───────── 중식 ─────────
  S("중식","월","Korean A",9400,"한식",[["차돌된장찌개 / 꽁치김치찌개(택1)",200],["귀리밥",310],["고추야채전",200],["새송이버섯볶음",90],["치커리생채",40],["깍두기",20]]),
  S("중식","화","Korean A",9400,"한식",[["닭볶음탕",480],["수수밥",310],["시금치된장국",80],["잡채",250],["간장깻잎지",30],["깍두기",20]]),
  S("중식","수","Korean A",9400,"한식",[["[철판]훈제오리볶음&쌈무",450],["흑미밥",310],["얼큰콩나물국",80],["두부계란전",180],["부추무침",30],["깍두기",20]],"단가"),
  S("중식","목","Korean A",9400,"한식",[["시래기나물밥&부추양념장",480],["남도식애호박찌개",180],["파채너비아니",300],["알알이떡볶이",250],["돌나물&초장",40],["포기김치",15]],"welgreen"),
  S("중식","금","Korean A",9400,"한식",[["[뚝]황태미역국",110],["기장밥",310],["오징어초무침",150],["감자볶음",130],["고들빼기",30],["포기김치",15]]),

  S("중식","월","Korean B",9900,"한식",[["돌솥제육비빔밥",600],["어묵국",90],["오징어문어핫바",200],["마카로니샐러드",180],["치커리생채",40],["깍두기",20]]),
  S("중식","화","Korean B",9900,"한식",[["순살감자탕",520],["수수밥",310],["메추리알장조림",160],["쥐어채고추장무침",130],["간장깻잎지",30],["포기김치",15]]),
  S("중식","수","Korean B",9900,"한식",[["[뚝]즉석사부대찌개&라면사리",600],["흑미밥",310],["버섯탕수",250],["고사리볶음",90],["부추무침",30],["깍두기",20]]),
  S("중식","목","Korean B",9900,"한식",[["[뚝]병천순대국밥",550],["차조밥",310],["녹두전",230],["도토리묵무침",80],["돌나물&초장",40],["석박지",20]]),
  S("중식","금","Korean B",9900,"한식",[["우삼겹김치솥밥",620],["다시마무침국",70],["깻잎튀김",150],["누룽지샐러드",120],["고들빼기",30],["깍두기",20]],"단가"),

  S("중식","월","Snap snack",8800,"분식",[["피자로니떡볶이",400],["반죽말이",200],["버터갈릭감자튀김",300],["단무지",20],["탄산음료",100]],"맛집"),
  S("중식","화","Snap snack",8800,"한식",[["오징어젓갈볶음밥&후라이",550],["미니바지락칼국수",300],["새우커틀렛&타르타르",350],["양상추샐러드&자몽D",100],["저염김치",15]],"수산물"),
  S("중식","수","Snap snack",8800,"한식",[["냉김치말이국수",350],["김가루양념밥",350],["지짐군만두",250],["콘샐러드",120],["열무김치",15],["포기김치",15]]),
  S("중식","목","Snap snack",8800,"분식",[["해장라면(신라면)",500],["말이반죽",200],["치즈볼",220],["단무지",20],["포기김치",15]]),
  S("중식","금","Snap snack",8800,"양식",[["고사리들기름파스타",500],["양송이스프",140],["갈릭파이",200],["양배추샐러드&포도D",100],["할라피뇨",10]],"건강"),

  S("중식","월","International A",9400,"중식",[["고추잡채덮밥&꽃빵",600],["어묵국",90],["깐풍오징어볼",250],["양배추샐러드&포도D",100],["포기김치",15]]),
  S("중식","화","International A",9400,"양식",[["소불고기바질파스타",620],["부추계란국",80],["브라운브레드&버터",250],["양상추샐러드&자몽D",100],["오이피클",20],["탄산음료",100]]),
  S("중식","수","International A",9400,"일식",[["새우튀김반반카레(시금치&강황)",600],["부추계란국",80],["에그마니카츠",350],["콘샐러드",120],["깍두기",20]]),
  S("중식","목","International A",9400,"양식",[["매콤크림미트블라이스",600],["유부장국",90],["단호박튀김&소떡강정",300],["양상추샐러드&오리엔탈D",100],["할라피뇨",10]]),
  S("중식","금","International A",9400,"한식",[["고추장숯불삼겹덮밥",650],["다시마무침국",70],["고로케&케찹",280],["양배추샐러드&포도D",100],["깍두기",20]]),

  S("중식","월","International B",9900,"양식",[["치킨커틀렛정식",500],["쌀밥",300],["크림스프",140],["고구마볼",150],["양배추샐러드&포도D",100],["오이피클",20],["깍두기",20]]),
  S("중식","화","International B",9900,"양식",[["[철판]에그함박스테이크&숙주볶음",550],["흑미밥",310],["우동국",200],["감자튀김&케찹",280],["멕시칸샐러드",120],["깍두기",20]],"단가"),
  S("중식","수","International B",9900,"중식",[["중국식게살볶음밥&자장소스",620],["부추계란국",80],["라조육",450],["단무지",20],["포기김치",15]]),
  S("중식","목","International B",9900,"양식",[["후라이드치킨",500],["김가루주먹밥",350],["미니핫도그",250],["쫄면소무침",200],["치킨무",20],["탄산음료",100]],"월드컵"),
  S("중식","금","International B",9900,"중식",[["돌솥마파순두부",500],["스크램블에그밥",400],["다시마무침국",70],["유린기",350],["짜사이채무침",40],["포기김치",15]]),

  S("중식","월","추가배식대",0,"기타",[["바나나",90]],null,true),
  S("중식","화","추가배식대",0,"기타",[["옥수수버터구이",150]],null,true),
  S("중식","수","추가배식대",0,"기타",[["떠먹는요구르트",120]],null,true),
  S("중식","목","추가배식대",0,"기타",[["두부도너츠",200]],null,true),
  S("중식","금","추가배식대",0,"기타",[["탕수강정",300]],null,true),

  // ───────── 석식 ─────────
  S("석식","월","Korean B",9900,"한식",[["돌솥바싹불고기비빔밥&쌈장소스",620],["아욱된장국",80],["매콤두부조림",150],["쥐어채볶음",120],["고춧잎무침",40],["포기김치",15]]),
  S("석식","화","Korean B",9900,"일식",[["치즈돈가스&돈가스소스",550],["흑미밥",310],["크림스프",140],["단호박샐러드&드레싱",130],["양상추샐러드&드레싱",90],["깍두기",20],["푸딩",160]]),
  S("석식","수","Korean B",9900,"한식",[["[뚝]콩나물불고기&파채",450],["잡곡밥",310],["버섯맑은국",60],["모듬채소전",200],["호박볶음",80],["포기김치",15],["자몽",50]]),
  S("석식","목","Korean B",9900,"양식",[["나시고랭&계란후라이",600],["팽이버섯장국",70],["야채춘권&스위트칠리S",220],["양배추샐러드&드레싱",90],["깍두기",20],["푸딩",160]]),
  S("석식","금","Korean B",9900,"일식",[["치킨마요덮밥",650],["우동국",200],["소떡소떡",250],["양상추샐러드&드레싱",90],["깍두기",20],["파인애플",50]]),
  S("석식","월","Snap snack",8800,"분식",[["콩나물라면(진짬뽕)",500],["반줄말이",180],["갈비만두튀김",250],["단무지",20],["포기김치",15]]),
  S("석식","화","Snap snack",8800,"분식",[["치즈라면(참깨라면)",520],["반줄말이",180],["아이스홍시",80],["단무지",20],["포기김치",15]]),
  S("석식","수","Snap snack",8800,"분식",[["해물라면(오징어짬뽕)",520],["반줄말이",180],["테이터팝스&케찹",250],["단무지",20],["포기김치",15]]),
  S("석식","목","Snap snack",8800,"분식",[["토핑선택라면(신라면)",540],["반줄말이",180],["치킨너겟",280],["단무지",20],["포기김치",15]]),
  S("석식","금","Snap snack",8800,"분식",[["어묵채라면(안성탕면)",500],["반줄말이",180],["꼬마돈가스",280],["단무지",20],["포기김치",15]]),

  // ───────── 테이크아웃 (요일별 회전) ─────────
  S("테이크아웃","월","말이·컵밥",8800,"분식",[["불고기말이",280],["부대볶음컵밥",580]]),
  S("테이크아웃","화","말이·컵밥",8800,"분식",[["크랩살말이",250],["제육볶음컵밥",560]]),
  S("테이크아웃","수","말이·컵밥",8800,"분식",[["진미채말이",240],["참치마요컵밥",540]]),
  S("테이크아웃","목","말이·컵밥",8800,"분식",[["제육말이",280],["깐쇼칠리새우컵밥",560]]),
  S("테이크아웃","금","말이·컵밥",8800,"분식",[["참치마요말이",260],["베이컨고추참치컵밥",560]]),
  S("테이크아웃","월","샌드위치",8800,"양식",[["불고기버거샌드위치",450],["살라미치즈샌드위치",420]]),
  S("테이크아웃","화","샌드위치",8800,"양식",[["햄에그블럭번샌드위치",430],["참치샐러드샌드위치",400]]),
  S("테이크아웃","수","샌드위치",8800,"양식",[["더블치즈파니니",480],["BELT샌드위치",420]]),
  S("테이크아웃","목","샌드위치",8800,"양식",[["길거리토스트",400],["포테이토햄샌드위치",440]]),
  S("테이크아웃","금","샌드위치",8800,"양식",[["칠리크램파니니",470],["단호박햄치즈샌드위치",430]]),
];

const STATIC_TAKEOUT = [
  ["커리닭가슴살샐러드","양식",250,8800],["베이컨시저샐러드","양식",300,8800],["단호박훈제오리샐러드","양식",280,8800],
  ["아보카도훈제연어샐러드","양식",320,8800],["유부초밥&크림새우","일식",450,8800],["유부초밥&샌드위치세트","일식",480,8800],
  ["머슬랭팩(연어&치킨)","양식",400,9400],["케이준쿠스쿠스(헬핏)","양식",450,9400],
  ["시리얼&우유&사이드","양식",350,8800],["요거트시리얼&사이드","양식",300,8800],["올가니카&사이드","양식",300,8800],
  ["선식&사이드","한식",250,8800],["과일팩(5종)","기타",120,8800],
  ["건강죽 택1 (닭백숙/쇠고기/전복/참치/버섯야채)","한식",250,8800],
];

const sum = (items) => items.reduce((s, [, k]) => s + k, 0);
const CUISINES = ["전체", ...Object.keys(CUISINE)];

function CuisineTag({ c }) {
  return <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: CUISINE[c], backgroundColor: CUISINE[c] + "1a" }}>{c}</span>;
}

function SetCard({ s, showKcal }) {
  const total = sum(s.items);
  const t = s.tag ? TAG[s.tag] : null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-dashed border-stone-200 pb-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="text-[14px] font-bold text-stone-900">{s.corner}</h4>
            <CuisineTag c={s.cuisine} />
            {t && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: t.color }}>{t.label}</span>}
          </div>
          {s.price > 0 && <p className="mt-0.5 text-[11px] text-stone-400">{s.price.toLocaleString()}원</p>}
        </div>
        {showKcal && !s.side && <span className="shrink-0 rounded-lg bg-orange-50 px-2 py-1 font-mono text-[12px] font-bold text-orange-600">{total}<span className="text-[9px] font-normal">kcal</span></span>}
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

export default function CafeteriaMenu() {
  const [meal, setMeal] = useState("중식");
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState("전체");
  const [view, setView] = useState("day");
  const [showKcal, setShowKcal] = useState(true);

  const visible = useMemo(() => SETS.filter((s) => {
    if (s.meal !== meal) return false;
    if (cuisine !== "전체" && s.cuisine !== cuisine) return false;
    if (q) {
      const hay = (s.corner + " " + s.items.map(([n]) => n).join(" ")).toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [meal, cuisine, q]);

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
  }, [visible]);

  const staticVisible = useMemo(() => STATIC_TAKEOUT.filter(([n, c]) =>
    (cuisine === "전체" || c === cuisine) && (!q || n.toLowerCase().includes(q.toLowerCase()))
  ), [cuisine, q]);

  return (
    <div className="min-h-screen w-full" style={{ background: "linear-gradient(180deg,#FBF7EF 0%,#F4ECDD 100%)", fontFamily: "ui-sans-serif, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      <div className="mx-auto max-w-6xl px-5 py-8">
        <header className="text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-[12px] font-semibold text-orange-700">
            <UtensilsCrossed size={14} /> 지하식당 · 이번 주 밥은 뭐지
          </div>
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-stone-900">6월 2주차 식단표 🍽️</h1>
          <p className="mt-1 text-[14px] text-stone-500">2026.06.08(월) ~ 06.12(금)</p>
        </header>

        <div className="mt-5 flex justify-center gap-1.5">
          {MEALS.map((mlabel) => (
            <button key={mlabel} onClick={() => { setMeal(mlabel); setCuisine("전체"); }}
              className={`rounded-xl px-4 py-2 text-[14px] font-bold transition-all ${meal === mlabel ? "bg-stone-900 text-white shadow" : "bg-white text-stone-500 hover:bg-stone-100"}`}>
              {mlabel}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3 rounded-2xl border border-stone-200/80 bg-white/70 p-4 backdrop-blur">
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
            <Search size={16} className="text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="메뉴 검색… (예: 파스타, 순대국밥, 떡볶이)"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-stone-400" />
            {q && <button onClick={() => setQ("")}><X size={15} className="text-stone-400 hover:text-stone-600" /></button>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {CUISINES.map((c) => (
                <button key={c} onClick={() => setCuisine(c)}
                  className="rounded-full border px-3 py-1 text-[13px] font-semibold transition-all"
                  style={cuisine === c ? { backgroundColor: c === "전체" ? "#f97316" : CUISINE[c], borderColor: "transparent", color: "#fff" } : { backgroundColor: "#fff", borderColor: "#e7e1d8", color: "#78716c" }}>
                  {c}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
                <button onClick={() => setView("day")} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-semibold ${view === "day" ? "bg-stone-900 text-white" : "text-stone-500"}`}><CalendarDays size={13} />요일별</button>
                <button onClick={() => setView("corner")} className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-semibold ${view === "corner" ? "bg-stone-900 text-white" : "text-stone-500"}`}><LayoutList size={13} />코너별</button>
              </div>
              <button onClick={() => setShowKcal((x) => !x)} className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold ${showKcal ? "border-orange-300 bg-orange-50 text-orange-700" : "border-stone-200 bg-white text-stone-400"}`}>
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
                    {sets.map((s, i) => <SetCard key={i} s={s} showKcal={showKcal} />)}
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
                    {sets.map((s, i) => <SetCard key={i} s={{ ...s, corner: `${s.day}요일` }} showKcal={showKcal} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {meal === "테이크아웃" && staticVisible.length > 0 && (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white/60 p-4">
            <h3 className="text-[14px] font-bold text-stone-700">상시 운영 메뉴 <span className="text-[11px] font-normal text-stone-400">(요일 무관)</span></h3>
            <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {staticVisible.map(([n, c, k], i) => (
                <div key={i} className="flex items-center justify-between gap-2 border-b border-dashed border-stone-100 py-1">
                  <div className="flex min-w-0 items-center gap-1.5"><CuisineTag c={c} /><span className="truncate text-[13px] text-stone-700">{n}</span></div>
                  {showKcal && <span className="shrink-0 font-mono text-[11px] text-stone-300">{k}kcal</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {showKcal && meal !== "테이크아웃" && analysis.byDay.length > 0 && (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-stone-900"><Flame size={16} className="text-orange-500" /> {meal} 칼로리 분석</h3>
              <span className="text-[12px] text-stone-500">코너 평균 <strong className="font-mono text-orange-600">{analysis.avg} kcal</strong></span>
            </div>
            <p className="mt-1 text-[11.5px] text-stone-400">요일별 가장 가벼운 / 든든한 코너 (사이드·추가배식 제외)</p>
            <div className="mt-3 space-y-2">
              {analysis.byDay.map(({ day, light, heavy }) => (
                <div key={day} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span className="w-7 shrink-0 font-bold text-stone-500">{day}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-green-700"><Feather size={12} /> {light.corner} <b className="font-mono">{light.kcal}</b></span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-700"><Beef size={12} /> {heavy.corner} <b className="font-mono">{heavy.kcal}</b></span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-stone-400">※ 점심 한 끼 적정선 600–800 kcal. 수치는 1인분 추정치이며 실제 제공량과 다를 수 있습니다.</p>
          </div>
        )}

        <footer className="mt-8 flex items-start gap-2 rounded-xl border border-stone-200 bg-white/50 px-4 py-2.5 text-[11px] leading-relaxed text-stone-400">
          <Info size={13} className="mt-0.5 shrink-0" />
          출처: 화재서초 6월 2주차 식단표 · Slack D2SF #5_공유해요_지하식당 · 칼로리는 추정치 · 매주 공지로 업데이트
        </footer>
      </div>
    </div>
  );
}
