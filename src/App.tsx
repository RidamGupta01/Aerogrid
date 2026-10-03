import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Wind, Waves, CloudRain, ShieldAlert, Layers } from 'lucide-react';
import { runModel } from './lib/simulation';
import type { StormState } from './lib/simulation';
import { PRESETS, SAMPLE_DATA, buildAssets, nearestCoast, K, REGIONS, type Asset } from './lib/model';
import { fetchRealAssets, fetchActiveCyclones } from './lib/api';
import { MapView } from './components/MapView.tsx';
import { SidePanel } from './components/SidePanel.tsx';
import { EvacuationPanel } from './components/EvacuationPanel.tsx';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const initialPreset = 'fani';
const initialAssets = buildAssets(SAMPLE_DATA);

export default function App() {
  const [appMode, setAppMode] = useState('cyclone');
  const [preset, setPreset] = useState(initialPreset);
  const [activeCyclones, setActiveCyclones] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const [storm, setStorm] = useState<StormState>(() => {
    const p = PRESETS[initialPreset];
    return {
      O: K(p.O[0], p.O[1]),
      B: K(p.B[0], p.B[1]),
      L: nearestCoast(K(p.L[0], p.L[1])).pt,
      vL: p.vL,
      rm: p.rm,
      t: 6
    };
  });
  
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [region, setRegion] = useState('odisha');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [swath, setSwath] = useState(true);
  const [dnames, setDnames] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  
  const currentBounds = REGIONS[region].bounds;
  const mapBounds: [[number, number], [number, number]] = [
    [currentBounds[0], currentBounds[1]],
    [currentBounds[2], currentBounds[3]]
  ];
  
  // Calculate model
  const model = useMemo(() => runModel(storm, assets), [storm, assets]);

  // Fetch Live Cyclones
  useEffect(() => {
    fetchActiveCyclones().then(list => setActiveCyclones(list || []));
  }, []);

  // Handle Preset change
  useEffect(() => {
    if (preset === 'custom') return;
    
    if (preset.startsWith('live_')) {
      const cyc = activeCyclones.find(c => `live_${c.properties?.eventid}` === preset);
      if (cyc && cyc.geometry?.coordinates) {
        const coords = cyc.geometry.coordinates; // [lon, lat]
        setStorm(s => ({
          ...s,
          O: K(coords[0] + 3, coords[1] - 3), // Approximate past position
          B: K(coords[0], coords[1]),         // Current position
          L: nearestCoast(K(coords[0] - 2, coords[1] + 2)).pt, // Approximate landfall
          vL: 140, // Default to severe
          rm: 40
        }));
      }
      return;
    }

    const p = PRESETS[preset];
    if (p) {
      setStorm(s => ({
        ...s,
        O: K(p.O[0], p.O[1]),
        B: K(p.B[0], p.B[1]),
        L: nearestCoast(K(p.L[0], p.L[1])).pt,
        vL: p.vL,
        rm: p.rm
      }));
    }
  }, [preset, activeCyclones]);

  // Fetch real assets on region change
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
  }, [region]);

  // Playback timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setStorm(s => {
          if (s.t >= 60) {
            setIsPlaying(false);
            return s;
          }
          return { ...s, t: Math.min(60, s.t + 1) };
        });
      }, 160);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStorm(s => ({ ...s, t: Number(e.target.value) }));
  };
  
  const togglePlay = () => {
    if (storm.t >= 60 && !isPlaying) {
      setStorm(s => ({ ...s, t: 0 }));
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border/50 bg-panel/30 flex flex-col p-4 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-8 px-2 mt-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center shadow-lg shadow-accent/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight uppercase tracking-wide">AeroGrid</h1>
            <p className="text-[10px] text-subtext uppercase tracking-widest font-mono">Disaster Desk</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setAppMode('cyclone')}
            className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all", appMode === 'cyclone' ? "bg-accent/10 text-accent border border-accent/20" : "hover:bg-panel/50 text-subtext hover:text-text")}
          >
            <Wind className="w-4 h-4" /> Cyclone Impact
          </button>
          <button 
            onClick={() => setAppMode('evacuation')}
            className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all", appMode === 'evacuation' ? "bg-green-500/10 text-green-400 border border-green-500/20" : "hover:bg-panel/50 text-subtext hover:text-text")}
          >
            <ShieldAlert className="w-4 h-4" /> Evacuation & Risk
          </button>
          <button 
            onClick={() => setAppMode('flood')}
            className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all", appMode === 'flood' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "hover:bg-panel/50 text-subtext hover:text-text")}
          >
            <Waves className="w-4 h-4" /> Coastal Floods <span className="ml-auto text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">BETA</span>
          </button>
          <button 
            onClick={() => setAppMode('rain')}
            className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all", appMode === 'rain' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "hover:bg-panel/50 text-subtext hover:text-text")}
          >
            <CloudRain className="w-4 h-4" /> Heavy Rainfall <span className="ml-auto text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">BETA</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-border/50 px-2 text-xs text-subtext/70 space-y-2">
          <p className="flex items-center gap-2"><Layers className="w-3 h-3" /> Live Data: OSM & GDACS</p>
          <p>© 2026 AeroGrid Systems</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Controls */}
        <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur flex items-center px-6 justify-between flex-shrink-0 z-10">
          <h2 className="text-lg font-semibold tracking-tight text-white/90">
            {appMode === 'cyclone' && 'Cyclone Vulnerability Model'}
            {appMode === 'evacuation' && 'Personal Risk Assessment'}
            {appMode === 'flood' && 'Coastal Flood Risk Map'}
            {appMode === 'rain' && 'Rainfall Accumulation Forecast'}
          </h2>

          {(appMode === 'cyclone' || appMode === 'evacuation') && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono uppercase tracking-widest text-subtext">Region:</label>
                <select 
                  value={region} 
                  onChange={e => setRegion(e.target.value)}
                  className="bg-panel border border-border/60 rounded-md px-3 py-1.5 text-sm text-text font-medium outline-none focus:ring-1 focus:ring-accent transition-all cursor-pointer hover:border-border"
                >
                  {Object.entries(REGIONS).map(([k, v]) => (
                    <option key={k} value={k}>{v.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono uppercase tracking-widest text-subtext">
                  Scenario {loadingAssets && <span className="text-accent animate-pulse ml-1">(Fetching Assets...)</span>}
                </label>
                <select 
                  value={preset} 
                  onChange={e => setPreset(e.target.value)}
                  className="bg-panel border border-border/60 rounded-md px-3 py-1.5 text-sm text-text font-medium outline-none focus:ring-1 focus:ring-accent transition-all cursor-pointer hover:border-border min-w-[200px]"
                >
                  <optgroup label="🔴 Live Data (GDACS)">
                    {activeCyclones.map(c => (
                      <option key={c.properties?.eventid} value={`live_${c.properties?.eventid}`}>
                        {c.properties?.name || 'Unnamed'} (Live)
                      </option>
                    ))}
                    {activeCyclones.length === 0 && <option disabled>No active cyclones globally</option>}
                  </optgroup>
                  {Object.entries(REGIONS).map(([regKey, regVal]) => (
                    <optgroup key={regKey} label={`📊 Scenarios: ${regVal.name}`}>
                      {Object.entries(PRESETS).filter(([_, v]) => v.region === regKey).map(([k, v]) => (
                        <option key={k} value={k}>{v.name}</option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="⚙️ Custom Scenarios">
                    <option value="custom">Custom Track (Drag Map Handles)</option>
                  </optgroup>
                </select>
              </div>
            </div>
          )}
        </header>

        {/* Content Area */}
        <main className="flex-1 relative overflow-hidden bg-[#0A0E17]">
          {(appMode === 'cyclone' || appMode === 'evacuation') && (
            <div className="absolute inset-0 flex">
              {/* Map View */}
              <div className="flex-1 relative">
                <MapView 
                  storm={storm} 
                  setStorm={setStorm} 
                  model={model} 
                  setPreset={setPreset}
                  swath={swath}
                  selectedAssetId={selectedAssetId}
                  setSelectedAssetId={setSelectedAssetId}
                  appMode={appMode}
                  userLocation={userLocation}
                  setUserLocation={setUserLocation}
                  assets={assets}
                  mapBounds={mapBounds}
                />
                
                {/* Floating Timeline Control */}
                <div className="absolute bottom-6 left-6 right-6 z-20">
                  <div className="glass-panel p-4 flex items-center gap-4 max-w-2xl mx-auto shadow-2xl border-white/5">
                    <button 
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-accent/20 flex-shrink-0"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                    </button>
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-medium text-subtext px-1">
                        <span>Landfall (-36h)</span>
                        <span className="text-white">T+{storm.t}h</span>
                        <span>Post-storm (+24h)</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="60" step="1" 
                        value={storm.t} 
                        onChange={handleTimeChange}
                        className="w-full accent-accent cursor-pointer" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Impact Panel */}
              <div className="w-[420px] bg-background/95 backdrop-blur-xl border-l border-border/50 h-full overflow-y-auto shadow-2xl relative z-20">
                {appMode === 'cyclone' ? (
                  <SidePanel 
                    storm={storm} 
                    setStorm={setStorm} 
                    model={model}
                    swath={swath}
                    setSwath={setSwath}
                    dnames={dnames}
                    setDnames={setDnames}
                    setPreset={setPreset}
                    selectedAssetId={selectedAssetId}
                    setSelectedAssetId={setSelectedAssetId}
                  />
                ) : (
                  <EvacuationPanel
                    userLocation={userLocation}
                    storm={storm}
                    model={model}
                    assets={assets}
                  />
                )}
              </div>
            </div>
          )}

          {appMode === 'flood' && (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 to-background">
              <div className="max-w-md glass-panel p-8 rounded-3xl border-blue-500/20">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                  <Waves className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Coastal Floods</h3>
                <p className="text-subtext mb-6">Real-time sea-level anomaly integration and inundation modeling is currently in beta. We are incorporating Open-Meteo marine APIs.</p>
                <button className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-6 py-2 rounded-full text-sm font-medium hover:bg-blue-500/20 transition-all">Notify me when ready</button>
              </div>
            </div>
          )}

          {appMode === 'rain' && (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 to-background">
              <div className="max-w-md glass-panel p-8 rounded-3xl border-purple-500/20">
                <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(168,85,247,0.2)]">
                  <CloudRain className="w-10 h-10 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Heavy Rainfall</h3>
                <p className="text-subtext mb-6">Integrating IMD numerical weather prediction (NWP) grids and Open-Meteo precipitation forecasts to model urban waterlogging.</p>
                <button className="bg-purple-500/10 text-purple-400 border border-purple-500/30 px-6 py-2 rounded-full text-sm font-medium hover:bg-purple-500/20 transition-all">Notify me when ready</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
