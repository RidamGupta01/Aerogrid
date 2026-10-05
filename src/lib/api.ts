import type { Asset } from './model';
import { K, TYPES } from './model';

// GDACS API for real-time cyclone tracks
const GDACS_API_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=TC';

// Overpass API for real infrastructure data
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export interface LiveCyclone {
  id: string;
  name: string;
  alertLevel: string | null;
  eventType: string | null;
  coordinates: [number, number][];
  windSpeedKmh: number | null;
  updatedAt: string | null;
  sourceUrl: string | null;
}

export interface WeatherSnapshot {
  location: { name: string; latitude: number; longitude: number; timezone: string };
  current: {
    time: string;
    temperatureC: number | null;
    humidityPct: number | null;
    windKmh: number | null;
    windDirection: number | null;
    pressureHpa: number | null;
    precipitationMm: number | null;
    weatherCode: number | null;
  };
  daily: Array<{
    date: string;
    maxC: number | null;
    minC: number | null;
    precipitationMm: number | null;
    maxWindKmh: number | null;
  }>;
}

export interface GeoLocation {
  name: string;
  country: string;
  admin1: string | null;
  latitude: number;
  longitude: number;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function flattenCoordinates(geometry: any): [number, number][] {
  if (!geometry?.coordinates || !['Point', 'MultiPoint'].includes(geometry.type)) return [];
  const pairs: [number, number][] = [];
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      pairs.push([value[0], value[1]]);
      return;
    }
    value.forEach(visit);
  };
  visit(geometry.coordinates);
  return pairs;
}

function withTimeout<T>(request: (signal: AbortSignal) => Promise<T>, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return request(controller.signal).finally(() => clearTimeout(timeout));
}

/**
 * Fetches real infrastructure data from OpenStreetMap for a given bounding box.
 * This replaces the hardcoded SAMPLE_DATA.
 */
export async function fetchRealAssets(minLat: number, minLon: number, maxLat: number, maxLon: number): Promise<Asset[]> {
  // Keep this bounded query focused on public-facing hospitals and shelters.
  const query = `
    [out:json][timeout:20];
    (
      nwr["amenity"~"^(hospital|shelter)$"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out center 300;
  `;

  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await withTimeout(signal => fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal
      }), 7000);
      if (!response.ok) {
        lastError = new Error(`Overpass API failed (${response.status})`);
        continue;
      }
      const data = await response.json();
      return (data.elements || []).map((el: any, index: number) => {
        const type = el.tags?.amenity === 'shelter' ? 'shelter' : 'hospital';
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        return {
          id: Number(el.id) || index + 1000,
          name: el.tags?.name || `Unnamed ${TYPES[type].label}`,
          type,
          lon,
          lat,
          elev: Number(el.tags?.ele) || 0,
          cond: 0,
          cap: Number(el.tags?.capacity) || 0,
          k: K(lon, lat)
        } as Asset;
      }).filter((asset: Asset) => Number.isFinite(asset.lat) && Number.isFinite(asset.lon));
    } catch (error) {
      lastError = error;
      continue;
    }
  }
  throw lastError || new Error('All Overpass endpoints are unavailable');
}

/**
 * Fetches active tropical cyclones globally from GDACS.
 */
export async function fetchActiveCyclones(): Promise<LiveCyclone[]> {
  const response = await withTimeout(signal => fetch(GDACS_API_URL, { signal }));
  if (!response.ok) throw new Error(`GDACS API failed (${response.status})`);
  const data = await response.json();
  const features = (data.features || []).filter((feature: any) => {
    const properties = feature.properties || {};
    const endsAt = properties.todate ? Date.parse(properties.todate) : NaN;
    return properties.eventtype === 'TC' && String(properties.iscurrent).toLowerCase() !== 'false' && (!Number.isFinite(endsAt) || endsAt >= Date.now());
  });
  return features.map((feature: any): LiveCyclone => {
    const properties = feature.properties || {};
    const severity = finiteNumber(properties.severitydata?.severity);
    const severityUnit = String(properties.severitydata?.severityunit || '').toLowerCase();
    const publishedWind = finiteNumber(properties.maxwind ?? properties.wind_speed ?? properties.maxWind);
    const windSpeedKmh = publishedWind ?? (severity == null ? null : severityUnit.includes('km/h') || severityUnit.includes('kmh')
      ? severity
      : severityUnit.includes('m/s') ? severity * 3.6
        : severityUnit.includes('mph') ? severity * 1.60934 : null);
    return {
      id: String(properties.eventid ?? properties.event_id ?? properties.id ?? feature.id ?? ''),
      name: String(properties.name || properties.eventname || 'Unnamed cyclone'),
      alertLevel: properties.alertlevel ? String(properties.alertlevel) : null,
      eventType: properties.eventtype ? String(properties.eventtype) : null,
      coordinates: flattenCoordinates(feature.geometry),
      windSpeedKmh,
      updatedAt: properties.datemodified ? String(properties.datemodified) : properties.updated ? String(properties.updated) : null,
      sourceUrl: properties.url?.report ? String(properties.url.report) : null
    };
  }).filter((cyclone: LiveCyclone) => cyclone.id.length > 0);
}

export async function searchLocations(query: string): Promise<GeoLocation[]> {
  const params = new URLSearchParams({ name: query, count: '6', language: 'en', format: 'json' });
  const response = await withTimeout(signal => fetch(`${GEOCODING_API_URL}?${params}`, { signal }));
  if (!response.ok) throw new Error(`Location search failed (${response.status})`);
  const data = await response.json();
  return (data.results || []).map((place: any): GeoLocation => ({
    name: String(place.name),
    country: String(place.country || ''),
    admin1: place.admin1 ? String(place.admin1) : null,
    latitude: place.latitude,
    longitude: place.longitude
  }));
}

export async function fetchWeather(latitude: number, longitude: number, name: string): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,precipitation,pressure_msl,wind_speed_10m,wind_direction_10m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
    forecast_days: '5',
    timezone: 'auto',
    wind_speed_unit: 'kmh'
  });
  const response = await withTimeout(signal => fetch(`${WEATHER_API_URL}?${params}`, { signal }));
  if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
  const data = await response.json();
  const current = data.current || {};
  const daily = data.daily || {};
  return {
    location: { name, latitude, longitude, timezone: String(data.timezone || 'UTC') },
    current: {
      time: String(current.time || ''),
      temperatureC: finiteNumber(current.temperature_2m),
      humidityPct: finiteNumber(current.relative_humidity_2m),
      windKmh: finiteNumber(current.wind_speed_10m),
      windDirection: finiteNumber(current.wind_direction_10m),
      pressureHpa: finiteNumber(current.pressure_msl),
      precipitationMm: finiteNumber(current.precipitation),
      weatherCode: finiteNumber(current.weather_code)
    },
    daily: (daily.time || []).map((date: string, index: number) => ({
      date,
      maxC: finiteNumber(daily.temperature_2m_max?.[index]),
      minC: finiteNumber(daily.temperature_2m_min?.[index]),
      precipitationMm: finiteNumber(daily.precipitation_sum?.[index]),
      maxWindKmh: finiteNumber(daily.wind_speed_10m_max?.[index])
    }))
  };
}
