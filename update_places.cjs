const fs = require('fs');

const NEW_PLACES = `export const PLACES = [
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
].map((p: any) => ({ n: p[0], k: K(p[1], p[2]) }));`;

const NEW_DISTRICTS = `export const DISTRICTS = [
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
].map((d: any) => ({ n: d[0], lon: d[1], lat: d[2], k: K(d[1], d[2]), pop: d[3] }));`;

let modelCode = fs.readFileSync('src/lib/model.ts', 'utf8');

modelCode = modelCode.replace(
  /export const PLACES = \[.*?\]\.map\(\(p: any\) => \(\{ n: p\[0\], k: K\(p\[1\], p\[2\]\) \}\)\);/s,
  NEW_PLACES
);

modelCode = modelCode.replace(
  /export const DISTRICTS = \[.*?\]\.map\(\(d: any\) => \(\{ n: d\[0\], lon: d\[1\], lat: d\[2\], k: K\(d\[1\], d\[2\]\), pop: d\[3\] \}\)\);/s,
  NEW_DISTRICTS
);

fs.writeFileSync('src/lib/model.ts', modelCode);
console.log("Updated model.ts");
