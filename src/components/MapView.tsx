import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, CircleMarker, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { vmaxAt, galeR } from '../lib/simulation';
import type { StormState } from '../lib/simulation';
import { lonlat, nearestCoast, TYPES, K, dist, type Point } from '../lib/model';
import { useEffect } from 'react';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom div icons for handles
const createHandleIcon = (label: string, color: string) => L.divIcon({
  className: 'custom-handle-icon',
  html: `
    <div style="
      background: ${color}; 
      width: 14px; 
      height: 14px; 
      border-radius: 50%; 
      border: 2.5px solid #FFFFFF; 
      box-shadow: 0 4px 12px rgba(15, 80, 120, 0.35);
      cursor: grab;
    "></div>
    <div style="
      position: absolute; 
      top: 16px; 
      left: -28px; 
      width: 70px; 
      text-align: center; 
      color: #12345B; 
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(4px);
      padding: 2px 6px;
      border-radius: 6px;
      font-size: 10px; 
      font-weight: 700; 
      border: 1px solid #D7EAF7;
      box-shadow: 0 2px 6px rgba(15, 80, 120, 0.12);
      pointer-events: none;
    ">${label}</div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

// Component to dynamically update map view based on region
function MapUpdater({ center, bounds }: { center?: [number, number], bounds?: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { animate: true, padding: [30, 30] });
    } else if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [bounds, center, map]);
  return null;
}

function MapEventsHandler({ appMode, setUserLocation }: { appMode: string, setUserLocation: (ll: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      if (appMode === 'evacuation') {
        setUserLocation([e.latlng.lat, e.latlng.lng]);
      }
    }
  });
  return null;
}

interface MapViewProps {
  storm: StormState;
  setStorm: React.Dispatch<React.SetStateAction<StormState>>;
  model: any;
  setPreset: (v: string) => void;
  swath: boolean;
  selectedAssetId: number | null;
  setSelectedAssetId: (id: number | null) => void;
  appMode: string;
  userLocation: [number, number] | null;
  setUserLocation: (ll: [number, number] | null) => void;
  assets: any[];
  mapBounds: [[number, number], [number, number]];
}

export function MapView({ 
  storm, setStorm, model, setPreset, swath, 
  selectedAssetId, setSelectedAssetId, appMode, 
  userLocation, setUserLocation, assets, mapBounds 
}: MapViewProps) {
  
  const { preTrack, postTrack, swathCircles, timeMarkers, currentStorm } = useMemo(() => {
    const pre: [number, number][] = [], post: [number, number][] = [];
    for (let t2 = 0; t2 <= 60; t2 += 1) {
      const q2 = lonlat(model.tr.pos(t2));
      const latlng: [number, number] = [q2[1], q2[0]]; // Leaflet uses [lat, lon]
      if (t2 <= 36) pre.push(latlng); else post.push(latlng);
    }
    
    // Connect the paths
    const mTL = lonlat(model.tr.pos(36));
    post.unshift([mTL[1], mTL[0]]);
    
    const swathCircles: { latlng: [number, number], r: number }[] = [];
    if (swath) {
      for (let tt = 0; tt <= 60; tt += 2) {
        const v = vmaxAt(storm, tt);
        const R = galeR(storm.rm, v);
        if (R) {
          const ll = lonlat(model.tr.pos(tt));
          swathCircles.push({ latlng: [ll[1], ll[0]] as [number, number], r: R * 1000 });
        }
      }
    }
    
    const timeMarkers: { tk: number, latlng: [number, number], showText: boolean }[] = [];
    for (let tk = 0; tk <= 60; tk += 6) {
      const ll = lonlat(model.tr.pos(tk));
      timeMarkers.push({ 
        tk, latlng: [ll[1], ll[0]] as [number, number], 
        showText: tk % 12 === 0 && tk !== 0 && tk !== 36 
      });
    }
    
    const curLL = lonlat(model.tr.pos(storm.t));
    const currentStorm = {
      latlng: [curLL[1], curLL[0]] as [number, number],
      vn: vmaxAt(storm, storm.t),
      Rn: galeR(storm.rm, vmaxAt(storm, storm.t)) * 1000
    };
    
    return { preTrack: pre, postTrack: post, swathCircles, timeMarkers, currentStorm };
  }, [storm, model, swath]);

  const nearestSafeDest = useMemo(() => {
    if (!userLocation) return null;
    const uK = K(userLocation[1], userLocation[0]);
    let safeDist = Infinity;
    let dest = null;
    for (const a of assets) {
      if (a.type === 'shelter' || a.type === 'hospital') {
        const d = dist(a.k, uK);
        if (d < safeDist) {
          safeDist = d;
          dest = a;
        }
      }
    }
    return dest;
  }, [userLocation, assets]);

  // Design token status colors
  const getLevelColor = (level: number) => ['#16A34A', '#F59E0B', '#F97316', '#EF4444'][level];

  // Map the storm handles to LatLng
  const O_ll = lonlat(storm.O);
  const B_ll = lonlat(storm.B);
  const L_ll = lonlat(storm.L);

  return (
    <div className="w-full h-full min-h-[500px] bg-background-secondary rounded-xl overflow-hidden border border-border relative shadow-sm">
      <MapContainer 
        center={[20, 80]} 
        zoom={5} 
        scrollWheelZoom={true} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <MapUpdater bounds={mapBounds} />
        <MapEventsHandler appMode={appMode} setUserLocation={setUserLocation} />
        
        {/* Maritime High-Clarity Base Map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Gale-force Swath Zone */}
        {swath && swathCircles.map((c: any, i: number) => (
          <Circle 
            key={`s-${i}`} 
            center={c.latlng} 
            radius={c.r} 
            pathOptions={{ 
              color: 'rgba(14, 165, 233, 0.35)', 
              fillColor: 'rgba(56, 189, 248, 0.12)', 
              weight: 1 
            }} 
          />
        ))}

        {/* Pre-landfall and Post-landfall Tracks */}
        <Polyline 
          positions={preTrack} 
          pathOptions={{ color: '#F97316', weight: 4.5, opacity: 0.95 }} 
        />
        <Polyline 
          positions={postTrack} 
          pathOptions={{ color: '#F97316', weight: 3.5, dashArray: '6, 8', opacity: 0.85 }} 
        />

        {/* Time Progress Markers along Track */}
        {timeMarkers.map((tm: any) => (
          <CircleMarker 
            key={`tm-${tm.tk}`} 
            center={tm.latlng} 
            radius={4.5} 
            pathOptions={{ color: '#0B4EA2', fillColor: '#FFFFFF', fillOpacity: 1, weight: 2 }}
          >
            {tm.showText && (
              <Tooltip permanent direction="right" offset={[6, 0]} className="custom-tooltip-aero">
                T+{tm.tk}h
              </Tooltip>
            )}
          </CircleMarker>
        ))}

        {/* Eyewall & Gale Wind Radius at Current Time */}
        {currentStorm.Rn > 0 && (
          <Circle 
            center={currentStorm.latlng} 
            radius={currentStorm.Rn} 
            pathOptions={{ 
              color: '#DC2626', 
              weight: 2, 
              dashArray: '6, 6', 
              fillColor: 'rgba(239, 68, 68, 0.08)',
              fillOpacity: 1 
            }} 
          />
        )}

        {/* Storm Vortex Center */}
        <CircleMarker 
          center={currentStorm.latlng} 
          radius={9} 
          pathOptions={{ 
            color: '#B91C1C', 
            fillColor: '#EF4444', 
            fillOpacity: 0.9, 
            weight: 3 
          }} 
        >
          <Tooltip direction="top" className="custom-tooltip-aero">
            Eye: {Math.round(currentStorm.vn)} km/h
          </Tooltip>
        </CircleMarker>

        {/* Draggable Trajectory Controls */}
        <Marker 
          position={[O_ll[1], O_ll[0]]} 
          draggable 
          icon={createHandleIcon('Start', '#1677E8')}
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              setStorm(s => ({ ...s, O: [ (ll.lng - 80) * 105.0, (ll.lat - 20) * 111.0 ] }));
              setPreset('custom');
            }
          }}
        />
        <Marker 
          position={[B_ll[1], B_ll[0]]} 
          draggable 
          icon={createHandleIcon('Steering', '#0EA5E9')}
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              setStorm(s => ({ ...s, B: [ (ll.lng - 80) * 105.0, (ll.lat - 20) * 111.0 ] }));
              setPreset('custom');
            }
          }}
        />
        <Marker 
          position={[L_ll[1], L_ll[0]]} 
          draggable 
          icon={createHandleIcon('Landfall', '#DC2626')}
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              const k = [ (ll.lng - 80) * 105.0, (ll.lat - 20) * 111.0 ] as Point;
              setStorm(s => ({ ...s, L: nearestCoast(k).pt }));
              setPreset('custom');
            }
          }}
        />

        {/* Critical Infrastructure Assets */}
        {model.res.map((x: any) => {
          const ll = lonlat(x.a.k);
          const color = getLevelColor(x.level);
          const isSel = x.a.id === selectedAssetId;
          const ty = TYPES[x.a.type] || TYPES.road;
          
          return (
            <CircleMarker
              key={x.a.id}
              center={[ll[1], ll[0]]}
              radius={isSel ? 9 : 5.5}
              pathOptions={{ 
                color: isSel ? '#12345B' : '#FFFFFF', 
                fillColor: color, 
                fillOpacity: isSel ? 1 : 0.85, 
                weight: isSel ? 3 : 1.5 
              }}
              eventHandlers={{
                click: () => setSelectedAssetId(x.a.id)
              }}
            >
              <Tooltip direction="top" className="custom-tooltip-aero">
                <div style={{ padding: '2px 4px' }}>
                  <div style={{ fontWeight: 700, color: '#12345B' }}>{x.a.name}</div>
                  <div style={{ color: '#486581', fontSize: '10px' }}>{ty.label} • Risk {Math.round(x.score)}/100</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* User Location and Evacuation Route */}
        {userLocation && (
          <Marker position={userLocation} icon={createHandleIcon('You', '#1677E8')} />
        )}
        {userLocation && nearestSafeDest && (
          <Polyline 
            positions={[userLocation, [nearestSafeDest.lat, nearestSafeDest.lon]]} 
            pathOptions={{ color: '#1677E8', weight: 4, dashArray: '6, 8' }} 
          />
        )}
      </MapContainer>

      {/* Floating Map Legend Indicator */}
      <div className="absolute top-4 right-4 z-10 glass-panel px-3 py-2 flex items-center gap-3 text-xs font-medium border border-border shadow-md">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-safe inline-block"></span> Safe</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-watch inline-block"></span> Watch</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning inline-block"></span> Warning</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger inline-block"></span> Danger</span>
      </div>
    </div>
  );
}
