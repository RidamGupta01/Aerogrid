const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(
  "import { fetchActiveCyclones, fetchRealAssets } from './lib/api';",
  "import { fetchActiveCyclones } from './lib/api';\nimport ASSET_DB from './lib/assets.json';"
);

const oldUseEffect = `  // Handle Region change
  useEffect(() => {
    async function load() {
      setLoadingAssets(true);
      const r = REGIONS[region];
      const bounds = r.bounds;
      const newAssets = await fetchRealAssets(bounds[0], bounds[1], bounds[2], bounds[3]);
      if (newAssets.length > 0) {
        setAssets(newAssets);
      } else {
        setAssets(initialAssets);
      }
      setLoadingAssets(false);
      setPreset(r.defaultPreset);
    }
    load();
  }, [region]);`;

const newUseEffect = `  // Handle Region change
  useEffect(() => {
    setLoadingAssets(true);
    const r = REGIONS[region];
    // @ts-ignore
    const regionData = ASSET_DB[region] || [];
    const newAssets = buildAssets(regionData);
    
    if (newAssets.length > 0) {
      setAssets(newAssets);
    } else {
      setAssets(initialAssets);
    }
    
    setLoadingAssets(false);
    setPreset(r.defaultPreset);
  }, [region]);`;

app = app.replace(oldUseEffect, newUseEffect);
fs.writeFileSync('src/App.tsx', app);
console.log('App patched');
