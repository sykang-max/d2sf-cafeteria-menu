// ─────────────────────────────────────────────────────────────
// 실시간 채팅 상태 (익명 인증 · 메시지 로드 · Realtime · 전송 · 삭제 · 정체성)
//   단일 라이브 방: 최근 메시지를 시간순으로 보여주고 Realtime 으로 실시간 추가.
//   메시지 kind: 'chat'(자유 대화) | 'rec'(맛집 추천 카드).
// ─────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured, ensureAnonSession } from "../lib/supabase.js";
import { loadIdentity, saveIdentity } from "../lib/nickname.js";

const ChatContext = createContext(null);

const SELECT = "id, user_id, nickname, affiliation, kind, body, rec_place, rec_category, rec_link, created_at";
const LIMIT = 200; // 최근 메시지 로드 상한

export function ChatProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [identity, setIdentity] = useState(() => (isSupabaseConfigured ? loadIdentity() : { nickname: "", affiliation: "" }));
  const identityRef = useRef(identity);
  identityRef.current = identity;

  // 초기화: 익명 로그인 → 최근 메시지 로드 → Realtime 구독(INSERT/DELETE)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let channel = null;
    let cancelled = false;

    (async () => {
      const user = await ensureAnonSession();
      if (cancelled) return;
      setUserId(user?.id ?? null);

      const { data } = await supabase
        .from("chat_messages")
        .select(SELECT)
        .order("created_at", { ascending: true })
        .limit(LIMIT);
      if (cancelled) return;
      setMessages(data ?? []);
      setReady(true);

      channel = supabase
        .channel("chat_messages_live")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
        })
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const updateIdentity = useCallback((next) => {
    setIdentity(saveIdentity(next));
  }, []);

  // 공통 전송. row 에 정체성/유저 붙여 insert. 낙관적 반영 없이 Realtime 으로 되돌아옵니다
  // (본인 INSERT 도 구독으로 들어오므로 중복은 id 로 방지).
  const insertRow = useCallback(async (row) => {
    if (!supabase) return { error: "not-ready" };
    const user = await ensureAnonSession();
    if (!user?.id) return { error: "no-auth" };
    setUserId(user.id);
    const id = identityRef.current;
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, nickname: id.nickname, affiliation: id.affiliation || null, ...row })
      .select(SELECT)
      .single();
    if (error) {
      console.warn("[what2eat] 채팅 전송 실패:", error.message);
      return { error: error.message };
    }
    // Realtime 이 늦을 수 있어 즉시 반영(중복은 id 로 무시).
    if (data) setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    return { ok: true };
  }, []);

  const sendChat = useCallback(
    (text) => {
      const body = (text || "").trim().slice(0, 500);
      if (!body) return Promise.resolve({ error: "empty" });
      return insertRow({ kind: "chat", body });
    },
    [insertRow]
  );

  const sendRec = useCallback(
    ({ place, category, note, link }) => {
      const rec_place = (place || "").trim().slice(0, 60);
      if (!rec_place) return Promise.resolve({ error: "no-place" });
      return insertRow({
        kind: "rec",
        rec_place,
        rec_category: category === "delivery" ? "delivery" : "walk",
        body: (note || "").trim().slice(0, 500) || null,
        rec_link: (link || "").trim().slice(0, 300) || null,
      });
    },
    [insertRow]
  );

  const remove = useCallback(async (id) => {
    if (!supabase) return;
    setMessages((prev) => prev.filter((m) => m.id !== id)); // 낙관적 제거
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) console.warn("[what2eat] 삭제 실패:", error.message);
  }, []);

  const value = useMemo(
    () => ({ configured: isSupabaseConfigured, ready, userId, messages, identity, updateIdentity, sendChat, sendRec, remove }),
    [ready, userId, messages, identity, updateIdentity, sendChat, sendRec, remove]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within <ChatProvider>");
  return ctx;
}
