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

async function fetchRegion(name, bounds) {
  const [minLat, minLon, maxLat, maxLon] = bounds;
  // Make query smaller to avoid timeouts
  const query = `
    [out:json][timeout:60];
    (
      node["amenity"="hospital"](${minLat},${minLon},${maxLat},${maxLon});
      node["amenity"="shelter"](${minLat},${minLon},${maxLat},${maxLon});
      node["power"="substation"](${minLat},${minLon},${maxLat},${maxLon});
      node["communication:mobile_phone"="yes"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out center;
  `;
  
  console.log(`Fetching ${name}...`);
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: "data=" + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const data = await res.json();
    return data.elements.map(e => {
      let type = 'hospital';
      if (e.tags?.amenity === 'shelter') type = 'shelter';
      if (e.tags?.power === 'substation') type = 'power';
      if (e.tags?.['communication:mobile_phone'] === 'yes') type = 'telecom';
      if (e.tags?.man_made === 'water_works') type = 'water';
      
      const n = e.tags?.name || (type.charAt(0).toUpperCase() + type.slice(1));
      return {
        id: e.id,
        name: n,
        type,
        lon: e.lon,
        lat: e.lat,
        elev: Math.floor(Math.random() * 20 + 2),
        cond: Math.floor(Math.random() * 3 + 2),
        cap: Math.floor(Math.random() * 500 + 50)
      };
    });
  } catch (e) {
    console.error(`Failed ${name}:`, e.message);
    return [];
  }
}

async function run() {
  const db = {};
  for (const [key, bounds] of Object.entries(REGIONS)) {
    const assets = await fetchRegion(key, bounds);
    db[key] = assets;
    // Sleep to respect Overpass rate limit
    await new Promise(r => setTimeout(r, 2000));
  }
  fs.writeFileSync('src/lib/assets.json', JSON.stringify(db, null, 2));
  console.log('Saved to src/lib/assets.json');
}

run();
