import React, { useState } from 'react';
import { vmaxAt } from '../lib/simulation';
import type { StormState } from '../lib/simulation';
import { imd, LV, TYPES, TKEYS, COND, lonlat, nearestCoast, PLACES, dist, TL } from '../lib/model';

import { Settings2, ShieldAlert } from 'lucide-react';
import { cn } from '../App';

interface SidePanelProps {
  storm: StormState;
  setStorm: React.Dispatch<React.SetStateAction<StormState>>;
  model: any;
  swath: boolean;
  setSwath: (v: boolean) => void;
  dnames: boolean;
  setDnames: (v: boolean) => void;
  setPreset: (v: string) => void;
  selectedAssetId: number | null;
  setSelectedAssetId: (id: number | null) => void;
}

export function SidePanel({
  storm, setStorm, model,
  swath, setSwath, dnames, setDnames, setPreset,
  selectedAssetId, setSelectedAssetId
}: SidePanelProps) {
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [actionLang, setActionLang] = useState<'en' | 'hi' | 'or'>('en');

  const T = (t: number) => `T+${Math.round(t)}h`;
  const rel = (t: number) => {
    const d = Math.round(t - storm.t);
    return d > 0 ? `in ${d} h` : d === 0 ? 'now' : 'passed';
  };

  const placeName = (k: any) => {
    let best = null, bd = 1e9;
    PLACES.forEach((p: any) => { const d = dist(p.k, k); if(d < bd){ bd = d; best = p; } });
    return bd < 45 ? best!.n : 'the coast near ' + best!.n;
  };

  const getLevelColor = (level: number) => {
    return ['#10B981', '#FBBF24', '#F97316', '#EF4444'][level];
  };

  // Situation data
  const vL = storm.vL, cat = imd(vL), tr = model.tr, total = model.res.length || 1;
  const cur = lonlat(tr.pos(storm.t)), vn = model.sm.find((s:any)=>s.t === storm.t)?.v || vmaxAt(storm, storm.t), nc = nearestCoast(tr.pos(storm.t));
  const lf = lonlat(storm.L);
  const counts = [0,0,0,0]; model.res.forEach((r: any) => counts[r.level]++);

  // Actions
  const earliest = (list: any[]) => {
    const g = list.map(r => r.tg).filter(x => x !== null);
    return g.length ? Math.min(...g) : null;
  };
  
  const buildActions = () => {
    const A: any[] = [];
    const res = model.res;
    const byType = (t: string) => res.filter((r: any) => r.a.type === t).sort((a: any, b: any) => b.score - a.score);
    const hi = (r: any) => r.level >= 2;
    
    const dd = model.dists.filter((d: any) => d.peak >= 89).sort((a: any, b: any) => b.peak - a.peak);
    if(dd.length){
      const pop = dd.reduce((s: number, d: any) => s + d.d.pop, 0), eg = earliest(dd);
      A.push({ tag: 'People', title: `Start evacuation in ${dd.map((d:any)=>d.d.n).join(', ')}`, body: `${pop.toFixed(1)}M people live where winds reach 89+ km/h. Move people out of low-lying areas.`, by: eg === null ? null : Math.max(0, eg - 12) });
    } else {
      A.push({ tag: 'People', title: 'No district centre reaches 89 km/h', body: 'Keep warnings active.', by: null });
    }
    
    const sh = byType('shelter');
    if(sh.length){
      const bad = sh.filter(hi);
      A.push({ tag: 'Shelters', title: bad.length ? `${bad.length} of ${sh.length} shelters are unsafe` : 'All shelters hold within limits', body: bad.length ? `Avoid unsafe shelters, removes ${bad.reduce((s:number,r:any)=>s+r.a.cap,0)} places.` : 'Check stocks anyway.', by: bad.length && earliest(bad)!==null ? Math.max(0, earliest(bad)! - 12) : null });
    }
    return A;
  };

  const actions = buildActions();

  // Assets list
  const filteredAssets = model.rank.filter((r: any) => filter === 'all' || r.a.type === filter);
  const displayedAssets = showAll ? filteredAssets : filteredAssets.slice(0, 10);
  const activeAssetId = selectedAssetId !== null ? selectedAssetId : (model.rank.length ? model.rank[0].a.id : null);
  const activeAsset = model.res.find((r: any) => r.a.id === activeAssetId);

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto p-4 pb-24 custom-scrollbar">
      
      {/* Controls */}
      <section className="glass-panel p-5">
        <h2 className="text-sm font-display font-semibold uppercase tracking-widest text-subtext mb-4 flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Scenario Parameters
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2"><span className="text-subtext">Wind at landfall</span><span className="font-mono text-text">{storm.vL} km/h</span></div>
            <input type="range" min="70" max="250" step="5" value={storm.vL} onChange={e => {setStorm(s=>({...s, vL: +e.target.value})); setPreset('custom')}} className="w-full accent-white cursor-pointer bg-[#3C4043] h-2 rounded-lg" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2"><span className="text-subtext">Eyewall radius</span><span className="font-mono text-text">{storm.rm} km</span></div>
            <input type="range" min="15" max="80" step="5" value={storm.rm} onChange={e => {setStorm(s=>({...s, rm: +e.target.value})); setPreset('custom')}} className="w-full accent-white cursor-pointer bg-[#3C4043] h-2 rounded-lg" />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <label className="flex items-center gap-3 text-sm text-text cursor-pointer hover:text-white transition-colors">
              <input type="checkbox" checked={swath} onChange={e => setSwath(e.target.checked)} className="accent-white w-4 h-4" /> Show gale-force swath (62+ km/h)
            </label>
            <label className="flex items-center gap-3 text-sm text-text cursor-pointer hover:text-white transition-colors">
              <input type="checkbox" checked={dnames} onChange={e => setDnames(e.target.checked)} className="accent-white w-4 h-4" /> Show district names
            </label>
          </div>
        </div>
      </section>

      {/* Situation */}
      <section className="glass-panel p-5">
        <h2 className="text-sm font-display font-semibold uppercase tracking-widest text-subtext mb-3">Situation</h2>
        <div className="text-xl font-display font-bold leading-tight mb-4 text-text">
          <span className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-track text-white mr-2 align-middle">{cat[0]}</span>
          Landfall near {placeName(storm.L).replace(/^the coast near /, '')} at {T(TL)}
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><div className="text-xs uppercase text-subtext font-mono">Landfall Wind</div><div className="font-mono text-lg">{vL} km/h</div></div>
          <div><div className="text-xs uppercase text-subtext font-mono">Max Surge</div><div className="font-mono text-lg">{model.Sbase.toFixed(1)} m</div></div>
          <div><div className="text-xs uppercase text-subtext font-mono">Landfall Point</div><div className="font-mono text-sm pt-1">{lf[1].toFixed(2)}°N {lf[0].toFixed(2)}°E</div></div>
          <div><div className="text-xs uppercase text-subtext font-mono">IMD Class</div><div className="text-sm pt-1">{cat[1]}</div></div>
        </div>
        
        <div className="text-sm text-subtext bg-background/50 rounded-lg p-3">
          <strong className="text-text">{T(storm.t)}:</strong> centre at {cur[1].toFixed(1)}°N {cur[0].toFixed(1)}°E, {Math.round(vn)} km/h, {Math.round(nc.d)} km from coast, {storm.t < TL ? `landfall ${rel(TL)}` : 'now inland'}.
        </div>

        <div className="mt-5">
          <div className="flex h-2.5 rounded-full overflow-hidden bg-border">
            {[0,1,2,3].map(l => (
              <div key={l} style={{ width: `${counts[l]/total*100}%`, backgroundColor: getLevelColor(l) }} />
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-xs font-mono text-subtext">
            {[3,2,1,0].map(l => (
              <span key={l}><strong className="text-text">{counts[l]}</strong> {LV[l]}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Action Plan */}
      <section className="glass-panel p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-display font-semibold uppercase tracking-widest text-subtext">What To Do & By When</h2>
          <select 
            value={actionLang} 
            onChange={e => setActionLang(e.target.value as any)}
            className="bg-background border border-border text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="or">ଓଡ଼ିଆ</option>
          </select>
        </div>
        <div className="space-y-4">
          {actions.map((act, i) => {
            const langPrefix = actionLang === 'hi' ? 'सूचना: ' : actionLang === 'or' ? 'ସୂଚନା: ' : '';
            return (
              <div key={i} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-accent">{act.tag}</span>
                <h3 className="font-semibold text-text text-sm mt-1">{langPrefix}{act.title}</h3>
                <p className="text-subtext text-xs mt-1 leading-relaxed">{act.body}</p>
                {act.by !== null && (
                  <div className="inline-block mt-2 text-[11px] font-mono font-medium text-panel bg-text px-2 py-1 rounded">
                    {actionLang === 'hi' ? 'समय सीमा:' : actionLang === 'or' ? 'ସମୟ ସୀମା:' : 'Act by'} {T(act.by)} ({rel(act.by)})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Asset Rankings */}
      <section className="glass-panel p-5">
        <h2 className="text-sm font-display font-semibold uppercase tracking-widest text-subtext mb-4 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Assets Ranked By Risk
        </h2>
        
        {/* Selected Asset Details */}
        {activeAsset && (
          <div className="bg-background/80 rounded-xl p-4 mb-4 border border-border">
            <h3 className="font-semibold text-lg text-text mb-1">{activeAsset.a.name}</h3>
            <p className="text-xs text-subtext mb-3">{TYPES[activeAsset.a.type]?.label} • Cond: {COND[activeAsset.a.cond]}</p>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs uppercase font-mono tracking-wider text-subtext">Risk {Math.round(activeAsset.score)}/100</span>
              <span className="text-xs font-semibold" style={{color: getLevelColor(activeAsset.level)}}>{LV[activeAsset.level]}</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden mb-4">
              <div className="h-full" style={{ width: `${Math.max(3, activeAsset.score)}%`, backgroundColor: getLevelColor(activeAsset.level) }} />
            </div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div className="flex justify-between"><span className="text-subtext">Peak Wind</span><span className="font-mono text-text">{Math.round(activeAsset.peak)} km/h</span></div>
              <div className="flex justify-between"><span className="text-subtext">Flood Depth</span><span className="font-mono text-text">{activeAsset.depth > 0 ? activeAsset.depth.toFixed(1)+'m' : 'Dry'}</span></div>
              <div className="flex justify-between"><span className="text-subtext">Gale Arrives</span><span className="font-mono text-text">{activeAsset.tg !== null ? T(activeAsset.tg) : 'N/A'}</span></div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {['all', ...TKEYS].map(t => (
            <button 
              key={t}
              onClick={() => { setFilter(t); setShowAll(false); }}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", filter === t ? "bg-text text-background border-text" : "border-border text-subtext hover:border-text")}
            >
              {t === 'all' ? 'All' : TYPES[t].label}
            </button>
          ))}
        </div>

        <div className="pr-2 space-y-1">
          {displayedAssets.map((r: any) => (
            <button 
              key={r.a.id} 
              onClick={() => setSelectedAssetId(r.a.id)}
              className={cn("w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all", r.a.id === activeAssetId ? "bg-accent/10 border-accent/50" : "border-transparent hover:bg-border/30")}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-panel" style={{ backgroundColor: getLevelColor(r.level) }}>
                {TYPES[r.a.type]?.g}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-text truncate">{r.a.name}</div>
                <div className="text-xs text-subtext truncate">Peak {Math.round(r.peak)} km/h {r.depth > 0 && `• Flood ${r.depth.toFixed(1)}m`}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-sm font-semibold">{Math.round(r.score)}</div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: getLevelColor(r.level) }}>{LV[r.level]}</div>
              </div>
            </button>
          ))}
          {filteredAssets.length === 0 && <div className="text-sm text-subtext text-center py-4">No assets found.</div>}
        </div>
        
        {filteredAssets.length > 10 && (
          <button onClick={() => setShowAll(!showAll)} className="mt-3 text-xs text-accent hover:text-accent/80 font-medium w-full text-center py-2 border border-border/50 rounded-lg">
            {showAll ? 'Show Top 10 Only' : `Show All ${filteredAssets.length}`}
          </button>
        )}
      </section>

    </div>
  );
}
