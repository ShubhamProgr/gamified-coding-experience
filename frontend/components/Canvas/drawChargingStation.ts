export interface ChargingStationOptions {
  ghost?: boolean;
  invalid?: boolean;
}

export function drawChargingStation(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  options: ChargingStationOptions = {}
) {
  const { ghost = false, invalid = false } = options;
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);
  const accent = invalid ? "#ff4444" : "#00d4ff";
  const energy = invalid ? "#ff4444" : "#00ffaa";
  const hw = 46;
  const hh = 23;

  ctx.save();
  ctx.translate(cx, cy);
  if (ghost) ctx.globalAlpha = 0.72;

  const padGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  padGrad.addColorStop(0, "rgba(20,38,50,0.96)");
  padGrad.addColorStop(1, "rgba(8,16,24,0.96)");
  ctx.beginPath();
  ctx.moveTo(0, -hh * 0.74);
  ctx.lineTo(hw * 0.74, 0);
  ctx.lineTo(0, hh * 0.74);
  ctx.lineTo(-hw * 0.74, 0);
  ctx.closePath();
  ctx.fillStyle = padGrad;
  ctx.fill();
  ctx.strokeStyle = accent + (ghost ? "99" : "cc");
  ctx.lineWidth = 1.2;
  if (ghost) ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  const sweep = time * 0.0018;
  ctx.beginPath();
  ctx.ellipse(0, 0, hw * 0.56, hh * 0.56, 0, sweep, sweep + Math.PI * 0.45);
  ctx.strokeStyle = energy + "bb";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, 0, hw * 0.56, hh * 0.56, 0, 0, Math.PI * 2);
  ctx.strokeStyle = accent + "33";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  const bw = 15;
  const bh = 7.5;
  const baseH = 6;

  ctx.beginPath();
  ctx.moveTo(0, -bh - 2);
  ctx.lineTo(bw, -2);
  ctx.lineTo(0, bh - 2);
  ctx.lineTo(-bw, -2);
  ctx.closePath();
  ctx.fillStyle = "#1c2e3a";
  ctx.fill();
  ctx.strokeStyle = accent + "55";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-bw, -2);
  ctx.lineTo(-bw, baseH - 2);
  ctx.lineTo(0, bh + baseH - 2);
  ctx.lineTo(0, bh - 2);
  ctx.closePath();
  ctx.fillStyle = "#0c1720";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, bh - 2);
  ctx.lineTo(0, bh + baseH - 2);
  ctx.lineTo(bw, baseH - 2);
  ctx.lineTo(bw, -2);
  ctx.closePath();
  ctx.fillStyle = "#122430";
  ctx.fill();

  const mastGrad = ctx.createLinearGradient(-3, 0, 3, 0);
  mastGrad.addColorStop(0, "#1a2b36");
  mastGrad.addColorStop(0.5, "#38576b");
  mastGrad.addColorStop(1, "#14232c");
  ctx.fillStyle = mastGrad;
  ctx.fillRect(-3, -34, 6, 29);
  ctx.fillStyle = accent + "66";
  ctx.fillRect(-3, -34, 1, 29);

  const panelGrad = ctx.createLinearGradient(-24, -32, 24, -18);
  panelGrad.addColorStop(0, "#0f3854");
  panelGrad.addColorStop(0.5, "#1d5f80");
  panelGrad.addColorStop(1, "#0c2b40");

  const drawPanel = (dir: 1 | -1) => {
    ctx.beginPath();
    ctx.moveTo(dir * 4, -31);
    ctx.lineTo(dir * 22, -25);
    ctx.lineTo(dir * 22, -19.5);
    ctx.lineTo(dir * 4, -25.5);
    ctx.closePath();
    ctx.fillStyle = panelGrad;
    ctx.fill();
    ctx.strokeStyle = accent + "88";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.moveTo(dir * (4 + 18 * t), -31 + 6 * t);
      ctx.lineTo(dir * (4 + 18 * t), -25.5 + 6 * t);
      ctx.strokeStyle = "rgba(0,212,255,0.2)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  };
  drawPanel(-1);
  drawPanel(1);

  ctx.beginPath();
  ctx.arc(0, -40, 11 + pulse * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = energy + "18";
  ctx.fill();

  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = energy;
  ctx.beginPath();
  ctx.arc(0, -40, 6.6, 0, Math.PI * 2);
  ctx.fillStyle = energy;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(0, -40, 6.6, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-1.2, -46.5);
  ctx.lineTo(3.6, -46.5);
  ctx.lineTo(0.8, -41.5);
  ctx.lineTo(3.4, -41.5);
  ctx.lineTo(-2.6, -33.5);
  ctx.lineTo(-0.8, -40);
  ctx.lineTo(-3.4, -40);
  ctx.closePath();
  ctx.fillStyle = "#04121a";
  ctx.fill();

  const arcSweep = time * 0.003;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(0, -40, 10 + i * 4, arcSweep + i, arcSweep + i + Math.PI * 0.5);
    ctx.strokeStyle = energy + (i === 0 ? "66" : "33");
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  const lightOn = pulse > 0.45;
  ctx.fillStyle = lightOn ? energy : "rgba(0,255,170,0.25)";
  [[-11, 3], [11, 3], [0, 9]].forEach(([lx, ly]) => {
    ctx.beginPath();
    ctx.arc(lx, ly, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}
