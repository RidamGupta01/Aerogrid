# CycloneCare

A live early-warning dashboard for tropical-cyclone events, local weather forecasts, satellite imagery, and mapped hospitals/shelters. Values come from connected providers; unsupported measurements are shown as unavailable rather than simulated.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The primary feeds work without API keys. Optional OpenWeather map layers require `VITE_OPENWEATHER_API_KEY`; see `.env.example` and [API_REQUIREMENTS.md](API_REQUIREMENTS.md) for the full provider list, setup, data interpretation, and production notes.

## Run with Docker

```sh
docker build -t cycloncare .
docker run --rm -p 8080:8080 cycloncare
```

Open `http://localhost:8080`. To include optional OpenWeather overlays, pass the restricted, browser-visible key during the image build:

```sh
docker build --build-arg VITE_OPENWEATHER_API_KEY=your_restricted_public_key -t cycloncare .
```

Vite embeds `VITE_` values in client assets. Do not pass privileged/private keys as build arguments; `.env` files and private-key files are excluded from the build context.

## Checks

```sh
npm run build
npm run lint
```

The build runs TypeScript and Vite. The lint script uses the installed Oxlint native binding.
