// ─────────────────────────────────────────────────────────────
// 할로윈 캔버스 그리기 도구 — 호박(일반/황금), 유령, 박쥐
//   이미지 파일 없이 Canvas 2D 로 직접 그립니다. 효과 레이어와 게임이 같이 씁니다.
// ─────────────────────────────────────────────────────────────

export function drawPumpkin(c, x, y, r, rot = 0, gold = false) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const light = gold ? "#F7CF4F" : "#F27A1A";
  const dark = gold ? "#D29F22" : "#C85A0E";
  // 몸통: 좌우 어두운 골 + 가운데 밝은 골
  [[-0.42, dark], [0.42, dark], [0, light]].forEach(([ox, col]) => {
    c.beginPath();
    c.ellipse(ox * r, 0, r * 0.62, r * 0.84, 0, 0, Math.PI * 2);
    c.fillStyle = col;
    c.fill();
  });
  // 꼭지
  c.fillStyle = "#5E7D3A";
  c.beginPath();
  c.moveTo(-r * 0.08, -r * 0.78);
  c.lineTo(r * 0.12, -r * 0.78);
  c.lineTo(r * 0.2, -r * 1.08);
  c.lineTo(0, -r * 1.05);
  c.closePath();
  c.fill();
  // 얼굴(촛불 빛)
  c.fillStyle = "#FFD36B";
  c.shadowColor = "#FFB03A";
  c.shadowBlur = r * 0.4;
  const eye = (s) => {
    c.beginPath();
    c.moveTo(s * r * 0.36, -r * 0.08);
    c.lineTo(s * r * 0.14, -r * 0.08);
    c.lineTo(s * r * 0.25, -r * 0.34);
    c.closePath();
    c.fill();
  };
  eye(-1);
  eye(1);
  c.beginPath();
  c.moveTo(-r * 0.42, r * 0.18);
  [[-0.28, 0.3], [-0.16, 0.2], [0, 0.34], [0.16, 0.2], [0.28, 0.3], [0.42, 0.18]].forEach(([tx, ty]) => c.lineTo(tx * r, ty * r));
  c.quadraticCurveTo(0, r * 0.62, -r * 0.42, r * 0.18);
  c.fill();
  c.restore();
}

export function drawGhost(c, x, y, r, t = 0) {
  c.save();
  c.translate(x, y + Math.sin(t * 4) * r * 0.08);
  c.fillStyle = "rgba(244,240,250,0.96)";
  c.beginPath();
  c.arc(0, -r * 0.15, r * 0.75, Math.PI, 0);
  c.lineTo(r * 0.75, r * 0.75);
  for (let i = 0; i < 4; i++) {
    const cx = r * 0.75 - (i + 0.5) * r * 0.375;
    const ex = r * 0.75 - (i + 1) * r * 0.375;
    c.quadraticCurveTo(cx, i % 2 ? r * 0.95 : r * 0.5, ex, r * 0.75);
  }
  c.closePath();
  c.fill();
  c.fillStyle = "#1B1426";
  c.beginPath(); c.ellipse(-r * 0.25, -r * 0.15, r * 0.1, r * 0.15, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(r * 0.25, -r * 0.15, r * 0.1, r * 0.15, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(0, r * 0.2, r * 0.12, r * 0.08, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}

/** flap: -1 ~ 1 (날갯짓 위상) */
export function drawBat(c, x, y, s, flap, color = "#3B2A4F") {
  c.save();
  c.translate(x, y);
  c.fillStyle = color;
  const wing = (dir) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(dir * s * 0.5, -s * 0.7 * flap, dir * s * 1.2, -s * 0.3 * flap);
    c.quadraticCurveTo(dir * s * 0.95, s * 0.05, dir * s * 0.75, s * 0.15);
    c.quadraticCurveTo(dir * s * 0.55, 0, dir * s * 0.4, s * 0.2);
    c.quadraticCurveTo(dir * s * 0.25, s * 0.05, 0, s * 0.25);
    c.closePath();
    c.fill();
  };
  wing(-1);
  wing(1);
  c.beginPath();
  c.ellipse(0, s * 0.08, s * 0.16, s * 0.24, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#FFD36B";
  c.fillRect(-s * 0.08, 0, s * 0.05, s * 0.05);
  c.fillRect(s * 0.03, 0, s * 0.05, s * 0.05);
  c.restore();
}
