import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Asset } from '../lib/model';
import type { LiveCyclone } from '../lib/api';

const layerNames: Record<string, string> = {
  wind: 'wind_new',
  pressure: 'pressure_new',
  rainfall: 'precipitation_new',
  clouds: 'clouds_new',
  temperature: 'temp_new'
};

function MapFocus({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 5), { duration: 0.7 });
  }, [center, map]);
  return null;
}

interface LiveMapProps {
  center: [number, number];
  selectedCyclone: LiveCyclone | null;
  assets: Asset[];
  layer: string;
  weatherApiKey: string;
  showAssets: boolean;
}

export function LiveMap({ center, selectedCyclone, assets, layer, weatherApiKey, showAssets }: LiveMapProps) {
  const stormTrack = selectedCyclone?.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]) ?? [];
  const tileLayer = layerNames[layer];

  return (
    <MapContainer center={center} zoom={6} minZoom={3} maxZoom={17} zoomControl className="live-map">
      <MapFocus center={center} />
      <TileLayer
        attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={18}
      />
      {tileLayer && weatherApiKey && (
        <TileLayer
          attribution="Weather tiles &copy; OpenWeather"
          url={`https://tile.openweathermap.org/map/${tileLayer}/{z}/{x}/{y}.png?appid=${weatherApiKey}`}
          opacity={0.62}
          maxZoom={18}
        />
      )}
      {stormTrack.length > 1 && (
        <Polyline positions={stormTrack} pathOptions={{ color: '#ffb322', weight: 4, opacity: 0.95 }} />
      )}
      {stormTrack.map((point, index) => (
        <CircleMarker
          key={`${selectedCyclone?.id}-${index}`}
          center={point}
          radius={index === stormTrack.length - 1 ? 8 : 4}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#ef4444', fillOpacity: 0.95 }}
        >
          <Tooltip>{selectedCyclone?.name}{index === stormTrack.length - 1 ? ' · latest reported position' : ''}</Tooltip>
        </CircleMarker>
      ))}
      {showAssets && assets.map(asset => (
        <CircleMarker
          key={asset.id}
          center={[asset.lat, asset.lon]}
          radius={5}
          pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: asset.type === 'hospital' ? '#ef4444' : '#1479c9', fillOpacity: 0.9 }}
        >
          <Tooltip>{asset.name} · {asset.type}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}