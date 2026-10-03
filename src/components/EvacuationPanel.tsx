import { useMemo, useState, useEffect } from 'react';
import { generateEvacuationAdvice } from '../lib/ai';
import type { StormState } from '../lib/simulation';
import type { Asset } from '../lib/model';
import { K, dist } from '../lib/model';
import { vmaxAt } from '../lib/simulation';
import { ShieldCheck, AlertTriangle, Info, MapPin, ArrowRight } from 'lucide-react';

interface EvacuationPanelProps {
  userLocation: [number, number] | null;
  storm: StormState;
  model: any;
  assets: Asset[];
}

export function EvacuationPanel({ userLocation, storm, model, assets }: EvacuationPanelProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const riskAssessment = useMemo(() => {
    if (!userLocation) return null;
    
    // Convert user location to km coordinates for math
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
      
      // Calculate wind speed at user location at this time
      const vAtCenter = vmaxAt(storm, t);
      // Simple wind decay model based on distance
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
    let level = 'LOW';
    if (maxV > 120) level = 'CRITICAL';
    else if (maxV > 65) level = 'HIGH';
    else if (maxV > 40) level = 'MODERATE';
    
    return { minD, eta, maxV, nearestSafe, safeDist, level };
  }, [userLocation, storm, model, assets]);

  useEffect(() => {
    if (!riskAssessment) return;
    let isActive = true;
    
    async function fetchAi() {
      setIsAiLoading(true);
      const advice = await generateEvacuationAdvice(
        riskAssessment!.maxV,
        riskAssessment!.eta,
        riskAssessment!.level,
        riskAssessment!.nearestSafe?.name || 'an emergency shelter',
        riskAssessment!.safeDist
      );
      if (isActive) {
        setAiAnalysis(advice);
        setIsAiLoading(false);
      }
    }
    
    fetchAi();
    return () => { isActive = false; };
  }, [riskAssessment]);

  if (!userLocation) {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-blue-400 animate-bounce" />
        </div>
        <h2 className="text-xl font-bold mb-2">Pinpoint Your Location</h2>
        <p className="text-subtext">Click anywhere on the map to drop a pin and get a personalized risk assessment, evacuation routes, and AI survival instructions.</p>
      </div>
    );
  }

  const { eta, maxV, nearestSafe, safeDist, level } = riskAssessment!;

  return (
    <div className="p-6 h-full overflow-y-auto flex flex-col gap-6 pb-24">
      <div>
        <h2 className="text-xl font-bold mb-1">Personal Risk Report</h2>
        <p className="text-sm text-subtext font-mono">{userLocation[0].toFixed(4)}°N, {userLocation[1].toFixed(4)}°E</p>
      </div>
      
      {/* Risk Banner */}
      <div className={`p-4 rounded-xl border ${level === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30' : level === 'HIGH' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
        <div className="flex items-start gap-3">
          {level === 'CRITICAL' ? <AlertTriangle className="w-6 h-6 text-red-400 mt-1" /> : <ShieldCheck className="w-6 h-6 text-green-400 mt-1" />}
          <div>
            <h3 className={`font-bold ${level === 'CRITICAL' ? 'text-red-400' : level === 'HIGH' ? 'text-orange-400' : 'text-green-400'}`}>
              {level} RISK ZONE
            </h3>
            <p className="text-sm text-white/80 mt-1">
              {level === 'CRITICAL' && "Extreme danger. Evacuate immediately if instructed. Peak winds may exceed 120km/h."}
              {level === 'HIGH' && "High risk of damage and power loss. Secure property and prepare emergency kits."}
              {level === 'MODERATE' && "Moderate risk. Stay indoors during the peak storm passing."}
              {level === 'LOW' && "Low risk. Normal precautions apply."}
            </p>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-panel/50 p-3 rounded-lg border border-border/50">
          <p className="text-xs text-subtext uppercase tracking-wider mb-1">Peak Wind</p>
          <p className="text-xl font-bold">{Math.round(maxV)} <span className="text-sm font-normal text-subtext">km/h</span></p>
        </div>
        <div className="bg-panel/50 p-3 rounded-lg border border-border/50">
          <p className="text-xs text-subtext uppercase tracking-wider mb-1">Arrival ETA</p>
          <p className="text-xl font-bold">{eta > 0 ? `~${eta} hours` : 'Passing Now'}</p>
        </div>
      </div>

      {/* Evacuation Route */}
      {nearestSafe && (level === 'CRITICAL' || level === 'HIGH') && (
        <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
          <h3 className="font-semibold text-blue-400 flex items-center gap-2 mb-3">
            <ArrowRight className="w-4 h-4" /> Nearest Safe Destination
          </h3>
          <div className="space-y-2">
            <p className="text-lg font-medium">{nearestSafe.name}</p>
            <p className="text-sm text-subtext flex justify-between">
              <span>Type: {nearestSafe.type.toUpperCase()}</span>
              <span>Dist: {safeDist.toFixed(1)} km</span>
            </p>
            <div className="pt-2 mt-2 border-t border-blue-500/20 text-xs text-blue-300/80">
              A direct evacuation route has been plotted on the map.
            </div>
          </div>
        </div>
      )}

      {/* Action Plan */}
      <div className="space-y-3">
        <h3 className="font-semibold text-text flex items-center gap-2 border-b border-border/50 pb-2">
          <Info className="w-4 h-4" /> Emergency Instructions
        </h3>
        <ul className="text-sm space-y-2 text-subtext list-disc pl-4">
          <li>Keep your phone charged and listen to local radio for IMD updates.</li>
          <li>Prepare a disaster kit: water, non-perishable food, flashlight, batteries.</li>
          {level === 'CRITICAL' && <li className="text-red-400 font-medium">Do not step outside during the calm eye of the storm!</li>}
          <li>Move away from windows and glass doors.</li>
        </ul>
      </div>
      
      {/* AI Reasoning Placeholder */}
      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md bg-indigo-500/20 flex items-center justify-center">✨</div>
          <span className="font-semibold text-indigo-300 text-sm">Groq AI Analysis</span>
        </div>
        <p className="text-xs text-indigo-200/70 italic">
          {isAiLoading ? 'Analyzing location variables...' : (aiAnalysis || 'Could not fetch analysis.')}
        </p>
      </div>

    </div>
  );
}
