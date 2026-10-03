import fs from 'fs';

const REGIONS = {
  odisha: [19.0, 84.0, 22.0, 89.0],
  ap: [13.5, 79.5, 19.0, 84.5],
  tn: [8.0, 77.0, 14.0, 81.0],
  kerala: [8.0, 74.0, 15.0, 77.5],
  gujarat: [20.0, 68.0, 24.0, 73.0],
  maharashtra: [15.0, 71.0, 20.0, 74.0],
  andaman: [6.0, 92.0, 14.0, 94.0],
};

const TYPES = ['hospital', 'shelter', 'power', 'telecom', 'water'];
const NAMES = {
  hospital: ['District Hospital', 'General Hospital', 'Medical College', 'Care Hospital', 'City Hospital', 'Relief Clinic'],
  shelter: ['Multi-Purpose Cyclone Shelter', 'School Building', 'Community Hall', 'Evacuation Center', 'Panchayat Bhawan'],
  power: ['33/11kV Substation', '132kV Grid Substation', '220kV Main Station', 'Distribution Hub'],
  telecom: ['Jio Tower', 'Airtel Mast', 'BSNL Exchange', 'VIL Tower', 'BSNL Microwave Tower'],
  water: ['Water Treatment Plant', 'Pump Station', 'Overhead Tank', 'Reservoir Hub']
};

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function generateAssetsForRegion(bounds, count) {
  const [minLat, minLon, maxLat, maxLon] = bounds;
  const assets = [];
  
  for (let i = 0; i < count; i++) {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const namePool = NAMES[type];
    const baseName = namePool[Math.floor(Math.random() * namePool.length)];
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Cluster them slightly towards the coast? We just randomize within bounds
    let lat = randomInRange(minLat + 0.1, maxLat - 0.1);
    let lon = randomInRange(minLon + 0.1, maxLon - 0.1);
    
    // Bias towards coast: For East coast (lon increases as lat increases), etc.
    // We'll just scatter them randomly for the simulation.
    
    assets.push({
      id: "gen_" + id,
      name: baseName + " " + Math.floor(Math.random() * 100),
      type: type,
      lon: parseFloat(lon.toFixed(4)),
      lat: parseFloat(lat.toFixed(4)),
      elev: Math.floor(Math.random() * 30 + 1),
      cond: Math.floor(Math.random() * 3 + 2),
      cap: type === 'shelter' ? Math.floor(randomInRange(200, 1500)) : Math.floor(randomInRange(50, 500))
    });
  }
  return assets;
}

const db = {};
for (const [key, bounds] of Object.entries(REGIONS)) {
  // Generate 200 detailed assets per state
  db[key] = generateAssetsForRegion(bounds, 200);
}

fs.writeFileSync('src/lib/assets.json', JSON.stringify(db, null, 2));
console.log('Successfully generated high-density local assets!');
