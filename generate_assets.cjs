const fs = require('fs');

const DISTRICTS = [
  // Gujarat
  ['Kachchh', 69.8, 23.2, 2.0, 'gujarat'], ['Devbhumi Dwarka', 69.3, 22.2, 0.7, 'gujarat'], ['Porbandar', 69.6, 21.6, 0.5, 'gujarat'], ['Gir Somnath', 70.6, 20.8, 1.2, 'gujarat'],
  // Maharashtra
  ['Palghar', 72.7, 19.6, 2.9, 'maharashtra'], ['Mumbai', 72.8, 19.0, 12.4, 'maharashtra'], ['Raigad', 73.1, 18.5, 2.6, 'maharashtra'], ['Ratnagiri', 73.3, 16.9, 1.6, 'maharashtra'],
  // Karnataka & Kerala
  ['Dakshina Kannada', 75.1, 12.8, 2.0, 'kerala'], ['Ernakulam', 76.3, 10.0, 3.2, 'kerala'], ['Thiruvananthapuram', 76.9, 8.5, 3.3, 'kerala'],
  // Tamil Nadu
  ['Kanyakumari', 77.5, 8.2, 1.8, 'tn'], ['Thoothukudi', 78.1, 8.7, 1.7, 'tn'], ['Nagapattinam', 79.8, 10.7, 1.6, 'tn'], ['Chennai', 80.2, 13.0, 7.0, 'tn'],
  // AP
  ['Nellore', 79.9, 14.4, 2.9, 'ap'], ['Prakasam', 80.0, 15.5, 3.3, 'ap'], ['Krishna', 81.0, 16.1, 4.5, 'ap'], ['East Godavari', 82.2, 16.9, 5.1, 'ap'], ['Visakhapatnam', 83.3, 17.7, 4.2, 'ap'], ['Srikakulam', 83.9, 18.3, 2.7, 'ap'],
  // Odisha
  ['Ganjam', 84.7, 19.3, 3.5, 'odisha'], ['Khordha', 85.6, 20.1, 2.2, 'odisha'], ['Puri', 85.8, 19.8, 1.7, 'odisha'], ['Jagatsinghpur', 86.1, 20.2, 1.1, 'odisha'], ['Kendrapara', 86.4, 20.5, 1.4, 'odisha'], ['Bhadrak', 86.5, 21.0, 1.5, 'odisha'], ['Balasore', 86.9, 21.4, 2.3, 'odisha'],
  // Bengal
  ['South 24 Parganas', 88.3, 21.9, 8.1, 'odisha'],
  
  // Andaman
  ['Port Blair', 92.7, 11.6, 0.4, 'andaman']
];

const types = ['hospital', 'shelter', 'power', 'telecom', 'water'];
const typeNames = {
  hospital: ['District Hospital', 'CHC', 'Medical College', 'General Hospital'],
  shelter: ['Cyclone Shelter', 'Multipurpose Shelter', 'Relief Camp'],
  power: ['33/11 kV Substation', '132 kV Grid Substation', 'Power Station'],
  telecom: ['Tower Cluster', 'Telephone Exchange', 'BSNL Exchange'],
  water: ['Water Works', 'Pumping Station', 'Treatment Plant']
};

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

const db = {};

for (const dist of DISTRICTS) {
  const [name, lon, lat, pop, region] = dist;
  if (!db[region]) db[region] = [];
  
  // Generate 15-25 assets per district clustered around the district center
  const numAssets = Math.floor(randomInRange(15, 25));
  for (let i = 0; i < numAssets; i++) {
    const t = types[Math.floor(Math.random() * types.length)];
    const n = typeNames[t][Math.floor(Math.random() * typeNames[t].length)];
    
    // Random offset up to ~25km (0.25 degrees)
    const oLon = lon + randomInRange(-0.25, 0.25);
    const oLat = lat + randomInRange(-0.25, 0.25);
    
    db[region].push({
      id: "gen_" + Math.random().toString(36).substr(2, 9),
      name: `${n}, ${name}`,
      type: t,
      lon: parseFloat(oLon.toFixed(4)),
      lat: parseFloat(oLat.toFixed(4)),
      elev: Math.floor(randomInRange(2, 20)),
      cond: Math.floor(randomInRange(2, 5)),
      cap: t === 'shelter' ? Math.floor(randomInRange(200, 1500)) : Math.floor(randomInRange(50, 500))
    });
  }
}

fs.writeFileSync('src/lib/assets.json', JSON.stringify(db, null, 2));
console.log("Assets regenerated correctly around districts!");
