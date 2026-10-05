# CycloneCare API and Data Requirements

## Current live integrations

| Provider | Used for | Key needed | Endpoint / access |
| --- | --- | --- | --- |
| GDACS | Active tropical-cyclone event names, alert levels, source update times, reported geometry, and event links | No | `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=TC` |
| Open-Meteo Forecast API | Current model weather values and five-day daily forecast for the selected coordinates | No | `https://api.open-meteo.com/v1/forecast` |
| Open-Meteo Geocoding API | City/place search used by the header search box | No | `https://geocoding-api.open-meteo.com/v1/search` |
| OpenStreetMap Overpass API | Mapped hospitals and shelters in the selected area | No | `https://overpass-api.de/api/interpreter`, then `https://overpass.private.coffee/api/interpreter` |
| OpenStreetMap tile service | The nearby-facilities inset map | No | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Esri World Imagery | Satellite base map | No | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` |
| OpenWeatherMap map tiles | Optional wind, pressure, rainfall, cloud, and temperature map overlays | **Yes** | `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={key}` |

The main weather, location search, cyclone event, satellite map, and facility map work without a paid API key, subject to public service availability and fair-use limits. The OpenWeather key is only needed for the selectable weather-tile overlays.

## Configure the optional key

1. For local development, create `.env.local` in the project root. For a Docker image, pass the value as a build argument instead (the `.dockerignore` intentionally prevents `.env.local` from entering the build context).
2. Add the key:

   ```dotenv
   VITE_OPENWEATHER_API_KEY=replace_with_your_openweathermap_key
   ```

3. Restart `npm run dev` (or rebuild for production). For Docker, use `docker build --build-arg VITE_OPENWEATHER_API_KEY=your_restricted_public_key -t cycloncare .`.
4. Restrict the OpenWeather key to the deployed site origins and the required tile service in the provider console. `VITE_` values are included in browser code and are **not secrets**; do not put privileged server keys here or commit `.env.local`.

`.env.example` is provided as a variable-name template. The optional key can be obtained from an OpenWeather account with map-tile access enabled. Check the provider's current plan and attribution requirements before production use.

## Feed interpretation and limits

- Weather current values are Open-Meteo model output, not station observations. The interface labels them as current model data.
- The GDACS search response can contain other hazard types and ended events even when queried for tropical cyclones. CycloneCare filters for `eventtype=TC` and current/unexpired events. If the feed has no currently valid event, the active alert count is zero.
- The GDACS event-list geometry is often a single centroid, not a historical or forecast track. CycloneCare plots only published point/multipoint positions and shows their count; it does not convert event polygons into a track or create a landfall prediction. Wind is shown only when GDACS supplies a speed with a known unit.
- GDACS failure is distinct from an empty active-event list. The app reports feed errors rather than claiming there are no storms.
- Overpass results describe mapped hospitals and shelters, not verified facility capacity, structural condition, service status, or safety. These are shown as nearby facilities, not as predicted impacts or confirmed evacuation destinations. If the public service and its mirrors time out, the dashboard reports an unavailable feed separately from an empty result.
- No official IMD warning feed, observed tide/surge feed, radar rainfall grid, population exposure, or historical cyclone archive is currently integrated. The app does not generate fake alerts or those values. Add an authoritative provider and its schema before enabling those operational claims.
- Browser geolocation is optional; place search can be used instead.

## Operational deployment notes

These public feeds may enforce rate limits, change schemas, or apply cross-origin rules. For a production emergency service, route requests through a monitored backend/API gateway, apply caching and timeouts, validate provider schemas, observe licensing/attribution terms, and add a clear degraded-data state. Do not treat this dashboard as a substitute for official warnings or emergency services.
