// ─────────────────────────────────────────────────────────────
// 크리스마스 눈 내림 오버레이 (CSS 전용 · 가벼움)
//   position:fixed · inset:0 · pointer-events:none → 아래 식단표 조작을 가리지 않습니다.
//   z-30 — 페이지 배경 위, 플로팅 버튼(z-40)·채팅/모달(z-50) 아래.
//   눈송이: 눈 결정 글리프(❄ ❆, 가끔 ✻)를 크게 렌더 + 은은한 아이스블루 색 +
//           옅은 블루그레이 text-shadow 글로우 → 흰 배경·초록 헤더 양쪽에서 또렷.
//   애니메이션은 transform(translateY/translateX drift + 느린 rotate) + opacity 만 사용.
//   prefers-reduced-motion: reduce → 아무것도 렌더하지 않습니다(정지·무동작).
// ─────────────────────────────────────────────────────────────
import React, { useMemo } from "react";

const rand = (a, b) => a + Math.random() * (b - a);

// 대부분 ❄ · ❆, 가끔 ✻ — 결정 모양이 보이게.
const FLAKE_CHARS = ["❄", "❆", "❄", "❆", "✻"];
// 아이스블루 2색 — 크기에 따라 살짝 톤을 섞어 자연스럽게.
const FLAKE_COLORS = ["#AEC6E8", "#9DB8D8"];

export default function Snowfall({ count = 24 }) {
  // 모션 줄이기 설정이면 렌더하지 않음(정적·무동작).
  const reduced = (() => {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  })();

  // 위치/크기/속도를 한 번만 생성(리렌더에도 안정적).
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        char: FLAKE_CHARS[Math.floor(Math.random() * FLAKE_CHARS.length)],
        color: FLAKE_COLORS[Math.floor(Math.random() * FLAKE_COLORS.length)],
        left: rand(0, 100), // vw %
        size: rand(12, 28), // px (크고 다양하게)
        opacity: rand(0.55, 0.9), // 흰 배경에서 결정 모양이 잘 보이게
        drift: rand(-40, 40), // px 가로 흔들림
        spin: rand(-240, 240), // deg 느린 회전
        duration: rand(10, 19), // s
        delay: -rand(0, 19), // s (이미 떨어지는 중인 것처럼 음수 지연)
      })),
    [count]
  );

  if (reduced) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <style>{`
        @keyframes d2sf-snow-fall {
          0%   { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 0; }
          8%   { opacity: var(--snow-op, 0.8); }
          92%  { opacity: var(--snow-op, 0.8); }
          100% { transform: translate3d(var(--snow-drift, 24px), 112vh, 0) rotate(var(--snow-spin, 180deg)); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .d2sf-flake { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
      {flakes.map((f) => (
        <span
          key={f.id}
          className="d2sf-flake absolute top-0 select-none leading-none"
          style={{
            left: `${f.left}vw`,
            fontSize: `${f.size}px`,
            color: f.color,
            // 옅은 블루그레이 글로우 — 흰 배경에서 또렷이, 초록 헤더에서도 자연스럽게.
            textShadow: "0 0 4px rgba(90,120,160,0.6), 0 1px 2px rgba(70,100,150,0.35)",
            willChange: "transform, opacity",
            "--snow-op": f.opacity,
            "--snow-drift": `${f.drift}px`,
            "--snow-spin": `${f.spin}deg`,
            animation: `d2sf-snow-fall ${f.duration}s linear ${f.delay}s infinite`,
          }}
        >
          {f.char}
        </span>
      ))}
    </div>
  );
}
