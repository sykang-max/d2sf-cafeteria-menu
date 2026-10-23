// ─────────────────────────────────────────────────────────────
// 호박 터뜨리기 게임 엔진 (React 밖에서 캔버스를 직접 그립니다)
//   호박 +1 · 황금 호박 +5 · 유령 −3, 제한시간 동안 아래에서 위로 떠오릅니다.
//   매 프레임 setState 를 피하려고 점수/시간은 onHud 콜백으로만 넘깁니다.
// ─────────────────────────────────────────────────────────────
import { drawPumpkin, drawGhost } from "./halloweenDraw.js";

const rand = (a, b) => a + Math.random() * (b - a);
const VALUE = { pumpkin: 1, gold: 5, ghost: -3 };

export function createPumpkinGame(canvas, { seconds, onHud, onEnd }) {
  const g = canvas.getContext("2d");
  let W = 0, H = 0;
  let items = [], pops = [], score = 0, timeLeft = seconds, spawnAcc = 0;
  let running = false, raf = 0, last = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!running) drawIdle();
  };

  const spawn = () => {
    const roll = Math.random();
    const type = roll < 0.08 ? "gold" : roll < 0.26 ? "ghost" : "pumpkin";
    const r = Math.max(20, Math.min(34, W / 16)) * (type === "gold" ? 0.85 : 1);
    // 화면을 가로지르는 시간(초): 일반 2.4~3.6초, 황금 호박은 절반(1.2~1.8초)에 옆으로도 더 크게 흔들립니다
    const gold = type === "gold";
    const travel = rand(2.4, 3.6) * (gold ? 0.5 : 1);
    const drift = gold ? 60 : 25;
    items.push({ type, x: rand(r, W - r), y: H + r, r, vy: -(H + r * 2) / travel, vx: rand(-drift, drift), rot: rand(-0.3, 0.3), vr: rand(-1, 1) });
  };

  const draw = (t) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(255,211,107,0.55)";
    for (let i = 0; i < 30; i++) g.fillRect((i * 97.3) % W, (i * 53.7) % (H * 0.7), 1.5, 1.5);
    items.forEach((it) => {
      if (it.type === "ghost") drawGhost(g, it.x, it.y, it.r, t);
      else drawPumpkin(g, it.x, it.y, it.r, it.rot, it.type === "gold");
    });
    pops.forEach((p) => {
      g.globalAlpha = Math.max(p.life, 0);
      g.fillStyle = p.color;
      g.font = "800 20px Pretendard, system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText(p.text, p.x, p.y);
    });
    g.globalAlpha = 1;
  };

  // 대기 화면: 호박·황금 호박·유령 하나씩 세워 둡니다
  const drawIdle = () => {
    items = [
      { type: "pumpkin", x: W * 0.3, y: H * 0.62, r: 30, rot: -0.15 },
      { type: "gold", x: W * 0.52, y: H * 0.45, r: 26, rot: 0.1 },
      { type: "ghost", x: W * 0.74, y: H * 0.64, r: 30, rot: 0 },
    ];
    draw(0);
    items = [];
  };

  const frame = (ts) => {
    const dt = Math.min((ts - (last || ts)) / 1000, 0.05);
    last = ts;
    timeLeft -= dt;
    // 시간이 지날수록 더 자주 나옵니다 (0.62초 → 0.34초 간격)
    const pace = 0.62 - (1 - timeLeft / seconds) * 0.28;
    spawnAcc += dt;
    while (spawnAcc > pace) {
      spawnAcc -= pace;
      spawn();
    }
    items.forEach((it) => {
      it.y += it.vy * dt;
      it.x += it.vx * dt;
      it.rot += it.vr * dt;
    });
    items = items.filter((it) => it.y > -it.r * 1.5);
    pops.forEach((p) => {
      p.y -= 40 * dt;
      p.life -= dt * 1.4;
    });
    pops = pops.filter((p) => p.life > 0);
    draw(ts / 1000);
    onHud?.(score, Math.max(timeLeft, 0));
    if (timeLeft <= 0) {
      running = false;
      onEnd?.(score);
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  const onPointer = (e) => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (Math.hypot(px - it.x, py - it.y) <= it.r * 1.05) {
        const val = VALUE[it.type];
        score = Math.max(0, score + val);
        pops.push({
          x: it.x, y: it.y, life: 1,
          text: (val > 0 ? "+" : "−") + Math.abs(val),
          color: val > 1 ? "#FFD36B" : val > 0 ? "#9BD06A" : "#FF6B7D",
        });
        items.splice(i, 1);
        break;
      }
    }
  };

  canvas.addEventListener("pointerdown", onPointer);
  window.addEventListener("resize", resize);
  resize();

  return {
    start() {
      resize();
      items = [];
      pops = [];
      score = 0;
      timeLeft = seconds;
      spawnAcc = 0;
      last = 0;
      running = true;
      onHud?.(0, seconds);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    },
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", resize);
    },
  };
}
