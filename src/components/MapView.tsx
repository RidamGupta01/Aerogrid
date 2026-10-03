import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, CircleMarker, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { vmaxAt, galeR } from '../lib/simulation';
import type { StormState } from '../lib/simulation';
import { lonlat, nearestCoast, TYPES, K, dist, type Point } from '../lib/model';

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
  html: `<div style="background: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div><div style="position: absolute; top: 14px; left: -20px; width: 60px; text-align: center; color: #fff; font-size: 10px; font-weight: bold; text-shadow: 1px 1px 2px #000;">${label}</div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Component to dynamically update map view based on region
function ActiveAssetFlyTo({ selectedAssetId, assets }: { selectedAssetId: string | number | null, assets: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (selectedAssetId) {
      const asset = assets.find(a => a.id === selectedAssetId);
      if (asset) {
        map.flyTo([asset.lat, asset.lon], 13, { 
          animate: true, 
          duration: 2.5,
          easeLinearity: 0.15
        });
      }
    }
  }, [selectedAssetId, assets, map]);
  return null;
}

function MapUpdater({ center, bounds }: { center?: [number, number], bounds?: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { 
        animate: true, 
        padding: [20, 20],
        duration: 2.0,
        easeLinearity: 0.2
      });
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

import { useEffect } from 'react';

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

export function MapView({ storm, setStorm, model, setPreset, swath, selectedAssetId, setSelectedAssetId, appMode, userLocation, setUserLocation, assets, mapBounds }: MapViewProps) {
  
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
          swathCircles.push({ latlng: [ll[1], ll[0]] as [number, number], r: R * 1000 }); // Leaflet radius is in meters
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

  const getLevelColor = (level: number) => ['#10B981', '#FBBF24', '#F97316', '#EF4444'][level];

  // Map the storm handles to LatLng
  const O_ll = lonlat(storm.O);
  const B_ll = lonlat(storm.B);
  const L_ll = lonlat(storm.L);

  return (
    <div className="w-full h-full min-h-[500px] bg-slate-900 rounded-xl overflow-hidden border border-border/50 relative">
      <MapContainer 
        center={[20, 80]} 
        zoom={5} 
        scrollWheelZoom={true} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <MapUpdater bounds={mapBounds} />
        <ActiveAssetFlyTo selectedAssetId={selectedAssetId} assets={assets} />
        <MapEventsHandler appMode={appMode} setUserLocation={setUserLocation} />
        
        {/* Base Map via OSM */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Swath */}
        {swath && swathCircles.map((c: any, i: number) => (
          <Circle 
            key={`s-${i}`} 
            center={c.latlng} 
            radius={c.r} 
            pathOptions={{ color: 'rgba(59, 130, 246, 0.1)', fillColor: 'rgba(59, 130, 246, 0.05)', stroke: false }} 
          />
        ))}

        {/* Tracks */}
        <Polyline positions={preTrack} pathOptions={{ color: '#F97316', weight: 4 }} />
        <Polyline positions={postTrack} pathOptions={{ color: '#F97316', weight: 3, dashArray: '5, 10' }} />

        {/* Time Markers */}
        {timeMarkers.map((tm: any) => (
          <CircleMarker 
            key={`tm-${tm.tk}`} 
            center={tm.latlng} 
            radius={4} 
            pathOptions={{ color: '#0A0E17', fillColor: '#fff', fillOpacity: 1, weight: 2 }}
          >
            {tm.showText && <Tooltip permanent direction="right" offset={[5, 0]} className="bg-transparent border-0 text-white shadow-none text-xs font-mono">T+{tm.tk}h</Tooltip>}
          </CircleMarker>
        ))}

        {/* Current Storm */}
        {currentStorm.Rn > 0 && (
          <Circle 
            center={currentStorm.latlng} 
            radius={currentStorm.Rn} 
            pathOptions={{ color: '#ef4444', weight: 2, dashArray: '5,5', fill: false }} 
          />
        )}
        <CircleMarker 
          center={currentStorm.latlng} 
          radius={8} 
          pathOptions={{ color: '#ef4444', fillColor: 'rgba(239, 68, 68, 0.5)', fillOpacity: 1, weight: 2 }} 
        />

        {/* Draggable Handles */}
        <Marker 
          position={[O_ll[1], O_ll[0]]} 
          draggable 
          icon={createHandleIcon('Start', '#3b82f6')}
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              // Reverse lonlat: K requires lon, lat
              // Wait, K is: lonlat returns [lon, lat]. So inverse is just passing lon, lat to K.
              // Wait, no. K converts lon,lat to km. 
              setStorm(s => ({ ...s, O: [ (ll.lng - 80) * 105.0, (ll.lat - 20) * 111.0 ] }));
              setPreset('custom');
            }
          }}
        />
        <Marker 
          position={[B_ll[1], B_ll[0]]} 
          draggable 
          icon={createHandleIcon('Steering', '#a855f7')}
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
          icon={createHandleIcon('Landfall', '#ef4444')}
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              const k = [ (ll.lng - 80) * 105.0, (ll.lat - 20) * 111.0 ] as Point;
              setStorm(s => ({ ...s, L: nearestCoast(k).pt }));
              setPreset('custom');
            }
          }}
        />

        {/* Assets (Infrastructure) */}
        {model.res.map((x: any) => {
          const ll = lonlat(x.a.k);
          const color = getLevelColor(x.level);
          const isSel = x.a.id === selectedAssetId;
          const ty = TYPES[x.a.type] || TYPES.road;
          
          return (
            <CircleMarker
              key={x.a.id}
              center={[ll[1], ll[0]]}
              radius={isSel ? 8 : 5}
              pathOptions={{ 
                color: '#0A0E17', 
                fillColor: color, 
                fillOpacity: isSel ? 1 : 0.8, 
                weight: 1.5 
              }}
              eventHandlers={{
                click: () => setSelectedAssetId(x.a.id)
              }}
            >
              <Tooltip direction="top">
                <div className="font-sans">
                  <strong>{x.a.name}</strong><br/>
                  Type: {ty.label}<br/>
                  Impact Level: {x.level}/3
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* User Location and Evacuation Route */}
        {userLocation && (
          <Marker position={userLocation} icon={createHandleIcon('You', '#3B82F6')} />
        )}
        {userLocation && nearestSafeDest && (
          <Polyline 
            positions={[userLocation, [nearestSafeDest.lat, nearestSafeDest.lon]]} 
            pathOptions={{ color: '#3B82F6', weight: 4, dashArray: '5, 10' }} 
          />
        )}
      </MapContainer>
    </div>
  );
}
