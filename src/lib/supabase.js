// ─────────────────────────────────────────────────────────────
// Supabase 클라이언트 (커뮤니티 기능: 한줄 리뷰·별점 · 실시간 채팅)
//
// 환경변수(빌드 시 주입, 클라이언트 노출용이므로 VITE_ 접두사 필수):
//   VITE_SUPABASE_URL       = https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY  = eyJ...  (anon public key, RLS로 보호됨)
//
// 키가 없으면 isSupabaseConfigured=false 이고, 커뮤니티 UI는 자동으로 숨겨져
// 기존 정적 식단표는 그대로 동작합니다. (설정 가이드: docs/SUPABASE_SETUP.md)
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** URL/anon key 가 모두 채워져 있어야 커뮤니티 기능을 켭니다. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * 단일 Supabase 클라이언트 인스턴스.
 * 미설정 시 null 을 반환하여 호출부가 안전하게 no-op 처리할 수 있게 합니다.
 */
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // 익명 로그인 세션을 브라우저에 유지해 "내 표"를 식별합니다.
        storageKey: "what2eat-auth",
      },
      realtime: {
        // 리뷰가 쌓일 때 과도한 브로드캐스트를 막기 위한 완만한 이벤트 상한.
        params: { eventsPerSecond: 5 },
      },
    })
  : null;

// 익명 로그인은 동시에 여러 번 호출될 수 있으므로 진행 중 Promise 를 공유합니다.
let signInPromise = null;

/**
 * 익명 로그인 보장. 이미 세션이 있으면 그대로 사용하고, 없으면 signInAnonymously.
 * 반환: 로그인된 user 객체 (실패 시 null).
 *
 * ※ Supabase 대시보드에서 Authentication → Providers → "Anonymous sign-ins" 를
 *    활성화해야 동작합니다. (가이드 참고)
 */
export async function ensureAnonSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  if (!signInPromise) {
    signInPromise = supabase.auth
      .signInAnonymously()
      .then(({ data, error }) => {
        if (error) {
          console.warn("[what2eat] 익명 로그인 실패:", error.message);
          return null;
        }
        return data.user ?? null;
      })
      .finally(() => {
        signInPromise = null;
      });
  }
  return signInPromise;
}
