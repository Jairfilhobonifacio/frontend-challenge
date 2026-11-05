/**
 * KRONOS // ARCHIVE — Renderizador de Arte Generativa Determinística em <canvas>
 */
import type { GenerativeRecipe } from '@/contracts/kronos.types';

export function renderGenerativeArtworkToCanvas(
  canvas: HTMLCanvasElement,
  recipe: GenerativeRecipe
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const seedNum = parseInt(recipe.seedHex.replace(/^0x/, '').slice(0, 8), 16) || 42;
  const comp = Math.max(12, Math.min(80, recipe.complexity || 38));

  ctx.fillStyle = '#161D1B';
  ctx.fillRect(0, 0, w, h);

  if (recipe.algorithm === 'lissajous-ribbon') {
    for (let i = 0; i < comp; i++) {
      ctx.beginPath();
      const phase = i * 0.15 + (seedNum % 19) * 0.11;
      for (let t = 0; t <= Math.PI * 2; t += 0.025) {
        const px = 0.68 * Math.sin(3 * t + phase) * Math.cos(t * 0.5);
        const py = 0.68 * Math.sin(4 * t - phase * 0.6);
        const sx = (px + 1) * 0.5 * (w - 80) + 40;
        const sy = (py + 1) * 0.5 * (h - 80) + 40;
        if (t === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = i % 5 === 0 ? '#2F4DEB' : 'rgba(240, 241, 237, 0.52)';
      ctx.lineWidth = i % 5 === 0 ? 3.2 : 1.4;
      ctx.stroke();
    }
  } else if (recipe.algorithm === 'brutalist-slabs') {
    ctx.fillStyle = '#DDE1DE';
    ctx.fillRect(0, 0, w, h);
    const count = Math.max(5, Math.floor(comp / 5));
    for (let i = 0; i < count; i++) {
      const x = 50 + ((seedNum + i * 97) % Math.max(80, w - 240));
      const y = 50 + ((seedNum + i * 131) % Math.max(80, h - 260));
      const bw = 90 + ((i * 53) % 140);
      const bh = 120 + ((i * 71) % 180);
      ctx.fillStyle = 'rgba(22, 29, 27, 0.18)';
      ctx.fillRect(x + 18, y + 18, bw, bh);
      ctx.fillStyle = i === count - 1 ? '#2F4DEB' : i % 2 === 0 ? '#161D1B' : '#F0F1ED';
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = '#161D1B';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, bw, bh);
    }
  } else if (recipe.algorithm === 'zk-interference') {
    for (let i = 1; i <= comp; i++) {
      ctx.beginPath();
      const r = (i / comp) * (w * 0.42);
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.strokeStyle = i % 4 === 0 ? '#2F4DEB' : 'rgba(240, 241, 237, 0.55)';
      ctx.lineWidth = i % 4 === 0 ? 2.4 : 1.1;
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#F0F1ED';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < comp; i++) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((i * Math.PI) / (comp / 2));
      ctx.strokeStyle = i % 4 === 0 ? '#9E2E24' : 'rgba(22, 29, 27, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(-w * 0.3 + i * 2, -h * 0.14, w * 0.6 - i * 4, h * 0.28);
      ctx.restore();
    }
  }
}
