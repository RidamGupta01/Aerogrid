import { useState, useMemo } from 'react';
import type { StormState } from '../lib/simulation';
import type { Asset } from '../lib/model';
import { K, dist } from '../lib/model';
import { vmaxAt } from '../lib/simulation';
import { ShieldCheck, AlertTriangle, Info, MapPin, ArrowRight, PhoneCall, CheckSquare, Square, Navigation, Sparkles } from 'lucide-react';
import { cn } from '../App';

interface EvacuationPanelProps {
  userLocation: [number, number] | null;
  storm: StormState;
  model: any;
  assets: Asset[];
}

export function EvacuationPanel({ userLocation, storm, model, assets }: EvacuationPanelProps) {
  // Interactive survival checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    water: true,
    power: true,
    radio: false,
    docs: false,
    meds: false
  });

  const toggleCheck = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const riskAssessment = useMemo(() => {
    if (!userLocation) return null;
    
    const uK = K(userLocation[1], userLocation[0]); // [lon, lat]
    
    // Find closest point of approach (CPA)
    let minD = Infinity;
    let eta = 0;
    let maxV = 0;
    
    for (let t = 0; t <= 60; t++) {
      const pos = model.tr.pos(t);
      const d = dist(pos, uK);
      if (d < minD) {
        minD = d;
        eta = Math.max(0, t - storm.t); // Hours from now
      }
      
      const vAtCenter = vmaxAt(storm, t);
      const vAtUser = vAtCenter * Math.exp(-d / 100); 
      if (vAtUser > maxV) {
        maxV = vAtUser;
      }
    }
    
    // Find nearest safe destination (shelter or hospital)
    let nearestSafe = null;
    let safeDist = Infinity;
    for (const a of assets) {
      if (a.type === 'shelter' || a.type === 'hospital') {
        const d = dist(a.k, uK);
        if (d < safeDist) {
          safeDist = d;
          nearestSafe = a;
        }
      }
    }
    
    // Determine Risk Level
    let level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (maxV > 120) level = 'CRITICAL';
    else if (maxV > 65) level = 'HIGH';
    else if (maxV > 40) level = 'MODERATE';
    
    return { minD, eta, maxV, nearestSafe, safeDist, level };
  }, [userLocation, storm, model, assets]);

  if (!userLocation) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center text-center bg-background">
        <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-md">
          <MapPin className="w-8 h-8 text-primary animate-bounce" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Pinpoint Your Location</h2>
        <p className="text-sm text-text-secondary leading-relaxed max-w-sm mb-6">
          Click anywhere on the map to drop a pin. AeroGrid will compute your localized wind speed exposure, storm surge risk, nearest safe shelter, and tailored evacuation instructions.
        </p>
        <div className="bg-surface p-4 rounded-xl border border-border shadow-xs text-xs text-text-muted flex items-center gap-2">
          <Navigation className="w-4 h-4 text-ocean shrink-0" />
          <span>Tip: Tap on coastal settlements to view community vulnerability</span>
        </div>
      </div>
    );
  }

  const { minD, eta, maxV, nearestSafe, safeDist, level } = riskAssessment!;

  const getRiskStyles = () => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-danger-light',
          border: 'border-danger/30',
          text: 'text-danger-dark',
          badge: 'bg-danger text-text-white',
          desc: 'Extreme danger. Evacuate immediately to designated multi-purpose cyclone shelters. Wind gusts will exceed 120 km/h with catastrophic structural risk.'
        };
      case 'HIGH':
        return {
          bg: 'bg-warning-light',
          border: 'border-warning/30',
          text: 'text-warning',
          badge: 'bg-warning text-text-white',
          desc: 'High risk of power outages, falling trees, and tin-roof damage. Secure exterior objects and prepare to relocate.'
        };
      case 'MODERATE':
        return {
          bg: 'bg-watch-light',
          border: 'border-watch/30',
          text: 'text-watch',
          badge: 'bg-watch text-text-white',
          desc: 'Moderate risk. Heavy rainfall and gale-force wind gusts expected. Stay indoors during storm passage.'
        };
      default:
        return {
          bg: 'bg-safe-light',
          border: 'border-safe/30',
          text: 'text-safe',
          badge: 'bg-safe text-text-white',
          desc: 'Low risk. Outside direct gale swath. Standard weather precautions and coastal advisories apply.'
        };
    }
  };

  const riskStyle = getRiskStyles();

  return (
    <div className="p-5 h-full overflow-y-auto flex flex-col gap-5 bg-background text-text-primary">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Personal Risk Assessment</h2>
          <p className="text-xs font-mono text-text-muted mt-0.5">
            {userLocation[0].toFixed(4)}°N, {userLocation[1].toFixed(4)}°E
          </p>
        </div>
        <span className={cn("px-2.5 py-1 rounded-md text-xs font-mono font-bold shadow-xs", riskStyle.badge)}>
          {level}
        </span>
      </div>
      
      {/* Risk Alert Banner */}
      <div className={cn("p-4 rounded-xl border shadow-sm", riskStyle.bg, riskStyle.border)}>
        <div className="flex items-start gap-3">
          {level === 'CRITICAL' || level === 'HIGH' ? (
            <AlertTriangle className={cn("w-5 h-5 shrink-0 mt-0.5", riskStyle.text)} />
          ) : (
            <ShieldCheck className={cn("w-5 h-5 shrink-0 mt-0.5", riskStyle.text)} />
          )}
          <div>
            <h3 className={cn("font-bold text-sm", riskStyle.text)}>
              {level} HAZARD ZONE
            </h3>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {riskStyle.desc}
            </p>
          </div>
        </div>
      </div>
      
      {/* Vital Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs">
          <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-1">Peak Local Wind</p>
          <p className="text-xl font-bold font-mono text-text-primary">
            {Math.round(maxV)} <span className="text-xs font-normal text-text-muted">km/h</span>
          </p>
        </div>
        <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs">
          <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-1">Gale Impact ETA</p>
          <p className="text-xl font-bold font-mono text-text-primary">
            {eta > 0 ? `~${eta}h` : 'Passing'}
          </p>
        </div>
        <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs">
          <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-1">Eye Proximity</p>
          <p className="text-xl font-bold font-mono text-text-primary">
            {Math.round(minD)} <span className="text-xs font-normal text-text-muted">km</span>
          </p>
        </div>
        <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs">
          <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-1">Shelter Proximity</p>
          <p className="text-xl font-bold font-mono text-text-primary">
            {safeDist < Infinity ? safeDist.toFixed(1) : '—'} <span className="text-xs font-normal text-text-muted">km</span>
          </p>
        </div>
      </div>

      {/* Nearest Safe Evacuation Destination */}
      {nearestSafe && (
        <div className="bg-surface border border-primary/30 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary-light/40 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <ArrowRight className="w-3.5 h-3.5" /> Recommended Evacuation Point
            </span>
            <span className="text-[10px] font-mono font-bold bg-primary-light text-primary px-2 py-0.5 rounded border border-primary/20">
              {safeDist.toFixed(1)} km away
            </span>
          </div>
          <h4 className="text-base font-bold text-text-primary">{nearestSafe.name}</h4>
          <p className="text-xs text-text-muted mt-0.5">
            Facility Type: <strong className="text-text-secondary uppercase">{nearestSafe.type}</strong> • Capacity: ~{nearestSafe.cap || 800} persons
          </p>
          <div className="mt-3 pt-2.5 border-t border-border-light flex items-center justify-between text-xs">
            <span className="text-ocean font-medium flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-primary" /> Blue dashed route plotted on map
            </span>
          </div>
        </div>
      )}

      {/* Interactive Emergency Preparation Checklist */}
      <div className="bg-surface rounded-xl p-4 border border-border shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary" /> Survival Readiness Checklist
        </h3>
        <div className="space-y-2 text-xs text-text-secondary">
          <button 
            onClick={() => toggleCheck('water')}
            className="w-full flex items-center gap-2.5 text-left p-1.5 rounded hover:bg-background-secondary transition-all"
          >
            {checklist.water ? <CheckSquare className="w-4 h-4 text-safe shrink-0" /> : <Square className="w-4 h-4 text-border shrink-0" />}
            <span className={checklist.water ? "line-through text-text-muted" : "text-text-primary font-medium"}>Store 3+ liters of drinking water per family member</span>
          </button>
          <button 
            onClick={() => toggleCheck('power')}
            className="w-full flex items-center gap-2.5 text-left p-1.5 rounded hover:bg-background-secondary transition-all"
          >
            {checklist.power ? <CheckSquare className="w-4 h-4 text-safe shrink-0" /> : <Square className="w-4 h-4 text-border shrink-0" />}
            <span className={checklist.power ? "line-through text-text-muted" : "text-text-primary font-medium"}>Charge power banks, mobile phones, and emergency lights</span>
          </button>
          <button 
            onClick={() => toggleCheck('docs')}
            className="w-full flex items-center gap-2.5 text-left p-1.5 rounded hover:bg-background-secondary transition-all"
          >
            {checklist.docs ? <CheckSquare className="w-4 h-4 text-safe shrink-0" /> : <Square className="w-4 h-4 text-border shrink-0" />}
            <span className={checklist.docs ? "line-through text-text-muted" : "text-text-primary font-medium"}>Seal land deeds, IDs, and ration cards in waterproof zip bags</span>
          </button>
          <button 
            onClick={() => toggleCheck('meds')}
            className="w-full flex items-center gap-2.5 text-left p-1.5 rounded hover:bg-background-secondary transition-all"
          >
            {checklist.meds ? <CheckSquare className="w-4 h-4 text-safe shrink-0" /> : <Square className="w-4 h-4 text-border shrink-0" />}
            <span className={checklist.meds ? "line-through text-text-muted" : "text-text-primary font-medium"}>Keep essential prescription medicines & first-aid handy</span>
          </button>
        </div>
      </div>

      {/* Emergency Helpline Direct Contacts */}
      <div className="bg-surface rounded-xl p-4 border border-border shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2.5 flex items-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-danger" /> Emergency Control Lines
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-background-secondary rounded-lg border border-border-light">
            <span className="text-[10px] text-text-muted block">State Control</span>
            <span className="font-mono font-bold text-primary">1070</span>
          </div>
          <div className="p-2 bg-background-secondary rounded-lg border border-border-light">
            <span className="text-[10px] text-text-muted block">District Ops</span>
            <span className="font-mono font-bold text-primary">1077</span>
          </div>
          <div className="p-2 bg-background-secondary rounded-lg border border-border-light">
            <span className="text-[10px] text-text-muted block">Ambulance</span>
            <span className="font-mono font-bold text-danger">108</span>
          </div>
        </div>
      </div>

      {/* AI Reasoning Directive */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary-light via-background-secondary to-surface border border-primary/20 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-bold text-primary text-xs uppercase tracking-wider">AeroGrid AI Advisory</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed italic">
          "Based on the {maxV.toFixed(0)} km/h wind shear projection at your coordinates, unreinforced masonry and temporary roofs face failure probability. Complete transit to <strong className="text-text-primary">{nearestSafe?.name || 'designated shelter'}</strong> before T+{Math.max(1, eta - 3)}h."
        </p>
      </div>

    </div>
  );
}
