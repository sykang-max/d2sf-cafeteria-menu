// ─────────────────────────────────────────────────────────────
// 할로윈 배경 효과 — 화면 위로 호박이 떠오르고 박쥐가 가로질러 날아갑니다.
//   pointer-events:none 이라 클릭은 그대로 아래 식단표로 전달됩니다.
//   모달(z-50)·플로팅 버튼(z-40)보다 아래(z-30)에 깔려 조작을 가리지 않습니다.
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from "react";
import { drawPumpkin, drawBat } from "../lib/halloweenDraw.js";

const rand = (a, b) => a + Math.random() * (b - a);

export default function HalloweenFx() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, raf = 0, last = 0, flyers = [];

    const makeFlyer = (kind, anywhere) => {
      if (kind === "pumpkin") {
        return { kind, x: rand(0, W), y: anywhere ? rand(0, H) : H + 40, r: rand(12, 22), vx: rand(-16, 16), vy: rand(-36, -20), rot: rand(-0.4, 0.4), vr: rand(-0.6, 0.6), ph: rand(0, 6) };
      }
      const dir = Math.random() < 0.5 ? 1 : -1;
      return { kind, x: anywhere ? rand(0, W) : dir > 0 ? -40 : W + 40, y: rand(H * 0.05, H * 0.55), s: rand(11, 18), vx: dir * rand(50, 90), ph: rand(0, 6) };
    };
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 식단 글씨를 덜 가리도록 모바일은 개수를 줄입니다.
      const n = W < 640 ? 3 : 6;
      flyers = [];
      for (let i = 0; i < n; i++) flyers.push(makeFlyer("pumpkin", true));
      for (let i = 0; i < Math.ceil(n / 2); i++) flyers.push(makeFlyer("bat", true));
    };
    const frame = (ts) => {
      const dt = Math.min((ts - (last || ts)) / 1000, 0.05);
      last = ts;
      const t = ts / 1000;
      ctx.clearRect(0, 0, W, H);
      flyers.forEach((f, i) => {
        if (f.kind === "pumpkin") {
          f.x += (f.vx + Math.sin(t + f.ph) * 14) * dt;
          f.y += f.vy * dt;
          f.rot += f.vr * dt;
          if (f.y < -50 || f.x < -60 || f.x > W + 60) flyers[i] = makeFlyer("pumpkin", false);
          ctx.globalAlpha = 0.8;
          drawPumpkin(ctx, f.x, f.y, f.r, f.rot);
        } else {
          f.x += f.vx * dt;
          if (f.x < -80 || f.x > W + 80) flyers[i] = makeFlyer("bat", false);
          ctx.globalAlpha = 0.75;
          drawBat(ctx, f.x, f.y + Math.sin(t * 2 + f.ph) * 18, f.s, Math.sin(t * 14 + f.ph));
        }
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    size();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", size);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 h-full w-full" />;
}
