import React, { useState } from 'react';
import { vmaxAt } from '../lib/simulation';
import type { StormState } from '../lib/simulation';
import { imd, LV, TYPES, TKEYS, COND, lonlat, nearestCoast, PLACES, dist, TL } from '../lib/model';
import { Settings2, ShieldAlert, Wind, Waves, Search, MapPin, Clock } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [actionLang, setActionLang] = useState<'en' | 'hi' | 'or'>('en');

  const T = (t: number) => `T+${Math.round(t)}h`;
  const rel = (t: number) => {
    const d = Math.round(t - storm.t);
    return d > 0 ? `in ${d}h` : d === 0 ? 'now' : 'passed';
  };

  const placeName = (k: any) => {
    let best = null, bd = 1e9;
    PLACES.forEach((p: any) => { const d = dist(p.k, k); if(d < bd){ bd = d; best = p; } });
    return bd < 45 ? best!.n : 'the coast near ' + best!.n;
  };

  const getLevelColor = (level: number) => {
    return ['#16A34A', '#F59E0B', '#F97316', '#EF4444'][level];
  };

  const getLevelBadge = (level: number) => {
    switch (level) {
      case 0: return { bg: 'bg-safe-light', text: 'text-safe', border: 'border-safe/30', label: 'LOW' };
      case 1: return { bg: 'bg-watch-light', text: 'text-watch', border: 'border-watch/30', label: 'MODERATE' };
      case 2: return { bg: 'bg-warning-light', text: 'text-warning', border: 'border-warning/30', label: 'HIGH' };
      case 3: return { bg: 'bg-danger-light', text: 'text-danger-dark', border: 'border-danger/30', label: 'CRITICAL' };
      default: return { bg: 'bg-surface', text: 'text-text-secondary', border: 'border-border', label: 'UNKNOWN' };
    }
  };

  // Situation data
  const vL = storm.vL, cat = imd(vL), tr = model.tr, total = model.res.length || 1;
  const cur = lonlat(tr.pos(storm.t)), vn = model.sm.find((s:any)=>s.t === storm.t)?.v || vmaxAt(storm, storm.t), nc = nearestCoast(tr.pos(storm.t));
  const counts = [0,0,0,0]; model.res.forEach((r: any) => counts[r.level]++);

  // Actions directives
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
      A.push({ 
        tag: 'Civic Evacuation', 
        title: `Evacuate vulnerable sectors in ${dd.map((d:any)=>d.d.n).join(', ')}`, 
        body: `${pop.toFixed(1)}M residents exposed to gale winds (89+ km/h). Mobilize SDRF & NDRF teams to low-lying coastal areas.`, 
        by: eg === null ? null : Math.max(0, eg - 12),
        priority: 'high'
      });
    } else {
      A.push({ 
        tag: 'Public Safety', 
        title: 'No major urban center exceeds 89 km/h wind threshold', 
        body: 'Maintain coastal fisherman warnings and keep relief shelters provisioned.', 
        by: null,
        priority: 'normal'
      });
    }
    
    const sh = byType('shelter');
    if(sh.length){
      const bad = sh.filter(hi);
      A.push({ 
        tag: 'Shelter Network', 
        title: bad.length ? `${bad.length} of ${sh.length} cyclone shelters under high threat` : 'All assigned cyclone shelters structurally safe', 
        body: bad.length ? `Divert evacuees from compromised shelters; reallocates capacity for ${bad.reduce((s:number,r:any)=>s+r.a.cap,0)} individuals.` : 'Perform secondary inventory check on potable water and backup generators.', 
        by: bad.length && earliest(bad)!==null ? Math.max(0, earliest(bad)! - 12) : null,
        priority: bad.length ? 'high' : 'normal'
      });
    }
    return A;
  };

  const actions = buildActions();

  // Filtered Assets
  const filteredAssets = model.rank.filter((r: any) => {
    const matchesFilter = filter === 'all' || r.a.type === filter;
    const matchesSearch = !searchQuery || r.a.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const displayedAssets = showAll ? filteredAssets : filteredAssets.slice(0, 10);
  const activeAssetId = selectedAssetId !== null ? selectedAssetId : (model.rank.length ? model.rank[0].a.id : null);
  const activeAsset = model.res.find((r: any) => r.a.id === activeAssetId);

  return (
    <div className="flex flex-col gap-5 p-5 bg-background text-text-primary">
      
      {/* 1. Situation Briefing */}
      <section className="bg-surface rounded-xl p-5 border border-border shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ocean font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse"></span>
            Live Situation Briefing
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-danger-light text-danger-dark border border-danger/30 font-mono">
            {cat[0]}
          </span>
        </div>

        <h3 className="text-base font-bold leading-snug mb-3 text-text-primary">
          Landfall projected near <span className="text-primary">{placeName(storm.L).replace(/^the coast near /, '')}</span> at {T(TL)}
        </h3>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-background-secondary p-3 rounded-lg border border-border-light">
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-0.5">
              <Wind className="w-3.5 h-3.5 text-ocean" />
              <span>Landfall Wind</span>
            </div>
            <div className="font-mono text-lg font-bold text-text-primary">{vL} <span className="text-xs font-normal text-text-muted">km/h</span></div>
          </div>

          <div className="bg-background-secondary p-3 rounded-lg border border-border-light">
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-0.5">
              <Waves className="w-3.5 h-3.5 text-cyan" />
              <span>Peak Surge</span>
            </div>
            <div className="font-mono text-lg font-bold text-text-primary">{model.Sbase.toFixed(1)} <span className="text-xs font-normal text-text-muted">m</span></div>
          </div>
        </div>

        {/* Live Eye Position Card */}
        <div className="text-xs text-text-secondary bg-primary-light/50 border border-primary/20 rounded-lg p-3 leading-relaxed flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="text-primary-dark font-semibold">T+{storm.t}h Coordinate:</strong> Center at {cur[1].toFixed(2)}°N, {cur[0].toFixed(2)}°E with {Math.round(vn)} km/h sustained wind, {Math.round(nc.d)} km from coast ({storm.t < TL ? `Landfall ${rel(TL)}` : 'Inland'}).
          </div>
        </div>

        {/* Impact Distribution Bar */}
        <div className="mt-4 pt-3 border-t border-border-light">
          <div className="flex justify-between items-center text-xs mb-1.5 font-medium text-text-secondary">
            <span>Infrastructure Exposure</span>
            <span className="font-mono text-text-primary">{total} Assets Monitored</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-border-light">
            {[0,1,2,3].map(l => (
              <div 
                key={l} 
                style={{ width: `${(counts[l]/total)*100}%`, backgroundColor: getLevelColor(l) }} 
                title={`${counts[l]} ${LV[l]}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[11px] font-mono text-text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-safe"></span>{counts[0]} Safe</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-watch"></span>{counts[1]} Watch</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning"></span>{counts[2]} Warning</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger"></span>{counts[3]} Critical</span>
          </div>
        </div>
      </section>

      {/* 2. Emergency Operational Directives */}
      <section className="bg-surface rounded-xl p-5 border border-border shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" /> Action Directives
          </h3>
          <div className="flex rounded-md border border-border p-0.5 bg-background-secondary">
            {(['en', 'hi', 'or'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setActionLang(lang)}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-medium rounded transition-all",
                  actionLang === lang ? "bg-surface text-primary font-bold shadow-sm" : "text-text-muted hover:text-text-primary"
                )}
              >
                {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिन्दी' : 'ଓଡ଼ିଆ'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {actions.map((act, i) => (
            <div key={i} className="p-3.5 rounded-lg bg-background-secondary border border-border-light">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ocean bg-surface px-2 py-0.5 rounded border border-border-light">
                  {act.tag}
                </span>
                {act.by !== null && (
                  <span className="text-[11px] font-mono font-semibold text-warning bg-warning-light px-2 py-0.5 rounded border border-warning/30">
                    Act by {T(act.by)} ({rel(act.by)})
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-text-primary text-sm mt-1.5">{act.title}</h4>
              <p className="text-text-secondary text-xs mt-1 leading-relaxed">{act.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Assets Ranked by Risk */}
      <section className="bg-surface rounded-xl p-5 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Monitored Assets
          </h3>
          <span className="text-xs text-text-muted font-mono">{filteredAssets.length} found</span>
        </div>

        {/* Selected Asset Spotlight */}
        {activeAsset && (
          <div className="bg-primary-light/30 rounded-xl p-4 mb-4 border border-primary/20">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <h4 className="font-bold text-sm text-text-primary">{activeAsset.a.name}</h4>
                <p className="text-xs text-text-muted">{TYPES[activeAsset.a.type]?.label} • Structural: {COND[activeAsset.a.cond]}</p>
              </div>
              <span className={cn("px-2 py-0.5 rounded text-[11px] font-mono font-bold border", getLevelBadge(activeAsset.level).bg, getLevelBadge(activeAsset.level).text, getLevelBadge(activeAsset.level).border)}>
                {getLevelBadge(activeAsset.level).label}
              </span>
            </div>

            <div className="h-1.5 rounded-full bg-border-light overflow-hidden my-2.5">
              <div className="h-full rounded-full" style={{ width: `${Math.max(5, activeAsset.score)}%`, backgroundColor: getLevelColor(activeAsset.level) }} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div className="bg-surface p-2 rounded border border-border-light">
                <span className="text-[10px] text-text-muted block">Peak Wind</span>
                <span className="font-mono font-bold text-text-primary">{Math.round(activeAsset.peak)} km/h</span>
              </div>
              <div className="bg-surface p-2 rounded border border-border-light">
                <span className="text-[10px] text-text-muted block">Flood Depth</span>
                <span className="font-mono font-bold text-text-primary">{activeAsset.depth > 0 ? activeAsset.depth.toFixed(1)+'m' : 'Dry'}</span>
              </div>
              <div className="bg-surface p-2 rounded border border-border-light">
                <span className="text-[10px] text-text-muted block">Gale ETA</span>
                <span className="font-mono font-bold text-text-primary">{activeAsset.tg !== null ? T(activeAsset.tg) : 'None'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="space-y-2 mb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search assets (e.g. Hospital, Shelter)..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-background-secondary border border-border text-xs rounded-lg text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['all', ...TKEYS].map(t => (
              <button 
                key={t}
                onClick={() => { setFilter(t); setShowAll(false); }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                  filter === t 
                    ? "bg-primary text-text-white border-primary shadow-sm" 
                    : "bg-surface border-border text-text-secondary hover:border-primary/50"
                )}
              >
                {t === 'all' ? 'All Assets' : TYPES[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Assets */}
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
          {displayedAssets.map((r: any) => {
            const badge = getLevelBadge(r.level);
            const isSelected = r.a.id === activeAssetId;
            return (
              <button 
                key={r.a.id} 
                onClick={() => setSelectedAssetId(r.a.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all",
                  isSelected 
                    ? "bg-primary-light border-primary shadow-sm" 
                    : "bg-surface border-border-light hover:bg-surface-hover hover:border-border"
                )}
              >
                <div 
                  className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 text-white shadow-xs" 
                  style={{ backgroundColor: getLevelColor(r.level) }}
                >
                  {TYPES[r.a.type]?.g || '•'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-text-primary truncate">{r.a.name}</div>
                  <div className="text-[11px] text-text-muted truncate">
                    Peak {Math.round(r.peak)} km/h {r.depth > 0 && `• Flood ${r.depth.toFixed(1)}m`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-xs font-bold text-text-primary">{Math.round(r.score)}</div>
                  <span className={cn("text-[9px] font-mono px-1 py-0.2 rounded font-bold", badge.bg, badge.text)}>
                    {badge.label}
                  </span>
                </div>
              </button>
            );
          })}
          {filteredAssets.length === 0 && (
            <div className="text-xs text-text-muted text-center py-6 bg-background-secondary rounded-lg border border-border-light">
              No matching infrastructure assets found.
            </div>
          )}
        </div>
        
        {filteredAssets.length > 10 && (
          <button 
            onClick={() => setShowAll(!showAll)} 
            className="mt-3 text-xs text-primary hover:text-primary-dark font-semibold w-full text-center py-2 border border-border rounded-lg bg-surface hover:bg-primary-light transition-all"
          >
            {showAll ? 'Show Top 10 Only' : `Show All ${filteredAssets.length} Assets`}
          </button>
        )}
      </section>

      {/* 4. Scenario Parameters */}
      <section className="bg-surface rounded-xl p-5 border border-border shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
          <Settings2 className="w-3.5 h-3.5 text-primary" /> Scenario Tuning
        </h3>
        <div className="space-y-3.5">
          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-text-secondary">Wind at Landfall</span>
              <span className="font-mono font-bold text-primary">{storm.vL} km/h</span>
            </div>
            <input 
              type="range" min="70" max="250" step="5" 
              value={storm.vL} 
              onChange={e => { setStorm(s => ({ ...s, vL: +e.target.value })); setPreset('custom'); }} 
              className="w-full cursor-pointer" 
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className="text-text-secondary">Eyewall Radius (RMW)</span>
              <span className="font-mono font-bold text-primary">{storm.rm} km</span>
            </div>
            <input 
              type="range" min="15" max="80" step="5" 
              value={storm.rm} 
              onChange={e => { setStorm(s => ({ ...s, rm: +e.target.value })); setPreset('custom'); }} 
              className="w-full cursor-pointer" 
            />
          </div>

          <div className="flex flex-col gap-2 pt-1 border-t border-border-light">
            <label className="flex items-center gap-2.5 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
              <input 
                type="checkbox" 
                checked={swath} 
                onChange={e => setSwath(e.target.checked)} 
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary" 
              />
              Show gale-force swath (62+ km/h zone)
            </label>
            <label className="flex items-center gap-2.5 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
              <input 
                type="checkbox" 
                checked={dnames} 
                onChange={e => setDnames(e.target.checked)} 
                className="w-4 h-4 rounded text-primary border-border focus:ring-primary" 
              />
              Show coastal district reference names
            </label>
          </div>
        </div>
      </section>

    </div>
  );
}
