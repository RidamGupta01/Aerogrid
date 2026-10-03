import { dist, clamp, TL, TMAX, nearestCoast, TYPES, DISTRICTS } from './model';
import type { Point, Asset } from './model';

export interface StormState {
  O: Point;
  B: Point;
  L: Point;
  vL: number;
  rm: number;
  t: number;
}

export function buildTrack(S: StormState) {
  const { O, B, L } = S;
  const C: Point = [2 * B[0] - (O[0] + L[0]) / 2, 2 * B[1] - (O[1] + L[1]) / 2];

  function bez(u: number): Point {
    const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    return [a * O[0] + b * C[0] + c * L[0], a * O[1] + b * C[1] + c * L[1]];
  }

  const N = 120, pts: Point[] = [bez(0)], cum: number[] = [0];
  for (let i = 1; i <= N; i++) {
    const p = bez(i / N);
    pts.push(p);
    cum.push(cum[i - 1] + dist(pts[i - 1], p));
  }
  const len = cum[N] || 1, speed = len / TL;
  const dx = L[0] - C[0], dy = L[1] - C[1], dl = Math.hypot(dx, dy);
  const dir: Point = dl < 1e-6 ? [0, 1] : [dx / dl, dy / dl];

  function pos(t: number): Point {
    if (t <= 0) return pts[0];
    if (t >= TL) {
      const d = speed * (t - TL);
      return [L[0] + dir[0] * d, L[1] + dir[1] * d];
    }
    const sT = len * t / TL;
    let lo = 0, hi = N;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (cum[m] <= sT) lo = m; else hi = m;
    }
    const f = (sT - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
    return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f];
  }
  return { pos, len, speed, dir };
}

export function vmaxAt(S: StormState, t: number) {
  const { vL } = S;
  const v0 = Math.max(70, 0.6 * vL);
  if (t <= TL) return v0 + (vL - v0) * (t / TL);
  return vL * Math.exp(-0.05 * (t - TL));
}

export function galeR(rm: number, v: number) {
  return v >= 62 ? rm * Math.pow(v / 62, 1 / 0.7) : 0;
}

export function runModel(S: StormState, assets: Asset[]) {
  const tr = buildTrack(S);
  const { rm, vL } = S;
  const sm: any[] = [];
  
  for (let t = 0; t <= TMAX; t += 0.5) {
    const p = tr.pos(t), p2 = tr.pos(t + 0.5);
    const mx = p2[0] - p[0], my = p2[1] - p[1], ml = Math.hypot(mx, my) || 1;
    sm.push({ t, p, m: [mx / ml, my / ml], v: vmaxAt(S, t) });
  }

  function evalPoint(P: Point) {
    let peak = 0, tp = 0, tg: number | null = null;
    for (let i = 0; i < sm.length; i++) {
      const q = sm[i], dx = P[0] - q.p[0], dy = P[1] - q.p[1], r = Math.hypot(dx, dy) || 0.01;
      const d = (dx * q.m[1] - dy * q.m[0]) / r;
      let w = r < rm ? q.v * r / rm : q.v * Math.pow(rm / r, 0.7);
      w *= 1 + 0.2 * d;
      if (w > peak) { peak = w; tp = q.t; }
      if (tg === null && w >= 62) tg = q.t;
    }
    return { peak, tp, tg };
  }

  const rnL = [tr.dir[1], -tr.dir[0]];
  const Sbase = Math.max(0, (vL - 50) * 0.03);

  const res = assets.map(a => {
    const ev = evalPoint(a.k);
    const nc = nearestCoast(a.k);
    const inland = nc.d;
    const dL = dist(nc.pt, S.L);
    const side = (nc.pt[0] - S.L[0]) * rnL[0] + (nc.pt[1] - S.L[1]) * rnL[1];
    const sig = side > 0 ? 90 : 45;
    const surge = Sbase * Math.exp(-dL * dL / (2 * sig * sig));
    const depth = surge - 0.12 * inland - a.elev;
    const ty = TYPES[a.type] || TYPES.road;
    const cf = 0.65 + 0.1 * a.cond, vfe = ty.vf * cf;
    const wr = clamp(Math.pow(Math.max(0, (ev.peak - 50) / (vfe - 50)), 2), 0, 1);
    const sr = clamp((depth + 0.3) / 1.8, 0, 1) * ty.sv;
    const score = 100 * (1 - (1 - 0.95 * wr) * (1 - 0.95 * sr));
    const level = score < 25 ? 0 : score < 50 ? 1 : score < 75 ? 2 : 3;
    return { a, peak: ev.peak, tp: ev.tp, tg: ev.tg, surge, depth, inland, vfe, wr, sr, score, level };
  });

  const dists = DISTRICTS.map((d: any) => {
    const e = evalPoint(d.k);
    return { d, peak: e.peak, tg: e.tg };
  });

  const rank = [...res].sort((a, b) => b.score - a.score);
  return { tr, res, rank, dists, Sbase, sm };
}
