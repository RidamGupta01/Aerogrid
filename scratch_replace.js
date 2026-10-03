const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// The new App layout
const newLayout = `
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
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide text-text">AeroGrid</h1>
            <p className="text-[10px] text-accent uppercase tracking-widest font-mono font-bold">Disaster Desk</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setAppMode('cyclone')}
            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all", appMode === 'cyclone' ? "bg-accent/10 text-accent font-bold" : "hover:bg-panelHover text-subtext hover:text-text")}
          >
            <Wind className="w-4 h-4" /> Cyclone Impact
          </button>
          <button 
            onClick={() => setAppMode('evacuation')}
            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all", appMode === 'evacuation' ? "bg-green-500/10 text-green-600 font-bold" : "hover:bg-panelHover text-subtext hover:text-text")}
          >
            <ShieldAlert className="w-4 h-4" /> Evacuation & Risk
          </button>
          <button 
            onClick={() => setAppMode('flood')}
            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all", appMode === 'flood' ? "bg-blue-500/10 text-blue-600 font-bold" : "hover:bg-panelHover text-subtext hover:text-text")}
          >
            <Waves className="w-4 h-4" /> Coastal Floods <span className="ml-auto text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">BETA</span>
          </button>
        </nav>
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
                <optgroup label="🔴 Live Data (GDACS)">
                  {activeCyclones.map(c => (
                    <option key={c.properties?.eventid} value={\`live_\${c.properties?.eventid}\`}>
                      {c.properties?.name || 'Unnamed'} (Live)
                    </option>
                  ))}
                  {activeCyclones.length === 0 && <option disabled>No active cyclones</option>}
                </optgroup>
                {Object.entries(REGIONS).map(([regKey, regVal]) => (
                  <optgroup key={regKey} label={\`📊 Scenarios: \${regVal.name}\`}>
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
              assets={assets}
              selectedAssetId={selectedAssetId}
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

      {/* Floating Timeline Control (Bottom Center) */}
      {(appMode === 'cyclone' || appMode === 'evacuation') && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-[800px] px-4">
          <div className="bg-panel/95 backdrop-blur-md rounded-2xl shadow-glass border border-border/50 p-4 flex items-center gap-6">
            <button 
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-accent/20 flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex justify-between text-xs font-bold text-subtext px-2">
                <span>Landfall (-36h)</span>
                <span className="text-accent bg-accent/10 px-3 py-1 rounded-full">T+{storm.t}h</span>
                <span>Post-storm (+24h)</span>
              </div>
              <input 
                type="range" 
                min="0" max="60" step="1" 
                value={storm.t} 
                onChange={e => {
                  setStorm(s => ({ ...s, t: +e.target.value }));
                  setIsPlaying(false);
                }}
                className="w-full accent-accent cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
`;

const startIndex = code.indexOf('return (');
if (startIndex !== -1) {
  code = code.substring(0, startIndex) + newLayout;
  fs.writeFileSync('src/App.tsx', code);
  console.log("App.tsx replaced successfully!");
} else {
  console.log("Could not find return block.");
}
