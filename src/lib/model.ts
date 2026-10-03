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
  // West Coast
  ['Jakhau', 68.7, 23.2], ['Porbandar', 69.6, 21.6], ['Veraval', 70.3, 20.9], ['Una', 71.0, 20.8],
  ['Mumbai', 72.8, 19.0], ['Alibaug', 72.8, 18.6], ['Ratnagiri', 73.3, 16.9],
  ['Goa', 73.8, 15.4], ['Karwar', 74.1, 14.8], ['Mangaluru', 74.8, 12.8],
  ['Kozhikode', 75.7, 11.2], ['Kochi', 76.2, 9.9], ['Thiruvananthapuram', 76.9, 8.5],
  // East Coast
  ['Kanyakumari', 77.5, 8.0], ['Tuticorin', 78.1, 8.7], ['Rameswaram', 79.3, 9.2],
  ['Nagapattinam', 79.8, 10.7], ['Puducherry', 79.8, 11.9], ['Chennai', 80.2, 13.0],
  ['Nellore', 80.1, 14.4], ['Ongole', 80.0, 15.5], ['Bapatla', 80.4, 15.9],
  ['Machilipatnam', 81.1, 16.1], ['Kakinada', 82.2, 16.9], ['Visakhapatnam', 83.3, 17.7],
  ['Kalingapatnam', 84.1, 18.3], ['Gopalpur', 84.9, 19.2], ['Puri', 85.8, 19.8],
  ['Paradip', 86.6, 20.2], ['Dhamra', 86.9, 20.7], ['Balasore', 86.9, 21.4],
  ['Digha', 87.5, 21.6], ['Sagar Island', 88.1, 21.6],
  // Islands
  ['Port Blair', 92.7, 11.6]
].map((p: any) => ({ n: p[0], k: K(p[1], p[2]) }));

export const DISTRICTS = [
  // Gujarat
  ['Kachchh', 69.8, 23.2, 2.0], ['Devbhumi Dwarka', 69.3, 22.2, 0.7], ['Porbandar', 69.6, 21.6, 0.5], ['Gir Somnath', 70.6, 20.8, 1.2],
  // Maharashtra
  ['Palghar', 72.7, 19.6, 2.9], ['Mumbai', 72.8, 19.0, 12.4], ['Raigad', 73.1, 18.5, 2.6], ['Ratnagiri', 73.3, 16.9, 1.6],
  // Karnataka & Kerala
  ['Dakshina Kannada', 75.1, 12.8, 2.0], ['Ernakulam', 76.3, 10.0, 3.2], ['Thiruvananthapuram', 76.9, 8.5, 3.3],
  // Tamil Nadu
  ['Kanyakumari', 77.5, 8.2, 1.8], ['Thoothukudi', 78.1, 8.7, 1.7], ['Nagapattinam', 79.8, 10.7, 1.6], ['Chennai', 80.2, 13.0, 7.0],
  // AP
  ['Nellore', 79.9, 14.4, 2.9], ['Prakasam', 80.0, 15.5, 3.3], ['Krishna', 81.0, 16.1, 4.5], ['East Godavari', 82.2, 16.9, 5.1], ['Visakhapatnam', 83.3, 17.7, 4.2], ['Srikakulam', 83.9, 18.3, 2.7],
  // Odisha
  ['Ganjam', 84.7, 19.3, 3.5], ['Khordha', 85.6, 20.1, 2.2], ['Puri', 85.8, 19.8, 1.7], ['Jagatsinghpur', 86.1, 20.2, 1.1], ['Kendrapara', 86.4, 20.5, 1.4], ['Bhadrak', 86.5, 21.0, 1.5], ['Balasore', 86.9, 21.4, 2.3],
  // Bengal
  ['South 24 Parganas', 88.3, 21.9, 8.1]
].map((d: any) => ({ n: d[0], lon: d[1], lat: d[2], k: K(d[1], d[2]), pop: d[3] }));

export const REGIONS: Record<string, { name: string, bounds: [number, number, number, number], defaultPreset: string }> = {
  odisha: { name: 'Odisha & Bengal', bounds: [19.0, 84.0, 22.0, 89.0], defaultPreset: 'fani' },
  ap: { name: 'Andhra Pradesh', bounds: [13.5, 79.5, 19.0, 84.5], defaultPreset: 'hudhud' },
  tn: { name: 'Tamil Nadu', bounds: [8.0, 77.0, 14.0, 81.0], defaultPreset: 'vardah' },
  kerala: { name: 'Kerala & Karnataka', bounds: [8.0, 74.0, 15.0, 77.5], defaultPreset: 'ockhi' },
  gujarat: { name: 'Gujarat', bounds: [20.0, 68.0, 24.0, 73.0], defaultPreset: 'biparjoy' },
  maharashtra: { name: 'Maharashtra', bounds: [15.0, 71.0, 20.0, 74.0], defaultPreset: 'nisarga' },
  andaman: { name: 'Andaman & Nicobar', bounds: [6.0, 92.0, 14.0, 94.0], defaultPreset: 'pabuk' },
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

  // Kerala & Karnataka (kerala)
  ockhi: { region: 'kerala', name: 'Ockhi: Trivandrum coast, very severe', O: [77.5, 7.5], B: [74.5, 9.5], L: [71.0, 15.0], vL: 155, rm: 35 },
  tauktae_kerala: { region: 'kerala', name: 'Tauktae (Early Phase): Coastal Karnataka', O: [73.5, 11.5], B: [72.0, 14.0], L: [71.0, 17.0], vL: 120, rm: 40 },

  // Maharashtra (maharashtra)
  nisarga: { region: 'maharashtra', name: 'Nisarga: Alibaug, severe (Starts Nearby)', O: [71.5, 16.0], B: [72.0, 17.5], L: [72.9, 18.6], vL: 110, rm: 30 },
  phyan: { region: 'maharashtra', name: 'Phyan: Palghar, cyclonic storm (Long Track)', O: [70.0, 12.0], B: [71.5, 15.0], L: [72.7, 19.5], vL: 85, rm: 45 },

  // Andaman & Nicobar (andaman)
  pabuk: { region: 'andaman', name: 'Pabuk: Andaman Islands, cyclonic storm', O: [95.0, 8.0], B: [93.5, 10.5], L: [92.5, 12.5], vL: 85, rm: 30 },
  vardah_andaman: { region: 'andaman', name: 'Vardah (Genesis): Port Blair', O: [94.0, 10.0], B: [91.0, 12.0], L: [88.0, 13.0], vL: 100, rm: 40 }
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
  return list.map((a, i) => {
    if (Array.isArray(a)) {
      return {
        id: i, name: a[0], type: a[1], lon: a[2], lat: a[3],
        elev: a[4], cond: a[5], cap: a[6], k: K(a[2], a[3])
      };
    }
    return {
      id: a.id || i, name: a.name, type: a.type, lon: a.lon, lat: a.lat,
      elev: a.elev, cond: a.cond, cap: a.cap, k: K(a.lon, a.lat)
    };
  });
}
