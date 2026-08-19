// ─────────────────────────────────────────────────────────────
// 지하식당 수다방 (실시간 채팅 패널)
//   자유 대화 + 맛집 추천 카드(🚶 워크업 / 🛵 배달). 상단 필터로 맛집만 모아보기.
//   익명 닉네임 + 선택 소속 배지. 본인 메시지는 삭제 가능.
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Dices, Trash2, Footprints, Bike, UtensilsCrossed, Link2, Check } from "lucide-react";
import { useChat } from "../context/ChatContext.jsx";
import { randomNickname } from "../lib/nickname.js";
import { BRAND } from "../theme.js";

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
          {walk ? <Footprints size={12} /> : <Bike size={12} />}{walk ? "워크업" : "배달"}
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
  const { ready, userId, messages, identity, updateIdentity, sendChat, sendRec, remove } = useChat();
  const [filter, setFilter] = useState("all"); // 'all' | 'rec'
  const [text, setText] = useState("");
  const [recOpen, setRecOpen] = useState(false);
  const [rec, setRec] = useState({ place: "", category: "walk", note: "", link: "" });
  const [editId, setEditId] = useState(false);
  const [draft, setDraft] = useState({ nickname: identity.nickname, affiliation: identity.affiliation });
  const feedRef = useRef(null);

  const shown = useMemo(() => (filter === "rec" ? messages.filter((m) => m.kind === "rec") : messages), [messages, filter]);

  // 새 메시지 오면 맨 아래로 스크롤
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  const submitChat = () => { if (text.trim()) { sendChat(text); setText(""); } };
  const submitRec = () => {
    if (!rec.place.trim()) return;
    sendRec(rec);
    setRec({ place: "", category: "walk", note: "", link: "" });
    setRecOpen(false);
  };
  const saveId = () => { updateIdentity(draft); setEditId(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-stretch sm:justify-end" onClick={onClose} role="dialog" aria-modal="true" aria-label="지하식당 수다방">
      <div
        className="flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white sm:h-full sm:max-w-sm sm:rounded-none"
        style={{ boxShadow: "0 20px 60px -12px rgba(0,0,0,0.35)", fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: BRAND.green }}>
          <div>
            <h3 className="text-[15px] font-extrabold text-white">💬 지하식당 수다방</h3>
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

        {/* 필터 */}
        <div className="flex gap-1.5 border-b border-stone-100 px-3 py-2">
          {[{ id: "all", label: "전체" }, { id: "rec", label: "🍜 맛집만" }].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="rounded-full px-3 py-1 text-[12px] font-bold transition-colors"
              style={filter === f.id ? { backgroundColor: BRAND.greenSoft, color: BRAND.greenDark } : { color: "#78716c" }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* 피드 */}
        <div ref={feedRef} className="flex-1 space-y-2 overflow-y-auto bg-white px-3 py-3">
          {!ready ? (
            <p className="mt-10 text-center text-[13px] text-stone-400">불러오는 중…</p>
          ) : shown.length === 0 ? (
            <p className="mt-10 text-center text-[13px] text-stone-400">{filter === "rec" ? "아직 맛집 추천이 없어요 🍜" : "첫 메시지를 남겨보세요 👋"}</p>
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
                  {m.kind === "rec" ? <RecCard m={m} mine={mine} onDelete={remove} /> : <ChatBubble m={m} mine={mine} onDelete={remove} />}
                </div>
              );
            })
          )}
        </div>

        {/* 맛집 추천 폼 */}
        {recOpen && (
          <div className="space-y-1.5 border-t border-stone-100 bg-stone-50/70 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <UtensilsCrossed size={14} style={{ color: BRAND.green }} />
              <span className="text-[12px] font-extrabold text-stone-700">맛집 추천</span>
              <button onClick={() => setRecOpen(false)} className="ml-auto text-stone-400"><X size={14} /></button>
            </div>
            <div className="flex gap-1.5">
              {[{ id: "walk", label: "워크업", Icon: Footprints }, { id: "delivery", label: "배달", Icon: Bike }].map(({ id, label, Icon }) => (
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
        )}

        {/* 입력 */}
        <div className="flex items-center gap-1.5 border-t border-stone-100 bg-white px-3 py-2.5">
          <button onClick={() => setRecOpen((v) => !v)} title="맛집 추천" aria-label="맛집 추천"
            className="shrink-0 rounded-full border px-2.5 py-2 text-[16px] leading-none transition-transform active:scale-90"
            style={recOpen ? { borderColor: BRAND.green, backgroundColor: BRAND.greenSoft } : { borderColor: "#e7e5e4" }}>🍜</button>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitChat(); } }}
            maxLength={500} placeholder="메시지 보내기…" className="min-w-0 flex-1 rounded-full border border-stone-200 px-3.5 py-2 text-[14px] outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
          <button onClick={submitChat} disabled={!text.trim()} aria-label="보내기"
            className="shrink-0 rounded-full p-2.5 text-white transition-transform active:scale-90 disabled:opacity-40" style={{ backgroundColor: BRAND.green }}><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
