// ─────────────────────────────────────────────────────────────
// 우하단 플로팅 "수다방" 버튼 → 열 때만 ChatProvider/패널을 마운트(지연 로딩).
// Supabase 미설정 시 렌더하지 않습니다.
// ─────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabase.js";
import { ChatProvider } from "../context/ChatContext.jsx";
import ChatPanel from "./ChatPanel.jsx";
import { BRAND } from "../theme.js";

export default function ChatLauncher() {
  const [open, setOpen] = useState(false);
  if (!isSupabaseConfigured) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="수다방 열기"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-white transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ backgroundColor: BRAND.green, boxShadow: "0 8px 24px -6px rgba(0,140,21,0.5)", outlineColor: BRAND.green }}
        >
          <MessageCircle size={20} />
          <span className="text-[14px] font-bold">수다방</span>
        </button>
      )}
      {open && (
        <ChatProvider>
          <ChatPanel onClose={() => setOpen(false)} />
        </ChatProvider>
      )}
    </>
  );
}
