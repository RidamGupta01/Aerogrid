const fs = require('fs');

const modelTsPath = 'src/lib/model.ts';
let modelTs = fs.readFileSync(modelTsPath, 'utf8');

// Replace everything up to PRESETS with the new logic
const newTop = `export const TL = 36, TMAX = 60;

export type Point = [number, number]; // [lon, lat] generally, or [x, y] in km

// Global projection center (we can update this when region changes, but for simplicity we'll just project everything relative to a central point in India, or just use precise haversine.
// To keep the simulation fast and simple, we'll project to km relative to India's center [80, 20]
export function K(lon: number, lat: number): Point {
  return [(lon - 80) * 105.0, (lat - 20) * 111.0];
}
export function lonlat(p: Point): Point {
  return [80 + p[0] / 105.0, 20 + p[1] / 111.0];
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export const COASTLL: Point[] = [
  [68.3, 23.6], [69.0, 22.8], [69.2, 22.1], [70.2, 22.1], [71.4, 20.8],
  [72.6, 20.2], [72.8, 19.0], [73.0, 18.0], [73.3, 16.5], [73.8, 15.4],
  [74.3, 14.3], [74.8, 13.0], [75.3, 12.0], [76.2, 10.5], [77.0, 8.5],
  [77.5, 8.1], // Kanyakumari
  [78.2, 8.8], [79.2, 9.5], [79.9, 10.5], [79.8, 11.8], [80.3, 13.2],
  [80.1, 14.5], [80.2, 15.5], [81.5, 16.3], [82.3, 16.9], [83.3, 17.7],
  [84.1, 18.3], [85.0, 19.3], [85.8, 19.8], [86.7, 20.3], [87.0, 21.0],
  [87.6, 21.6], [88.1, 21.7], [89.0, 21.8]
];
export const COAST = COASTLL.map(p => K(p[0], p[1]));

export function nearestCoast(P: Point): { d: number, pt: Point } {
  let best = { d: 1e9, pt: COAST[0] };
  for (let i = 0; i < COAST.length - 1; i++) {
    const a = COAST[i], b = COAST[i + 1], abx = b[0] - a[0], aby = b[1] - a[1];
    const t = clamp(((P[0] - a[0]) * abx + (P[1] - a[1]) * aby) / (abx * abx + aby * aby), 0, 1);
    const q: Point = [a[0] + abx * t, a[1] + aby * t], d = dist(P, q);
    if (d < best.d) best = { d, pt: q };
  }
  return best;
}

export const REGIONS = {
  odisha: { name: 'Odisha & Bengal', center: [20.5, 86.5], zoom: 7, bounds: [19.0, 84.0, 22.0, 89.0] },
  ap: { name: 'Andhra Pradesh', center: [16.5, 81.5], zoom: 7, bounds: [13.5, 79.5, 19.0, 84.5] },
  tn: { name: 'Tamil Nadu', center: [11.5, 79.5], zoom: 7, bounds: [8.0, 77.0, 14.0, 81.0] },
  gujarat: { name: 'Gujarat', center: [22.0, 70.5], zoom: 7, bounds: [20.0, 68.0, 24.0, 73.0] },
  maharashtra: { name: 'Maharashtra', center: [18.0, 72.5], zoom: 7, bounds: [15.0, 71.0, 20.0, 74.0] },
};

export const TYPES: Record<string, { label: string, g: string, vf: number, sv: number, unit: string, color: string }> = {
  hospital: { label: 'Hospital', g: 'H', vf: 150, sv: 0.9, unit: 'beds', color: '#ef4444' },
  shelter: { label: 'Cyclone shelter', g: 'S', vf: 175, sv: 0.6, unit: 'places', color: '#10b981' },
  power: { label: 'Power substation', g: 'P', vf: 115, sv: 1.0, unit: 'k consumers', color: '#eab308' },
  telecom: { label: 'Telecom tower', g: 'T', vf: 125, sv: 0.7, unit: 'sites', color: '#3b82f6' },
  road: { label: 'Road or bridge', g: 'R', vf: 190, sv: 0.8, unit: '', color: '#9ca3af' },
  water: { label: 'Water works', g: 'W', vf: 140, sv: 1.0, unit: 'k pop', color: '#0ea5e9' }
};

export const TKEYS = ['hospital', 'shelter', 'power', 'telecom', 'road', 'water'];
export const COND = ['', 'Poor', 'Weak', 'Fair', 'Good', 'Very good'];
`;

modelTs = modelTs.replace(/export const W = 750.*?export const SAMPLE_DATA = \[\n.*?\];/s, newTop);

fs.writeFileSync(modelTsPath, modelTs);
console.log('model.ts updated');
