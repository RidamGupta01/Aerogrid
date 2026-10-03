import type { Asset } from './model';
import { K, TYPES } from './model';

// GDACS API for real-time cyclone tracks
const GDACS_API_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=TC';

// Overpass API for real infrastructure data
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Fetches real infrastructure data from OpenStreetMap for a given bounding box.
 * This replaces the hardcoded SAMPLE_DATA.
 */
export async function fetchRealAssets(minLat: number, minLon: number, maxLat: number, maxLon: number): Promise<Asset[]> {
  // Overpass QL query to find critical infrastructure in the bounding box
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](${minLat},${minLon},${maxLat},${maxLon});
      node["amenity"="shelter"](${minLat},${minLon},${maxLat},${maxLon});
      node["power"="substation"](${minLat},${minLon},${maxLat},${maxLon});
      node["man_made"="mast"]["communication:mobile_phone"="yes"](${minLat},${minLon},${maxLat},${maxLon});
      way["highway"~"primary|trunk"](${minLat},${minLon},${maxLat},${maxLon});
      node["man_made"="water_works"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out body center;
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'data=' + encodeURIComponent(query),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error('Overpass API failed');
    const data = await response.json();
    
    return data.elements.map((el: any, index: number) => {
      // Determine type based on OSM tags
      let type = 'road';
      if (el.tags?.amenity === 'hospital') type = 'hospital';
      if (el.tags?.amenity === 'shelter') type = 'shelter';
      if (el.tags?.power === 'substation') type = 'power';
      if (el.tags?.man_made === 'mast') type = 'telecom';
      if (el.tags?.man_made === 'water_works') type = 'water';

      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      const name = el.tags?.name || `Unnamed ${TYPES[type]?.label || type}`;

      return {
        id: index + 1000, // offset to avoid collision with sample data
        name,
        type,
        lon,
        lat,
        elev: 10, // Default elevation, in a real app this would use an Elevation API (like Open-Meteo Elevation)
        cond: 3,  // Default condition (Fair)
        cap: 100, // Default capacity
        k: K(lon, lat)
      };
    }).filter((a: any) => a.lat && a.lon);
  } catch (error) {
    console.error("Failed to fetch real assets:", error);
    return [];
  }
}

/**
 * Fetches active tropical cyclones globally from GDACS.
 */
export async function fetchActiveCyclones() {
  try {
    const response = await fetch(GDACS_API_URL);
    if (!response.ok) throw new Error('GDACS API failed');
    const data = await response.json();
    
    // Parse GDACS features into our StormState format
    return data.features || [];
  } catch (error) {
    console.error("Failed to fetch real cyclones:", error);
    return [];
  }
}
