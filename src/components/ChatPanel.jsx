// ─────────────────────────────────────────────────────────────
// D2SF Chat (실시간 채팅 패널) — 자유대화 전용(단순화 버전)
//   익명 닉네임 + 선택 소속 배지. 본인 메시지는 삭제 가능.
//   데이터 레이어(ChatContext)의 rec/mingle/owner 지원은 그대로 두되,
//   패널 UI는 자유대화(kind "chat")만 노출합니다.
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Dices, Trash2, Check } from "lucide-react";
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
  const { ready, userId, messages, identity, updateIdentity, sendChat, remove } = useChat();
  const [text, setText] = useState("");
  const [editId, setEditId] = useState(false);
  const [draft, setDraft] = useState({ nickname: identity.nickname, affiliation: identity.affiliation });
  const feedRef = useRef(null);

  // 자유대화(kind "chat")만 노출
  const shown = useMemo(() => messages.filter((m) => m.kind === "chat"), [messages]);

  // 새 메시지 시 맨 아래로 스크롤
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  const submitChat = () => { if (text.trim()) { sendChat(text, "chat"); setText(""); } };
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
          <h3 className="text-[15px] font-extrabold text-white">💬 D2SF Chat</h3>
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

        {/* 피드 (자유대화) */}
        <div ref={feedRef} className="flex-1 space-y-2 overflow-y-auto bg-white px-3 py-3">
          {!ready ? (
            <p className="mt-10 text-center text-[13px] text-stone-400">불러오는 중…</p>
          ) : shown.length === 0 ? (
            <p className="mt-10 text-center text-[13px] text-stone-400">첫 메시지를 남겨보세요 👋</p>
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
                  <ChatBubble m={m} mine={mine} onDelete={remove} />
                </div>
              );
            })
          )}
        </div>

        {/* 채팅 입력창 */}
        <div className="flex items-center gap-1.5 border-t border-stone-100 bg-white px-3 py-2.5">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitChat(); } }}
            maxLength={500} placeholder="메시지 보내기…" className="min-w-0 flex-1 rounded-full border border-stone-200 px-3.5 py-2 text-[14px] outline-none focus:border-[color:var(--g)]" style={{ "--g": BRAND.green }} />
          <button onClick={submitChat} disabled={!text.trim()} aria-label="보내기"
            className="shrink-0 rounded-full p-2.5 text-white transition-transform active:scale-90 disabled:opacity-40" style={{ backgroundColor: BRAND.green }}><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
