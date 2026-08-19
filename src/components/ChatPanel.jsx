// ─────────────────────────────────────────────────────────────
// D2SF Chat (실시간 채팅 패널)
//   4개 카드(탭)로 구성: 💬 자유대화 · 🍜 맛집리스트 · 🤝 밍글링 · 📮 주인장께 톡톡.
//   맛집리스트(워크인/배달)·밍글링(이벤트명/시간/장소/인원)은 구조화 카드 폼,
//   자유대화·주인장께 톡톡은 자유 텍스트.
//   익명 닉네임 + 선택 소속 배지. 본인 메시지는 삭제 가능.
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Dices, Trash2, Footprints, Bike, UtensilsCrossed, Link2, Check, Users2, Clock, MapPin, Users } from "lucide-react";
import { useChat } from "../context/ChatContext.jsx";
import { randomNickname } from "../lib/nickname.js";
import { BRAND } from "../theme.js";

// 탭(카드) 정의 — id 는 메시지 kind 와 1:1. rec/mingle 탭은 구조화 폼을 씁니다.
const TABS = [
  { id: "chat", label: "자유대화", emoji: "💬", placeholder: "메시지 보내기…", empty: "첫 메시지를 남겨보세요 👋" },
  { id: "rec", label: "맛집리스트", emoji: "🍜", placeholder: "", empty: "아직 맛집 추천이 없어요 🍜" },
  { id: "mingle", label: "밍글링", emoji: "🤝", placeholder: "", empty: "함께할 소모임을 제안해보세요 🤝" },
  { id: "owner", label: "주인장께 톡톡", emoji: "📮", placeholder: "주인장에게 전할 말 (건의·문의·감사 등)", empty: "주인장에게 하고 싶은 말을 남겨보세요 📮" },
];

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const dayKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const dayLabel = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`; };
const timeLabel = (iso) => { const d = new Date(iso); const h = d.getHours(); const m = d.getMinutes(); const ap = h < 12 ? "오전" : "오후"; const hh = h % 12 || 12; return `${ap} ${hh}:${String(m).padStart(2, "0")}`; };

// 소속 배지 (있을 때만)
function AffBadge({ text }) {
  if (!text) return null;
  return <span className="rounded px-1 py-0.5 text-[10px] font-bold" style={{ backgroundColor: BRAND.yellowSoft, color: BRAND.yellowText }}>{text}</span>;
}

function RecCard({ m, mine, onDelete }) {
  const walk = m.rec_category !== "delivery";
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: BRAND.greenSoft, backgroundColor: "#fff", boxShadow: "0 2px 10px -6px rgba(0,140,21,0.25)" }}>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: walk ? BRAND.green : "#B45309" }}>
          {walk ? <Footprints size={12} /> : <Bike size={12} />}{walk ? "워크인" : "배달"}
        </span>
        <span className="text-[14px] font-extrabold text-stone-900">{m.rec_place}</span>
      </div>
      {m.body && <p className="text-[13px] leading-snug text-stone-600">{m.body}</p>}
      {m.rec_link && (
        <a href={m.rec_link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: BRAND.greenDark }}>
          <Link2 size={12} /> 링크 열기
        </a>
      )}
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-stone-400">
        <span className="font-bold text-stone-500">{m.nickname}</span>
        <AffBadge text={m.affiliation} />
        <span>· {timeLabel(m.created_at)}</span>
        {mine && <button onClick={() => onDelete(m.id)} className="ml-auto text-stone-300 hover:text-red-400" aria-label="삭제"><Trash2 size={12} /></button>}
      </div>
    </div>
  );
}

function MingleCard({ m, mine, onDelete }) {
  const rows = [
    m.mingle_when && { Icon: Clock, text: m.mingle_when },
    m.mingle_where && { Icon: MapPin, text: m.mingle_where },
    m.mingle_cap && { Icon: Users, text: m.mingle_cap },
  ].filter(Boolean);
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: BRAND.greenSoft, backgroundColor: "#fff", boxShadow: "0 2px 10px -6px rgba(0,140,21,0.25)" }}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: BRAND.green }}>
          <Users2 size={12} /> 밍글링
        </span>
        <span className="text-[14px] font-extrabold text-stone-900">{m.mingle_title}</span>
      </div>
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {rows.map(({ Icon, text }, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[12.5px] text-stone-600">
              <Icon size={13} style={{ color: BRAND.green }} /> {text}
            </span>
          ))}
        </div>
      )}
      {m.body && <p className="mt-1 text-[13px] leading-snug text-stone-600">{m.body}</p>}
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-stone-400">
        <span className="font-bold text-stone-500">{m.nickname}</span>
        <AffBadge text={m.affiliation} />
        <span>· {timeLabel(m.created_at)}</span>
        {mine && <button onClick={() => onDelete(m.id)} className="ml-auto text-stone-300 hover:text-red-400" aria-label="삭제"><Trash2 size={12} /></button>}
      </div>
    </div>
  );
}

function ChatBubble({ m, mine, onDelete }) {
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div className="mb-0.5 flex items-center gap-1 px-1 text-[10px] text-stone-400">
        {!mine && <span className="font-bold text-stone-500">{m.nickname}</span>}
        {!mine && <AffBadge text={m.affiliation} />}
        <span>{timeLabel(m.created_at)}</span>
        {mine && <button onClick={() => onDelete(m.id)} className="text-stone-300 hover:text-red-400" aria-label="삭제"><Trash2 size={11} /></button>}
      </div>
      <div
        className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[13.5px] leading-snug"
        style={mine ? { backgroundColor: BRAND.green, color: "#fff", borderBottomRightRadius: 4 } : { backgroundColor: "#F1F3F2", color: "#1A1A1A", borderBottomLeftRadius: 4 }}
      >
        {m.body}
      </div>
    </div>
  );
}

export default function ChatPanel({ onClose }) {
  const { ready, userId, messages, identity, updateIdentity, sendChat, sendRec, sendMingle, remove } = useChat();
  const [tab, setTab] = useState("chat"); // 'chat' | 'rec' | 'mingle' | 'owner'
  const [text, setText] = useState("");
  const [rec, setRec] = useState({ place: "", category: "walk", note: "", link: "" });
  const [mingle, setMingle] = useState({ title: "", when: "", where: "", cap: "", note: "" });
  const [editId, setEditId] = useState(false);
  const [draft, setDraft] = useState({ nickname: identity.nickname, affiliation: identity.affiliation });
  const feedRef = useRef(null);

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const isRec = tab === "rec";
  const isMingle = tab === "mingle";
  const shown = useMemo(() => messages.filter((m) => m.kind === tab), [messages, tab]);

  // 탭 전환/새 메시지 시 맨 아래로 스크롤
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length, tab]);

  const submitChat = () => { if (text.trim()) { sendChat(text, tab); setText(""); } };
  const submitRec = () => {
    if (!rec.place.trim()) return;
    sendRec(rec);
    setRec({ place: "", category: "walk", note: "", link: "" });
  };
  const submitMingle = () => {
    if (!mingle.title.trim()) return;
    sendMingle(mingle);
    setMingle({ title: "", when: "", where: "", cap: "", note: "" });
  };
  const saveId = () => { updateIdentity(draft); setEditId(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-stretch sm:justify-end" onClick={onClose} role="dialog" aria-modal="true" aria-label="D2SF Chat">
      <div
        className="flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white sm:h-full sm:max-w-sm sm:rounded-none"
        style={{ boxShadow: "0 20px 60px -12px rgba(0,0,0,0.35)", fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: BRAND.green }}>
          <div>
            <h3 className="text-[15px] font-extrabold text-white">💬 D2SF Chat</h3>
            <p className="text-[11px] text-white/80">점심 직전 실시간 · 익명</p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="rounded-lg p-1 text-white/90 transition-transform active:scale-90 hover:bg-white/15"><X size={18} /></button>
        </div>

        {/* 정체성 바 */}
        <div className="flex items-center gap-1.5 border-b border-stone-100 bg-stone-50/70 px-3 py-2 text-[12px]">
          {editId ? (
            <>
              <input value={draft.nickname} onChange={(e) => setDraft((d) => ({ ...d, nickname: e.target.value }))} maxLength={20} placeholder="닉네임"
                className="w-24 rounded-md border border-stone-200 px-1.5 py-1 outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
              <button onClick={() => setDraft((d) => ({ ...d, nickname: randomNickname() }))} className="rounded-md border border-stone-200 p-1 text-stone-500" aria-label="닉네임 새로">
                <Dices size={13} />
              </button>
              <input value={draft.affiliation} onChange={(e) => setDraft((d) => ({ ...d, affiliation: e.target.value }))} maxLength={20} placeholder="소속(선택)"
                className="w-24 flex-1 rounded-md border border-stone-200 px-1.5 py-1 outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
              <button onClick={saveId} className="rounded-md px-2 py-1 font-bold text-white" style={{ backgroundColor: BRAND.green }}><Check size={13} /></button>
            </>
          ) : (
            <>
              <span className="text-stone-400">나:</span>
              <span className="font-extrabold text-stone-700">{identity.nickname}</span>
              <AffBadge text={identity.affiliation} />
              <button onClick={() => { setDraft({ nickname: identity.nickname, affiliation: identity.affiliation }); setEditId(true); }} className="ml-auto font-semibold" style={{ color: BRAND.greenDark }}>
                닉네임·소속 변경
              </button>
            </>
          )}
        </div>

        {/* 탭(카드) */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-stone-100 px-3 py-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-bold transition-colors"
              style={tab === t.id ? { backgroundColor: BRAND.greenSoft, color: BRAND.greenDark } : { color: "#78716c" }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* 피드 */}
        <div ref={feedRef} className="flex-1 space-y-2 overflow-y-auto bg-white px-3 py-3">
          {!ready ? (
            <p className="mt-10 text-center text-[13px] text-stone-400">불러오는 중…</p>
          ) : shown.length === 0 ? (
            <p className="mt-10 text-center text-[13px] text-stone-400">{active.empty}</p>
          ) : (
            shown.map((m, i) => {
              const mine = m.user_id === userId;
              const showDay = i === 0 || dayKey(m.created_at) !== dayKey(shown[i - 1].created_at);
              return (
                <div key={m.id} className="space-y-2">
                  {showDay && (
                    <div className="my-1 flex items-center justify-center">
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-400">{dayLabel(m.created_at)}</span>
                    </div>
                  )}
                  {m.kind === "rec" ? (
                    <RecCard m={m} mine={mine} onDelete={remove} />
                  ) : m.kind === "mingle" && m.mingle_title ? (
                    <MingleCard m={m} mine={mine} onDelete={remove} />
                  ) : (
                    <ChatBubble m={m} mine={mine} onDelete={remove} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 입력부 — 맛집리스트/밍글링은 구조화 폼, 나머지는 텍스트 */}
        {isRec ? (
          <div className="space-y-1.5 border-t border-stone-100 bg-stone-50/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <UtensilsCrossed size={14} style={{ color: BRAND.green }} />
              <span className="text-[12px] font-extrabold text-stone-700">맛집 추천 등록</span>
            </div>
            <div className="flex gap-1.5">
              {[{ id: "walk", label: "워크인", Icon: Footprints }, { id: "delivery", label: "배달", Icon: Bike }].map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setRec((r) => ({ ...r, category: id }))} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-bold"
                  style={rec.category === id ? { borderColor: BRAND.green, backgroundColor: BRAND.greenSoft, color: BRAND.greenDark } : { borderColor: "#e7e5e4", color: "#78716c" }}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
            <input value={rec.place} onChange={(e) => setRec((r) => ({ ...r, place: e.target.value }))} maxLength={60} placeholder="가게명 (필수)"
              className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
            <input value={rec.note} onChange={(e) => setRec((r) => ({ ...r, note: e.target.value }))} maxLength={140} placeholder="한줄평 (선택) — 예: 제육 최고, 웨이팅 있음"
              className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
            <div className="flex gap-1.5">
              <input value={rec.link} onChange={(e) => setRec((r) => ({ ...r, link: e.target.value }))} maxLength={300} placeholder="링크 (선택) — 지도/배달앱"
                className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
              <button onClick={submitRec} disabled={!rec.place.trim()} className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-bold text-white disabled:opacity-40" style={{ backgroundColor: BRAND.green }}>등록</button>
            </div>
          </div>
        ) : isMingle ? (
          <div className="space-y-1.5 border-t border-stone-100 bg-stone-50/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Users2 size={14} style={{ color: BRAND.green }} />
              <span className="text-[12px] font-extrabold text-stone-700">소모임 열기</span>
            </div>
            <input value={mingle.title} onChange={(e) => setMingle((r) => ({ ...r, title: e.target.value }))} maxLength={60} placeholder="이벤트명 (필수) — 예: 목요일 점심 러닝크루"
              className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
            <div className="flex gap-1.5">
              <input value={mingle.when} onChange={(e) => setMingle((r) => ({ ...r, when: e.target.value }))} maxLength={60} placeholder="시간 — 예: 목 12:30"
                className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
              <input value={mingle.cap} onChange={(e) => setMingle((r) => ({ ...r, cap: e.target.value }))} maxLength={30} placeholder="인원 — 예: 4명"
                className="w-24 shrink-0 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
            </div>
            <input value={mingle.where} onChange={(e) => setMingle((r) => ({ ...r, where: e.target.value }))} maxLength={60} placeholder="장소 — 예: 지하 1층 로비"
              className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
            <div className="flex gap-1.5">
              <input value={mingle.note} onChange={(e) => setMingle((r) => ({ ...r, note: e.target.value }))} maxLength={140} placeholder="설명 (선택) — 준비물·참여 방법 등"
                className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
              <button onClick={submitMingle} disabled={!mingle.title.trim()} className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-bold text-white disabled:opacity-40" style={{ backgroundColor: BRAND.green }}>열기</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 border-t border-stone-100 bg-white px-3 py-2.5">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitChat(); } }}
              maxLength={500} placeholder={active.placeholder} className="min-w-0 flex-1 rounded-full border border-stone-200 px-3.5 py-2 text-[14px] outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
            <button onClick={submitChat} disabled={!text.trim()} aria-label="보내기"
              className="shrink-0 rounded-full p-2.5 text-white transition-transform active:scale-90 disabled:opacity-40" style={{ backgroundColor: BRAND.green }}><Send size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
