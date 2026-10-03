import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Wind, Waves, ShieldAlert, Radar, Phone } from 'lucide-react';
import { runModel } from './lib/simulation';
import type { StormState } from './lib/simulation';
import { PRESETS, SAMPLE_DATA, buildAssets, nearestCoast, K, REGIONS, type Asset } from './lib/model';
import { fetchActiveCyclones } from './lib/api';
import ASSET_DB from './lib/assets.json';
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
  
  
  const togglePlay = () => {
    if (storm.t >= 60 && !isPlaying) {
      setStorm(s => ({ ...s, t: 0 }));
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative w-screen h-screen bg-background text-text overflow-hidden font-body text-sm selection:bg-accent/30">
      
      {/* Map View (Background) */}
      {(appMode === 'cyclone' || appMode === 'evacuation') && (
        <div className="absolute inset-0 z-0">
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
        </div>
      )}

      {/* Floating Sidebar (Top Left) */}
      <aside className="absolute top-4 left-4 w-[280px] bg-panel/95 backdrop-blur-md rounded-2xl shadow-glass border border-border/50 flex flex-col p-4 z-10">
        <div className="flex items-center gap-3 mb-6 px-2 mt-2">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-white/10">
            <Radar className="w-6 h-6 text-[#202124]" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide text-text">AeroGrid</h1>
            <p className="text-[10px] text-[#9AA0A6] uppercase tracking-widest font-mono font-bold">Disaster Desk</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setAppMode('cyclone')}
            className={cn("flex items-center gap-4 px-4 py-3 rounded-full text-sm font-medium transition-all", appMode === 'cyclone' ? "bg-[#303134] text-[#E8EAED]" : "hover:bg-[#303134] text-[#9AA0A6] hover:text-[#E8EAED]")}
          >
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", appMode === 'cyclone' ? "bg-[#8AB4F8]" : "bg-[#8AB4F8]/20")}>
              <Wind className={cn("w-4 h-4", appMode === 'cyclone' ? "text-[#202124]" : "text-[#8AB4F8]")} />
            </div>
            Cyclone Impact
          </button>
          <button 
            onClick={() => setAppMode('evacuation')}
            className={cn("flex items-center gap-4 px-4 py-3 rounded-full text-sm font-medium transition-all", appMode === 'evacuation' ? "bg-[#303134] text-[#E8EAED]" : "hover:bg-[#303134] text-[#9AA0A6] hover:text-[#E8EAED]")}
          >
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", appMode === 'evacuation' ? "bg-[#81C995]" : "bg-[#81C995]/20")}>
              <ShieldAlert className={cn("w-4 h-4", appMode === 'evacuation' ? "text-[#202124]" : "text-[#81C995]")} />
            </div>
            Evacuation & Risk
          </button>
          <button 
            onClick={() => setAppMode('flood')}
            className={cn("flex items-center gap-4 px-4 py-3 rounded-full text-sm font-medium transition-all", appMode === 'flood' ? "bg-[#303134] text-[#E8EAED]" : "hover:bg-[#303134] text-[#9AA0A6] hover:text-[#E8EAED]")}
          >
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", appMode === 'flood' ? "bg-[#78D9EC]" : "bg-[#78D9EC]/20")}>
              <Waves className={cn("w-4 h-4", appMode === 'flood' ? "text-[#202124]" : "text-[#78D9EC]")} />
            </div>
            Coastal Floods
          </button>
        </nav>

        <div className="mt-6 pt-6 border-t border-border/50">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-subtext mb-4 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" /> Emergency Contacts
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#9AA0A6]">NDRF Control Room</span>
              <span className="font-mono text-white">112</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#9AA0A6]">Coast Guard</span>
              <span className="font-mono text-white">1554</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#9AA0A6]">Ambulance</span>
              <span className="font-mono text-white">108</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Floating Top Controls (Top Center) */}
      {(appMode === 'cyclone' || appMode === 'evacuation') && (
        <div className="absolute top-4 left-[300px] z-10 flex items-center gap-3">
          <div className="bg-panel/95 backdrop-blur-md rounded-full shadow-glass border border-border/50 px-6 py-3 flex items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-subtext">Region</label>
              <select 
                value={region} 
                onChange={e => setRegion(e.target.value)}
                className="bg-transparent text-sm text-text font-bold outline-none cursor-pointer"
              >
                {Object.entries(REGIONS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>
            
            <div className="w-px h-6 bg-border/50"></div>
            
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-subtext">
                Scenario {loadingAssets && <span className="text-accent animate-pulse ml-1">(Loading...)</span>}
              </label>
              <select 
                value={preset} 
                onChange={e => setPreset(e.target.value)}
                className="bg-transparent text-sm text-text font-bold outline-none cursor-pointer max-w-[250px] truncate"
              >
                <optgroup label="🔴 Live Data">
                  {activeCyclones.map(c => (
                    <option key={c.properties?.eventid} value={`live_${c.properties?.eventid}`}>
                      {c.properties?.name || 'Unnamed'}
                    </option>
                  ))}
                  {activeCyclones.length === 0 && <option disabled>No active cyclones</option>}
                </optgroup>
                {Object.entries(REGIONS).map(([regKey, regVal]) => (
                  <optgroup key={regKey} label={`📊 ${regVal.name}`}>
                    {Object.entries(PRESETS).filter(([_, v]) => v.region === regKey).map(([k, v]) => (
                      <option key={k} value={k}>{v.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Floating Right Panel (Details) */}
      {(appMode === 'cyclone' || appMode === 'evacuation') && (
        <div className="absolute top-4 right-4 bottom-24 w-[420px] bg-panel/95 backdrop-blur-xl rounded-2xl shadow-glass border border-border/50 flex flex-col z-10 overflow-hidden">
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
      )}

      {/* Floating Timeline Control (Bottom Left) */}
      {(appMode === 'cyclone' || appMode === 'evacuation') && (
        <div className="absolute bottom-6 left-6 z-20 w-[420px]">
          <div className="bg-[#202124]/95 backdrop-blur-md rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.3)] border border-[#3C4043] p-4 flex items-center gap-4">
            <button 
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white text-[#202124] flex items-center justify-center hover:bg-white/90 transition-transform hover:scale-105 active:scale-95 shadow-md flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-1 fill-current" />}
            </button>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex justify-between text-[11px] font-semibold text-[#9AA0A6] px-1">
                <span>Landfall (-36h)</span>
                <span className="text-white bg-white/10 px-2 py-0.5 rounded-full">T+{storm.t}h</span>
                <span>Post (+24h)</span>
              </div>
              <input 
                type="range" 
                min="0" max="60" step="1" 
                value={storm.t} 
                onChange={e => {
                  setStorm(s => ({ ...s, t: +e.target.value }));
                  setIsPlaying(false);
                }}
                className="w-full accent-white cursor-pointer bg-[#3C4043] h-2 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


