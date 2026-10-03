export const W = 750, H = 757, TL = 36, TMAX = 60, PXKM = 0.95;

export type Point = [number, number];

export function K(lon: number, lat: number): Point {
  return [(lon - 80) * 105.0, (lat - 20) * 111.0];
}

export function toPx(p: Point): Point {
  return [(p[0] + 1260) * 0.35, (666 - p[1]) * 0.35];
}

export function fromPx(x: number, y: number): Point {
  return [x / 0.35 - 1260, 666 - y / 0.35];
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
  [77.5, 8.1],
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

export const PLACES = [
  ['Kalingapatnam', 84.12, 18.33], ['Gopalpur', 84.9, 19.26], ['Satapada', 85.43, 19.66],
  ['Puri', 85.83, 19.79], ['Konark', 86.08, 19.88], ['Paradip', 86.67, 20.26],
  ['Rajnagar', 86.88, 20.55], ['Dhamra', 87.0, 20.75], ['Chandipur', 87.04, 21.46],
  ['Digha', 87.55, 21.62], ['Sagar Island', 88.05, 21.65]
].map((p: any) => ({ n: p[0], k: K(p[1], p[2]) }));

export const DISTRICTS = [
  ['Ganjam', 84.79, 19.31, 3.52], ['Khordha', 85.82, 20.3, 2.25],
  ['Puri', 85.83, 19.81, 1.70], ['Jagatsinghpur', 86.17, 20.26, 1.14],
  ['Kendrapara', 86.42, 20.5, 1.44], ['Bhadrak', 86.5, 21.06, 1.51],
  ['Balasore', 86.93, 21.49, 2.32]
].map((d: any) => ({ n: d[0], lon: d[1], lat: d[2], k: K(d[1], d[2]), pop: d[3] }));

export const REGIONS: Record<string, { name: string, bounds: [number, number, number, number], defaultPreset: string }> = {
  odisha: { name: 'Odisha & Bengal', bounds: [19.0, 84.0, 22.0, 89.0], defaultPreset: 'fani' },
  ap: { name: 'Andhra Pradesh', bounds: [13.5, 79.5, 19.0, 84.5], defaultPreset: 'hudhud' },
  tn: { name: 'Tamil Nadu', bounds: [8.0, 77.0, 14.0, 81.0], defaultPreset: 'vardah' },
  gujarat: { name: 'Gujarat', bounds: [20.0, 68.0, 24.0, 73.0], defaultPreset: 'biparjoy' },
  maharashtra: { name: 'Maharashtra', bounds: [15.0, 71.0, 20.0, 74.0], defaultPreset: 'nisarga' },
};

export const TYPES: Record<string, { label: string, g: string, vf: number, sv: number, unit: string }> = {
  hospital: { label: 'Hospital', g: 'H', vf: 150, sv: 0.9, unit: 'beds' },
  shelter: { label: 'Cyclone shelter', g: 'S', vf: 175, sv: 0.6, unit: 'places' },
  power: { label: 'Power substation', g: 'P', vf: 115, sv: 1.0, unit: 'k consumers' },
  telecom: { label: 'Telecom tower', g: 'T', vf: 125, sv: 0.7, unit: 'sites' },
  road: { label: 'Road or bridge', g: 'R', vf: 190, sv: 0.8, unit: '' },
  water: { label: 'Water works', g: 'W', vf: 140, sv: 1.0, unit: 'k people served' }
};

export const TKEYS = ['hospital', 'shelter', 'power', 'telecom', 'road', 'water'];
export const COND = ['', 'Poor', 'Weak', 'Fair', 'Good', 'Very good'];

export const SAMPLE_DATA = [
  ['District hospital, Balasore', 'hospital', 86.93, 21.49, 20, 4, 520],
  ['CHC Dhamra', 'hospital', 86.97, 20.79, 3, 3, 30],
  ['Sub-divisional hospital, Paradip', 'hospital', 86.65, 20.32, 4, 3, 100],
  ['District hospital, Puri', 'hospital', 85.83, 19.81, 6, 4, 450],
  ['Tertiary hospital, Bhubaneswar', 'hospital', 85.82, 20.27, 45, 5, 900],
  ['Medical college hospital, Berhampur', 'hospital', 84.79, 19.31, 25, 4, 1000],
  ['CHC Satapada', 'hospital', 85.43, 19.68, 2, 2, 30],
  ['Cyclone shelter, Satapada', 'shelter', 85.45, 19.67, 3, 3, 800],
  ['Cyclone shelter, Konark', 'shelter', 86.1, 19.9, 5, 4, 1200],
  ['Multipurpose shelter, Kujang', 'shelter', 86.36, 20.29, 3, 2, 1500],
  ['Cyclone shelter, Rajnagar', 'shelter', 86.88, 20.58, 2, 3, 1000],
  ['Cyclone shelter, Chandipur', 'shelter', 87.03, 21.46, 3, 4, 1000],
  ['Cyclone shelter, Gopalpur', 'shelter', 84.89, 19.28, 5, 5, 1500],
  ['Cyclone shelter, Astaranga', 'shelter', 86.34, 20.0, 3, 3, 800],
  ['Cyclone shelter, Chandbali', 'shelter', 86.75, 20.78, 4, 3, 900],
  ['Cyclone shelter, Pattamundai', 'shelter', 86.58, 20.5, 4, 4, 1100],
  ['Cyclone shelter, Jaleswar', 'shelter', 87.2, 21.82, 6, 4, 1000],
  ['Cyclone shelter, Kalingapatnam', 'shelter', 84.12, 18.36, 4, 4, 1200],
  ['33/11 kV substation, Paradip', 'power', 86.66, 20.3, 3, 3, 45],
  ['132 kV grid substation, Balasore', 'power', 86.92, 21.5, 20, 4, 220],
  ['33/11 kV substation, Puri', 'power', 85.84, 19.8, 5, 3, 60],
  ['220 kV grid substation, Bhubaneswar', 'power', 85.8, 20.28, 40, 5, 600],
  ['33/11 kV substation, Dhamra', 'power', 86.95, 20.79, 3, 2, 25],
  ['Grid substation, Berhampur', 'power', 84.8, 19.33, 22, 4, 300],
  ['Tower cluster, Paradip port', 'telecom', 86.68, 20.28, 3, 3, 12],
  ['Tower cluster, Puri beach road', 'telecom', 85.8, 19.79, 4, 3, 9],
  ['Tower cluster, Chandipur', 'telecom', 87.04, 21.48, 2, 2, 6],
  ['Tower cluster, Gopalpur', 'telecom', 84.88, 19.27, 4, 4, 8],
  ['Telephone exchange, Kendrapara', 'telecom', 86.42, 20.5, 9, 3, 4],
  ['Coastal highway bridge, Kujang', 'road', 86.3, 20.31, 3, 3, 0],
  ['Puri-Konark Marine Drive', 'road', 85.97, 19.85, 3, 3, 0],
  ['NH stretch, Bhadrak', 'road', 86.5, 21.0, 12, 4, 0],
  ['Chilika causeway, Balugaon', 'road', 85.12, 19.77, 2, 3, 0],
  ['Coastal road, Balasore to Digha', 'road', 87.3, 21.58, 3, 2, 0],
  ['Water works, Paradip', 'water', 86.64, 20.31, 4, 3, 90],
  ['Water works, Puri', 'water', 85.82, 19.83, 6, 4, 350],
  ['Water works, Balasore', 'water', 86.94, 21.5, 18, 4, 300],
  ['Water works, Berhampur', 'water', 84.8, 19.3, 24, 4, 500]
];

export const PRESETS: Record<string, any> = {
  // Odisha & Bengal (odisha)
  fani: { region: 'odisha', name: 'Fani: Puri landfall, extremely severe (Long & Intense)', O: [85.6, 15.4], B: [85.55, 17.6], L: [85.83, 19.78], vL: 175, rm: 30 },
  phailin: { region: 'odisha', name: 'Phailin: Gopalpur landfall, extremely severe', O: [88.7, 16.9], B: [86.7, 18.3], L: [84.92, 19.27], vL: 205, rm: 35 },
  yaas: { region: 'odisha', name: 'Yaas: Dhamra landfall, very severe', O: [88.2, 17.0], B: [87.7, 19.0], L: [87.0, 20.8], vL: 130, rm: 45 },
  amphan: { region: 'odisha', name: 'Amphan: Sagar Island, very severe', O: [88.2, 16.5], B: [88.3, 19.0], L: [88.2, 21.68], vL: 160, rm: 40 },
  mild_odisha: { region: 'odisha', name: 'Short Track: Paradip, severe (Starts Nearby)', O: [87.2, 18.6], B: [86.9, 19.5], L: [86.67, 20.26], vL: 100, rm: 40 },

  // Andhra Pradesh (ap)
  hudhud: { region: 'ap', name: 'Hudhud: Visakhapatnam, extremely severe (Long Track)', O: [90.0, 11.5], B: [86.5, 15.0], L: [83.3, 17.7], vL: 185, rm: 35 },
  michaung: { region: 'ap', name: 'Michaung: Bapatla, severe (Starts Nearby)', O: [82.5, 13.5], B: [81.5, 14.8], L: [80.4, 15.8], vL: 110, rm: 40 },

  // Tamil Nadu (tn)
  vardah: { region: 'tn', name: 'Vardah: Chennai, very severe (Long Track)', O: [88.0, 10.0], B: [84.0, 12.0], L: [80.3, 13.2], vL: 130, rm: 35 },
  nivar: { region: 'tn', name: 'Nivar: Puducherry, very severe (Starts Nearby)', O: [83.0, 10.5], B: [81.5, 11.2], L: [79.8, 12.0], vL: 120, rm: 30 },

  // Gujarat (gujarat)
  biparjoy: { region: 'gujarat', name: 'Biparjoy: Jakhau, very severe (Long & Erratic)', O: [66.5, 14.5], B: [67.0, 19.5], L: [68.5, 23.2], vL: 115, rm: 40 },
  tauktae: { region: 'gujarat', name: 'Tauktae: Una, extremely severe (Starts Nearby)', O: [71.0, 18.0], B: [70.5, 19.5], L: [71.0, 20.8], vL: 165, rm: 35 },

  // Maharashtra (maharashtra)
  nisarga: { region: 'maharashtra', name: 'Nisarga: Alibaug, severe (Starts Nearby)', O: [71.5, 16.0], B: [72.0, 17.5], L: [72.9, 18.6], vL: 110, rm: 30 },
  phyan: { region: 'maharashtra', name: 'Phyan: Palghar, cyclonic storm (Long Track)', O: [70.0, 12.0], B: [71.5, 15.0], L: [72.7, 19.5], vL: 85, rm: 45 }
};

export function imd(v: number) {
  if (v < 31) return ['Low', 'Below depression'];
  if (v < 50) return ['D', 'Depression'];
  if (v < 62) return ['DD', 'Deep depression'];
  if (v < 89) return ['CS', 'Cyclonic storm'];
  if (v < 118) return ['SCS', 'Severe cyclonic storm'];
  if (v < 166) return ['VSCS', 'Very severe cyclonic storm'];
  if (v < 221) return ['ESCS', 'Extremely severe cyclonic storm'];
  return ['SuCS', 'Super cyclonic storm'];
}

export const LV = ['Low', 'Moderate', 'High', 'Critical'];

export interface Asset {
  id: number;
  name: string;
  type: string;
  lon: number;
  lat: number;
  elev: number;
  cond: number;
  cap: number;
  k: Point;
}

export function buildAssets(list: any[]): Asset[] {
  return list.map((a, i) => ({
    id: i, name: a[0], type: a[1], lon: a[2], lat: a[3],
    elev: a[4], cond: a[5], cap: a[6], k: K(a[2], a[3])
  }));
}
