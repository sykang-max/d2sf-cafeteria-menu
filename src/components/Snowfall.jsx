// ─────────────────────────────────────────────────────────────
// 크리스마스 눈 내림 오버레이 (CSS 전용 · 가벼움)
//   position:fixed · inset:0 · pointer-events:none → 아래 식단표 조작을 가리지 않습니다.
//   z-30 — 페이지 배경 위, 플로팅 버튼(z-40)·채팅/모달(z-50) 아래.
//   눈송이: 은은한 아이스블루 원형 + 옅은 블루그레이 글로우(box-shadow) →
//           흰 배경·초록 헤더 양쪽에서 또렷이 보이되 본문 가독성은 유지.
//   애니메이션은 transform(translateY/translateX drift) + opacity 만 사용합니다.
//   prefers-reduced-motion: reduce → 아무것도 렌더하지 않습니다(정지·무동작).
// ─────────────────────────────────────────────────────────────
import React, { useMemo } from "react";

const rand = (a, b) => a + Math.random() * (b - a);

// 아이스블루 2색 — 크기에 따라 살짝 톤을 섞어 자연스럽게.
const FLAKE_COLORS = ["#AEC6E8", "#9DB8D8"];

export default function Snowfall({ count = 44 }) {
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
        color: FLAKE_COLORS[Math.floor(Math.random() * FLAKE_COLORS.length)],
        left: rand(0, 100), // vw %
        size: rand(2, 6), // px (살짝 다양화)
        opacity: rand(0.6, 0.9), // 흰 배경에서도 보이도록 상향
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
          8%   { opacity: var(--snow-op, 0.8); }
          92%  { opacity: var(--snow-op, 0.8); }
          100% { transform: translate3d(var(--snow-drift, 24px), 112vh, 0); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .d2sf-flake { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
      {flakes.map((f) => (
        <span
          key={f.id}
          className="d2sf-flake absolute top-0 rounded-full"
          style={{
            left: `${f.left}vw`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            backgroundColor: f.color,
            // 옅은 블루그레이 글로우 — 흰 배경에서 또렷이, 초록 헤더에서도 자연스럽게.
            boxShadow: "0 0 3px 1px rgba(90,120,160,0.5), 0 1px 2px rgba(70,100,150,0.35)",
            willChange: "transform, opacity",
            "--snow-op": f.opacity,
            "--snow-drift": `${f.drift}px`,
            animation: `d2sf-snow-fall ${f.duration}s linear ${f.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
