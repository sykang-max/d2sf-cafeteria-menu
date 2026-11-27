// ─────────────────────────────────────────────────────────────
// 크리스마스 눈 내림 오버레이 (CSS 전용 · 가벼움)
//   position:fixed · inset:0 · pointer-events:none → 아래 식단표 조작을 가리지 않습니다.
//   z-30 — 페이지 배경 위, 플로팅 버튼(z-40)·채팅/모달(z-50) 아래.
//   애니메이션은 transform(translateY/translateX drift) + opacity 만 사용합니다.
//   prefers-reduced-motion: reduce → 아무것도 렌더하지 않습니다(정지·무동작).
// ─────────────────────────────────────────────────────────────
import React, { useMemo } from "react";

const FLAKE_CHARS = ["❄", "❅", "❆", "•"];
const rand = (a, b) => a + Math.random() * (b - a);

export default function Snowfall({ count = 38 }) {
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
        left: rand(0, 100), // vw %
        size: rand(8, 18), // px
        opacity: rand(0.35, 0.8),
        drift: rand(-40, 40), // px 가로 흔들림
        duration: rand(9, 18), // s
        delay: -rand(0, 18), // s (이미 떨어지는 중인 것처럼 음수 지연)
      })),
    [count]
  );

  if (reduced) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <style>{`
        @keyframes d2sf-snow-fall {
          0%   { transform: translate3d(0, -12vh, 0); opacity: 0; }
          8%   { opacity: var(--snow-op, 0.7); }
          92%  { opacity: var(--snow-op, 0.7); }
          100% { transform: translate3d(var(--snow-drift, 24px), 112vh, 0); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .d2sf-flake { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
      {flakes.map((f) => (
        <span
          key={f.id}
          className="d2sf-flake absolute top-0 select-none text-white"
          style={{
            left: `${f.left}vw`,
            fontSize: `${f.size}px`,
            lineHeight: 1,
            textShadow: "0 0 1px rgba(90,120,165,0.55), 0 1px 3px rgba(70,100,150,0.35)",
            willChange: "transform, opacity",
            "--snow-op": f.opacity,
            "--snow-drift": `${f.drift}px`,
            animation: `d2sf-snow-fall ${f.duration}s linear ${f.delay}s infinite`,
          }}
        >
          {f.char}
        </span>
      ))}
    </div>
  );
}
