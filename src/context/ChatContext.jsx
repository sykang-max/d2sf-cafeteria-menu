// ─────────────────────────────────────────────────────────────
// 실시간 채팅 상태 (익명 인증 · 메시지 로드 · Realtime · 전송 · 삭제 · 정체성)
//   단일 라이브 방: 최근 메시지를 시간순으로 보여주고 Realtime 으로 실시간 추가.
//   메시지 kind(=카드/탭 구분): 'chat'(자유대화) | 'rec'(맛집리스트 카드)
//                              | 'mingle'(밍글링·소모임 카드) | 'owner'(주인장께 톡톡).
// ─────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured, ensureAnonSession } from "../lib/supabase.js";
import { loadIdentity, saveIdentity } from "../lib/nickname.js";

const ChatContext = createContext(null);

// 밍글링 컴럼(mingle_*)이 아직 없는 DB(마이그레이션 전)에서도 기존 메시지가 보이도록
// 로드는 FULL → 실패 시 BASE 로 폴백합니다. insert 반환은 항상 BASE(안전).
const SELECT_BASE = "id, user_id, nickname, affiliation, kind, body, rec_place, rec_category, rec_link, created_at";
const SELECT_FULL = SELECT_BASE + ", mingle_title, mingle_when, mingle_where, mingle_cap";
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

      let { data, error } = await supabase
        .from("chat_messages")
        .select(SELECT_FULL)
        .order("created_at", { ascending: true })
        .limit(LIMIT);
      if (error) {
        // mingle_* 컴럼이 없는 구버전 DB — 기본 컴럼만으로 다시 로드
        const res = await supabase
          .from("chat_messages")
          .select(SELECT_BASE)
          .order("created_at", { ascending: true })
          .limit(LIMIT);
        data = res.data;
      }
      if (cancelled) return;
      setMessages(data ?? []);
      setReady(true);

      channel = supabase
        .channel("chat_messages_live")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
          // 낙관적으로 먼저 넣은 행(기본 컴럼)을 Realtime 의 완전한 행으로 교체하거나 새로 추가.
          setMessages((prev) => {
            const i = prev.findIndex((m) => m.id === payload.new.id);
            if (i === -1) return [...prev, payload.new];
            const next = prev.slice();
            next[i] = payload.new;
            return next;
          });
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

  // 공통 전송. row 에 정체성/유저 붙여 insert. 반환은 기본 컴럼만 받아(구버전 DB 안전)
  // 즉시 반영하고, 구조화 필드(mingle_*)는 Realtime 완전한 행으로 교체됩니다.
  const insertRow = useCallback(async (row) => {
    if (!supabase) return { error: "not-ready" };
    const user = await ensureAnonSession();
    if (!user?.id) return { error: "no-auth" };
    setUserId(user.id);
    const id = identityRef.current;
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, nickname: id.nickname, affiliation: id.affiliation || null, ...row })
      .select(SELECT_BASE)
      .single();
    if (error) {
      console.warn("[what2eat] 채팅 전송 실패:", error.message);
      return { error: error.message };
    }
    // Realtime 이 늦을 수 있어 즉시 반영(중복은 id 로 무시).
    if (data) setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    return { ok: true };
  }, []);

  // 자유대화/주인장께 톡톡은 텍스트 메시지 — kind 로 탭(카드)을 구분합니다.
  const sendChat = useCallback(
    (text, kind = "chat") => {
      const body = (text || "").trim().slice(0, 500);
      if (!body) return Promise.resolve({ error: "empty" });
      const k = ["chat", "owner"].includes(kind) ? kind : "chat";
      return insertRow({ kind: k, body });
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

  // 밍글링(소모임) 구조화 카드 — 이벤트명(필수) + 시간/장소/인원 + 설명(body, 선택).
  const sendMingle = useCallback(
    ({ title, when, where, cap, note }) => {
      const mingle_title = (title || "").trim().slice(0, 60);
      if (!mingle_title) return Promise.resolve({ error: "no-title" });
      return insertRow({
        kind: "mingle",
        mingle_title,
        mingle_when: (when || "").trim().slice(0, 60) || null,
        mingle_where: (where || "").trim().slice(0, 60) || null,
        mingle_cap: (cap || "").trim().slice(0, 30) || null,
        body: (note || "").trim().slice(0, 500) || null,
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
    () => ({ configured: isSupabaseConfigured, ready, userId, messages, identity, updateIdentity, sendChat, sendRec, sendMingle, remove }),
    [ready, userId, messages, identity, updateIdentity, sendChat, sendRec, sendMingle, remove]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within <ChatProvider>");
  return ctx;
}
