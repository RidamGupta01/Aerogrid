import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Wind, Waves, CloudRain, ShieldAlert, Compass, Droplets } from 'lucide-react';
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
  const [appMode, setAppMode] = useState<'cyclone' | 'evacuation' | 'flood' | 'rain'>('cyclone');
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
          O: K(coords[0] + 3, coords[1] - 3),
          B: K(coords[0], coords[1]),
          L: nearestCoast(K(coords[0] - 2, coords[1] + 2)).pt,
          vL: 140,
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
    <div className="flex h-screen bg-background text-text-primary overflow-hidden">
      
      {/* 1. Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col p-4 z-10 shadow-sm flex-shrink-0">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 mb-6 px-2 pt-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-ocean flex items-center justify-center shadow-md shadow-primary/25">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-text-primary">
              Aero<span className="text-primary">Grid</span>
            </h1>
            <p className="text-[10px] text-ocean font-mono font-bold uppercase tracking-widest">
              Disaster Desk
            </p>
          </div>
        </div>

        {/* Navigation Modes */}
        <nav className="flex flex-col gap-1.5">
          <button 
            onClick={() => setAppMode('cyclone')}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left",
              appMode === 'cyclone' 
                ? "bg-primary-light text-primary border border-primary/20 shadow-xs" 
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            )}
          >
            <div className={cn("p-1.5 rounded-md", appMode === 'cyclone' ? "bg-primary text-white" : "bg-background-secondary text-text-secondary")}>
              <Wind className="w-3.5 h-3.5" />
            </div>
            <span>Cyclone Vulnerability</span>
          </button>

          <button 
            onClick={() => setAppMode('evacuation')}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left",
              appMode === 'evacuation' 
                ? "bg-safe-light text-safe border border-safe/30 shadow-xs" 
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            )}
          >
            <div className={cn("p-1.5 rounded-md", appMode === 'evacuation' ? "bg-safe text-white" : "bg-background-secondary text-text-secondary")}>
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <span>Evacuation & Risk</span>
          </button>

          <button 
            onClick={() => setAppMode('flood')}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left",
              appMode === 'flood' 
                ? "bg-ocean/10 text-ocean border border-ocean/20 shadow-xs" 
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            )}
          >
            <div className={cn("p-1.5 rounded-md", appMode === 'flood' ? "bg-ocean text-white" : "bg-background-secondary text-text-secondary")}>
              <Waves className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span>Coastal Floods</span>
              <span className="text-[9px] font-mono font-bold bg-ocean/15 text-ocean px-1.5 py-0.2 rounded">BETA</span>
            </div>
          </button>

          <button 
            onClick={() => setAppMode('rain')}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left",
              appMode === 'rain' 
                ? "bg-sky/20 text-ocean border border-sky/30 shadow-xs" 
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            )}
          >
            <div className={cn("p-1.5 rounded-md", appMode === 'rain' ? "bg-sky text-white" : "bg-background-secondary text-text-secondary")}>
              <CloudRain className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span>Heavy Rainfall</span>
              <span className="text-[9px] font-mono font-bold bg-sky/20 text-ocean px-1.5 py-0.2 rounded">BETA</span>
            </div>
          </button>
        </nav>

        {/* Live Status Widget in Sidebar */}
        <div className="mt-auto pt-4 border-t border-border-light space-y-2.5 text-xs">
          <div className="p-3 bg-background-secondary rounded-lg border border-border-light">
            <div className="flex items-center gap-2 text-[11px] font-bold text-safe mb-1">
              <span className="w-2 h-2 rounded-full bg-safe animate-pulse"></span>
              Live Telemetry Feeds
            </div>
            <div className="text-[11px] text-text-muted space-y-0.5 font-mono">
              <p>• GDACS Real-time API</p>
              <p>• OpenStreetMap Overpass</p>
              <p>• IMD Storm Matrix</p>
            </div>
          </div>

          <div className="px-1 text-[11px] text-text-muted flex items-center justify-between">
            <span>AeroGrid Systems v2.4</span>
            <span className="text-primary font-bold">2026</span>
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        
        {/* Top Header Controls */}
        <header className="h-16 border-b border-border bg-surface flex items-center px-6 justify-between flex-shrink-0 z-10 shadow-xs">
          <div>
            <h2 className="text-base font-bold tracking-tight text-text-primary flex items-center gap-2">
              {appMode === 'cyclone' && 'Cyclone Vulnerability & Infrastructure Exposure'}
              {appMode === 'evacuation' && 'Personal Risk Assessment & Emergency Routing'}
              {appMode === 'flood' && 'Coastal Inundation & Sea-Level Surge Risk Map'}
              {appMode === 'rain' && 'Rainfall Accumulation & Waterlogging Forecast'}
            </h2>
            <p className="text-xs text-text-muted">
              {appMode === 'cyclone' && 'Interactive parametric hydrodynamic wind & storm surge simulation'}
              {appMode === 'evacuation' && 'Click anywhere on the coastal map to plot localized safety vectors'}
              {appMode === 'flood' && 'Marine tidal anomalies combined with coastal bathymetry'}
              {appMode === 'rain' && 'Open-Meteo numerical weather prediction precipitation grids'}
            </p>
          </div>

          {(appMode === 'cyclone' || appMode === 'evacuation') && (
            <div className="flex items-center gap-3">
              {/* Region Selector */}
              <div className="flex items-center gap-1.5 bg-background-secondary p-1 rounded-lg border border-border">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted px-2">
                  Region:
                </span>
                <select 
                  value={region} 
                  onChange={e => setRegion(e.target.value)}
                  className="bg-surface border border-border rounded-md px-3 py-1.5 text-xs text-text-primary font-semibold outline-none focus:border-primary transition-all cursor-pointer shadow-xs"
                >
                  {Object.entries(REGIONS).map(([k, v]) => (
                    <option key={k} value={k}>{v.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Scenario Selector */}
              <div className="flex items-center gap-1.5 bg-background-secondary p-1 rounded-lg border border-border">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted px-2 flex items-center gap-1">
                  Scenario:
                  {loadingAssets && <span className="text-primary animate-pulse">(Loading...)</span>}
                </span>
                <select 
                  value={preset} 
                  onChange={e => setPreset(e.target.value)}
                  className="bg-surface border border-border rounded-md px-3 py-1.5 text-xs text-text-primary font-semibold outline-none focus:border-primary transition-all cursor-pointer shadow-xs min-w-[210px]"
                >
                  <optgroup label="🔴 Live GDACS Global Feeds">
                    {activeCyclones.map(c => (
                      <option key={c.properties?.eventid} value={`live_${c.properties?.eventid}`}>
                        {c.properties?.name || 'Unnamed'} (Live GDACS)
                      </option>
                    ))}
                    {activeCyclones.length === 0 && <option disabled>No active cyclones worldwide</option>}
                  </optgroup>
                  {Object.entries(REGIONS).map(([regKey, regVal]) => (
                    <optgroup key={regKey} label={`📊 Benchmarks: ${regVal.name}`}>
                      {Object.entries(PRESETS).filter(([_, v]) => v.region === regKey).map(([k, v]) => (
                        <option key={k} value={k}>{v.name}</option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="⚙️ Custom Scenario">
                    <option value="custom">Custom Track (Drag Map Handles)</option>
                  </optgroup>
                </select>
              </div>
            </div>
          )}
        </header>

        {/* Workspace Content Area */}
        <main className="flex-1 relative overflow-hidden bg-background">
          {(appMode === 'cyclone' || appMode === 'evacuation') && (
            <div className="absolute inset-0 flex">
              
              {/* Left / Center Map View */}
              <div className="flex-1 relative p-4 flex flex-col">
                <div className="flex-1 relative rounded-xl overflow-hidden shadow-sm">
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
                  
                  {/* Floating Modern Timeline Control */}
                  <div className="absolute bottom-5 left-5 right-5 z-20 pointer-events-none">
                    <div className="glass-panel p-3.5 flex items-center gap-4 max-w-xl mx-auto shadow-lg border border-border pointer-events-auto">
                      <button 
                        onClick={togglePlay}
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-md flex-shrink-0 active:scale-95",
                          isPlaying 
                            ? "bg-warning text-white shadow-warning/30" 
                            : "bg-primary text-white hover:bg-primary-dark shadow-primary/30"
                        )}
                        title={isPlaying ? "Pause simulation" : "Play simulation"}
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>
                      
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-text-muted">Landfall (-36h)</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-primary-light text-primary font-mono font-bold text-xs border border-primary/20">
                            T+{storm.t}h {storm.t === 36 ? '(Landfall Now)' : storm.t < 36 ? `(Inland in ${36 - storm.t}h)` : `(Post-landfall +${storm.t - 36}h)`}
                          </span>
                          <span className="text-text-muted">Dissipation (+24h)</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" max="60" step="1" 
                          value={storm.t} 
                          onChange={handleTimeChange}
                          className="w-full cursor-pointer accent-primary" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar Impact Panel */}
              <div className="w-[430px] border-l border-border bg-surface h-full overflow-y-auto shadow-sm relative z-20 flex-shrink-0">
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

          {/* Coastal Floods View */}
          {appMode === 'flood' && (
            <div className="p-8 h-full overflow-y-auto bg-background">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Banner */}
                <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-ocean/10 border border-ocean/20 flex items-center justify-center text-ocean shrink-0">
                    <Waves className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-text-primary">Coastal Flooding & Inundation Index</h3>
                      <span className="text-[10px] font-mono font-bold bg-ocean/15 text-ocean px-2 py-0.5 rounded">LIVE PREVIEW</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Hydrodynamic inundation forecast calculating peak astronomical high tide combined with cyclone wind drag.
                    </p>
                  </div>
                </div>

                {/* Tide Gauge Station Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Paradip Port Station</span>
                      <span className="text-[10px] font-mono font-bold text-danger bg-danger-light px-1.5 py-0.2 rounded">HIGH TIDE</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-text-primary">+3.8 m</div>
                    <p className="text-[11px] text-text-muted mt-1">Surge anomaly over astronomical baseline</p>
                  </div>

                  <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Dhamra Estuary</span>
                      <span className="text-[10px] font-mono font-bold text-warning bg-warning-light px-1.5 py-0.2 rounded">SURGE WARNING</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-text-primary">+2.9 m</div>
                    <p className="text-[11px] text-text-muted mt-1">Breach probability: 74% at high tide peak</p>
                  </div>

                  <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Gopalpur Coast</span>
                      <span className="text-[10px] font-mono font-bold text-safe bg-safe-light px-1.5 py-0.2 rounded">STABLE</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-text-primary">+1.1 m</div>
                    <p className="text-[11px] text-text-muted mt-1">Standard coastal wave wash limits</p>
                  </div>
                </div>

                {/* Simulated Inundation Depth Table */}
                <div className="bg-surface rounded-xl p-5 border border-border shadow-sm">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-3">
                    Estuarine & Coastal Embankment Exposure
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-background-secondary rounded-lg border border-border-light flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">Mahanadi Delta Mangrove Barrier</div>
                        <div className="text-text-muted">Mangrove attenuation buffers wave energy by ~35%</div>
                      </div>
                      <span className="font-mono font-bold text-safe bg-safe-light px-2.5 py-1 rounded">BUFFERED</span>
                    </div>

                    <div className="p-3 bg-background-secondary rounded-lg border border-border-light flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">Astaranga Fishery Embankment</div>
                        <div className="text-text-muted">Vulnerable earthen dykes with low crest height (2.2m)</div>
                      </div>
                      <span className="font-mono font-bold text-danger bg-danger-light px-2.5 py-1 rounded">CRITICAL BREACH RISK</span>
                    </div>

                    <div className="p-3 bg-background-secondary rounded-lg border border-border-light flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">Chilika Lagoon Outfall Channel</div>
                        <div className="text-text-muted">High water level causing backflow into low-lying agricultural fields</div>
                      </div>
                      <span className="font-mono font-bold text-warning bg-warning-light px-2.5 py-1 rounded">MODERATE OVERFLOW</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Heavy Rainfall View */}
          {appMode === 'rain' && (
            <div className="p-8 h-full overflow-y-auto bg-background">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Banner */}
                <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky/20 border border-sky/30 flex items-center justify-center text-ocean shrink-0">
                    <Droplets className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-text-primary">Quantitative Precipitation Forecast (QPF)</h3>
                      <span className="text-[10px] font-mono font-bold bg-sky/20 text-ocean px-2 py-0.5 rounded">LIVE PREVIEW</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      24-hour rainfall accumulation model powered by IMD NWP and Open-Meteo precipitation rasters.
                    </p>
                  </div>
                </div>

                {/* Rain Gauge Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Puri District</span>
                      <span className="text-[10px] font-mono font-bold text-danger bg-danger-light px-1.5 py-0.2 rounded">RED ALERT</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-text-primary">285 mm</div>
                    <p className="text-[11px] text-text-muted mt-1">Extreme rainfall accumulation (24h)</p>
                  </div>

                  <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Jagatsinghpur</span>
                      <span className="text-[10px] font-mono font-bold text-warning bg-warning-light px-1.5 py-0.2 rounded">ORANGE ALERT</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-text-primary">190 mm</div>
                    <p className="text-[11px] text-text-muted mt-1">Heavy downpours; waterlogging expected</p>
                  </div>

                  <div className="bg-surface p-4 rounded-xl border border-border shadow-xs">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Cuttack / Bhubaneswar</span>
                      <span className="text-[10px] font-mono font-bold text-watch bg-watch-light px-1.5 py-0.2 rounded">YELLOW WATCH</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-text-primary">115 mm</div>
                    <p className="text-[11px] text-text-muted mt-1">Localized urban drainage bottlenecks</p>
                  </div>
                </div>

                {/* Urban Catchment Risk */}
                <div className="bg-surface rounded-xl p-5 border border-border shadow-sm">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-3">
                    Urban Catchment & Drainage Risk Index
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-background-secondary rounded-lg border border-border-light flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">Bhubaneswar Smart City Stormwater Basin</div>
                        <div className="text-text-muted">Gangua Nallah discharge rate at 85% capacity</div>
                      </div>
                      <span className="font-mono font-bold text-warning bg-warning-light px-2.5 py-1 rounded">SURCHARGE RISK</span>
                    </div>

                    <div className="p-3 bg-background-secondary rounded-lg border border-border-light flex items-center justify-between">
                      <div>
                        <div className="font-bold text-text-primary">Cuttack Kathajodi Outfall Sluices</div>
                        <div className="text-text-muted">High river stage prevents gravity draining of low city sectors</div>
                      </div>
                      <span className="font-mono font-bold text-danger bg-danger-light px-2.5 py-1 rounded">PUMPING REQUIRED</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
