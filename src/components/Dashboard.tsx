import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import {
  Activity, AlertTriangle, Bell, CalendarDays, Check, ChevronDown, Cloud, CloudRain,
  Compass, Crosshair, Droplets, ExternalLink, Gauge, LocateFixed, Map as MapIcon,
  MapPin, Menu, Navigation, Search, ShieldCheck, Thermometer, Wind, X
} from 'lucide-react';
import { fetchActiveCyclones, fetchRealAssets, fetchWeather, searchLocations } from '../lib/api';
import type { GeoLocation, LiveCyclone, WeatherSnapshot } from '../lib/api';
import type { Asset } from '../lib/model';
import { LiveMap } from './LiveMap';
import './Dashboard.css';

const defaultLocation: GeoLocation = {
  name: 'Bhubaneswar', country: 'India', admin1: 'Odisha', latitude: 20.2961, longitude: 85.8245
};

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Compass, target: 'dashboard-top' },
  { id: 'live-map', label: 'Live Map', icon: MapIcon, target: 'live-map' },
  { id: 'forecast', label: 'Forecast', icon: CloudRain, target: 'forecast' },
  { id: 'satellite', label: 'Satellite View', icon: Crosshair, target: 'live-map' },
  { id: 'alerts', label: 'Alerts', icon: Bell, target: 'alerts' },
  { id: 'weather', label: 'Weather Data', icon: Activity, target: 'weather' },
  { id: 'historical', label: 'Historical', icon: CalendarDays, target: 'historical' },
  { id: 'risk', label: 'Risk Zones', icon: ShieldCheck, target: 'impact' },
  { id: 'safety', label: 'Safety Guidelines', icon: ShieldCheck, target: 'safety' },
  { id: 'reports', label: 'Reports', icon: ExternalLink, target: 'reports' },
  { id: 'settings', label: 'Settings', icon: Gauge, target: 'settings' }
];

const mapLayers = [
  { id: 'satellite', label: 'Satellite', icon: Crosshair },
  { id: 'wind', label: 'Wind', icon: Wind },
  { id: 'pressure', label: 'Pressure', icon: Gauge },
  { id: 'rainfall', label: 'Rainfall', icon: CloudRain },
  { id: 'clouds', label: 'Clouds', icon: Cloud },
  { id: 'temperature', label: 'Temperature', icon: Thermometer }
];

function numberText(value: number | null | undefined, digits = 0): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function weatherLabel(code: number | null): string {
  if (code == null) return 'Condition unavailable';
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorms';
}

function formatClock(value: string | null | undefined, timeZone?: string): string {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en', {
    dateStyle: 'medium', timeStyle: 'short', ...(timeZone ? { timeZone } : {})
  }).format(date);
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(bLat - aLat);
  const dLon = radians(bLon - aLon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Dashboard() {
  const [location, setLocation] = useState(defaultLocation);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherError, setWeatherError] = useState('');
  const [cyclones, setCyclones] = useState<LiveCyclone[]>([]);
  const [cycloneError, setCycloneError] = useState('');
  const [selectedCycloneId, setSelectedCycloneId] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetError, setAssetError] = useState('');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [searchError, setSearchError] = useState('');
  const [activeNav, setActiveNav] = useState('dashboard');
  const [mapLayer, setMapLayer] = useState('satellite');
  const [showAssets, setShowAssets] = useState(true);
  const [notice, setNotice] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const weatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

  const selectedCyclone = useMemo(
    () => cyclones.find(item => item.id === selectedCycloneId) ?? cyclones[0] ?? null,
    [cyclones, selectedCycloneId]
  );
  const mapCenter: [number, number] = selectedCyclone?.coordinates.length
    ? [selectedCyclone.coordinates.at(-1)![1], selectedCyclone.coordinates.at(-1)![0]]
    : [location.latitude, location.longitude];

  const refreshCyclones = async () => {
    setIsRefreshing(true);
    setCycloneError('');
    try {
      const result = await fetchActiveCyclones();
      setCyclones(result);
      setSelectedCycloneId(current => result.some(item => item.id === current) ? current : result[0]?.id || '');
    } catch {
      setCyclones([]);
      setSelectedCycloneId('');
      setCycloneError('GDACS is not responding. Cyclone alerts are unavailable.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setWeather(null);
    setWeatherError('');
    fetchWeather(location.latitude, location.longitude, location.name)
      .then(result => { if (!cancelled) setWeather(result); })
      .catch(() => { if (!cancelled) setWeatherError('Weather feed is unavailable. Check your connection and refresh.'); });
    return () => { cancelled = true; };
  }, [location]);

  useEffect(() => {
    let cancelled = false;
    setAssets([]);
    setLoadingAssets(true);
    setAssetError('');
    fetchRealAssets(
      Math.max(-85, location.latitude - 1.1), Math.max(-180, location.longitude - 1.2),
      Math.min(85, location.latitude + 1.1), Math.min(180, location.longitude + 1.2)
    ).then(result => {
      if (!cancelled) {
        setAssets(result);
        if (!result.length) setAssetError('No mapped hospitals or shelters were returned for this area.');
      }
    }).catch(() => { if (!cancelled) setAssetError('OpenStreetMap infrastructure service is unavailable.'); })
      .finally(() => { if (!cancelled) setLoadingAssets(false); });
    return () => { cancelled = true; };
  }, [location]);

  useEffect(() => {
    void refreshCyclones();
    const interval = window.setInterval(() => { void refreshCyclones(); }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchLocations(query)
        .then(results => { if (!cancelled) { setSearchResults(results); setSearchError(''); } })
        .catch(() => { if (!cancelled) { setSearchResults([]); setSearchError('Location search is unavailable.'); } });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search]);

  const selectLocation = (result: GeoLocation) => {
    setLocation(result);
    setSearch('');
    setSearchResults([]);
    setNotice('');
  };

  const selectNavigation = (item: typeof navItems[number]) => {
    setActiveNav(item.id);
    setMobileNavOpen(false);
    if (item.id === 'satellite') setMapLayer('satellite');
    if (item.id === 'safety' || item.id === 'settings' || item.id === 'reports' || item.id === 'historical') {
      setNotice(item.id);
      return;
    }
    document.getElementById(item.target)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setNotice('geolocation');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => selectLocation({
        name: 'Current location', country: '', admin1: null,
        latitude: position.coords.latitude, longitude: position.coords.longitude
      }),
      () => setNotice('geolocation'),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const nearestAssets = useMemo(() => assets
    .filter(asset => asset.type === 'hospital' || asset.type === 'shelter')
    .map(asset => ({ asset, distance: distanceKm(location.latitude, location.longitude, asset.lat, asset.lon) }))
    .sort((a, b) => a.distance - b.distance).slice(0, 5), [assets, location]);

  const activeAlertCount = cyclones.length;
  const displayError = weatherError || cycloneError || assetError;

  return (
    <div className="dashboard-shell" id="dashboard-top">
      <header className="topbar">
        <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(value => !value)}><Menu size={19} /></button>
        <div className="brand-mark" aria-hidden="true"><Wind size={27} /></div>
        <div className="brand-copy"><strong>CycloneCare</strong><span>Early Warnings · Safer Communities</span></div>
        <div className="location-search">
          <Search size={16} />
          <input aria-label="Search location" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search location (City, State, Country)..." />
          <button className="icon-button locate-button" aria-label="Use my location" onClick={useMyLocation}><LocateFixed size={17} /></button>
          {(searchResults.length > 0 || searchError) && <div className="search-results">
            {searchError && <p className="empty-result">{searchError}</p>}
            {searchResults.map((result, index) => <button key={`${result.latitude}-${result.longitude}-${index}`} onClick={() => selectLocation(result)}>
              <MapPin size={15} /><span><strong>{result.name}</strong><small>{[result.admin1, result.country].filter(Boolean).join(', ')}</small></span>
            </button>)}
          </div>}
        </div>
        <div className="topbar-actions">
          <button className="updates-button" onClick={() => { void refreshCyclones(); document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth' }); }}>
            <span className="live-dot" /> Live Updates
          </button>
          <button className="icon-button alert-bell" aria-label={`${activeAlertCount} active cyclone alerts`} onClick={() => document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth' })}>
            <Bell size={18} />{activeAlertCount > 0 && <i>{activeAlertCount}</i>}
          </button>
          <div className="profile-icon" aria-label="CycloneCare user"><span>CC</span></div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className={`side-navigation${mobileNavOpen ? ' nav-open' : ''}`}>
          <nav aria-label="Main navigation">
            {navItems.map(item => {
              const Icon = item.icon;
              return <button key={item.id} className={activeNav === item.id ? 'nav-item active' : 'nav-item'} onClick={() => selectNavigation(item)}>
                <Icon size={17} /><span>{item.label}</span>
                {item.id === 'alerts' && activeAlertCount > 0 && <b className="alert-count">{activeAlertCount}</b>}
              </button>;
            })}
          </nav>
          <div className="sidebar-foot"><div className="feed-pulse" /><div><strong>Live data feeds</strong><span>GDACS · Open-Meteo · OSM</span></div></div>
        </aside>

        <main className="dashboard-content">
          {displayError && <div className="feed-message" role="status"><AlertTriangle size={16} /><span>{displayError}</span><button onClick={() => { void refreshCyclones(); setLocation({ ...location }); }}>Retry</button></div>}

          <section className="primary-grid" aria-label="Live cyclone overview">
            <div className="map-panel panel" id="live-map">
              <div className="map-top-controls">
                <div className="layer-switcher" role="group" aria-label="Map layer">
                  {mapLayers.map(item => {
                    const Icon = item.icon;
                    return <button key={item.id} className={mapLayer === item.id ? 'layer-button selected' : 'layer-button'} onClick={() => setMapLayer(item.id)} title={`${item.label} layer`}>
                      <Icon size={14} /><span>{item.label}</span>
                    </button>;
                  })}
                </div>
                <button className={`map-assets-toggle${showAssets ? ' toggled' : ''}`} onClick={() => setShowAssets(value => !value)} title="Toggle mapped hospitals and shelters"><MapPin size={15} /> Assets</button>
              </div>
              <LiveMap
                center={mapCenter}
                selectedCyclone={selectedCyclone}
                assets={assets}
                layer={mapLayer}
                weatherApiKey={weatherApiKey}
                showAssets={showAssets}
              />
              {mapLayer !== 'satellite' && !weatherApiKey && <div className="map-layer-notice">Add the OpenWeather API key to enable this overlay. <button onClick={() => setNotice('settings')}>Settings</button></div>}
              <div className="map-location-chip"><span className="live-dot" /> LIVE MAP <span>{location.name}</span></div>
              <div className="map-attribution-note">Satellite tiles: Esri · Storm data: GDACS</div>
            </div>

            <section className="storm-panel panel" aria-label="Selected cyclone">
              <div className="storm-heading">
                <div><div className="storm-title-row"><h1>{selectedCyclone?.name || 'Cyclone activity'}</h1>{selectedCyclone && <span className="live-tag">LIVE</span>}</div>
                  <p>{selectedCyclone ? `GDACS alert level: ${selectedCyclone.alertLevel || 'Not supplied'}` : 'No active tropical cyclone event reported by GDACS'}</p>
                </div>
                <div className={selectedCyclone ? 'risk-badge' : 'risk-badge neutral'}><AlertTriangle size={15} /><span>{selectedCyclone?.alertLevel ? `${selectedCyclone.alertLevel} ALERT` : selectedCyclone ? 'ACTIVE EVENT' : 'NO ACTIVE ALERT'}</span></div>
              </div>
              {cyclones.length > 1 && <label className="cyclone-select-label">Active cyclone <span className="select-wrap"><select value={selectedCyclone?.id || ''} onChange={event => setSelectedCycloneId(event.target.value)}>
                {cyclones.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select><ChevronDown size={14} /></span></label>}

              <div className="metric-grid">
                <Metric icon={Wind} label="Cyclone wind" value={selectedCyclone?.windSpeedKmh == null ? '—' : `${numberText(selectedCyclone.windSpeedKmh)} km/h`} sub={selectedCyclone?.windSpeedKmh == null ? 'Not in source feed' : 'Provider reported'} />
                <Metric icon={Gauge} label="Pressure" value={weather?.current.pressureHpa == null ? '—' : `${numberText(weather.current.pressureHpa)} hPa`} sub="Current model" />
                <Metric icon={Navigation} label="Wind direction" value={weather?.current.windDirection == null ? '—' : `${numberText(weather.current.windDirection)}°`} sub="Current model" />
                <Metric icon={Activity} label="Reported positions" value={selectedCyclone?.coordinates.length ? String(selectedCyclone.coordinates.length) : '—'} sub="GDACS point geometry" />
              </div>

              <div className="event-meta">
                <div className="event-time"><CalendarDays size={18} /><div><span>Last source update</span><strong>{formatClock(selectedCyclone?.updatedAt)}</strong><small>{selectedCyclone?.sourceUrl ? <a href={selectedCyclone.sourceUrl} target="_blank" rel="noreferrer">GDACS event report <ExternalLink size={11} /></a> : 'GDACS event feed'}</small></div></div>
                <div className="event-summary"><AlertTriangle size={19} /><div><strong>{selectedCyclone ? 'Official event information' : 'Monitoring active events'}</strong><p>{selectedCyclone ? 'Follow national and local authority instructions. Forecast intensity and landfall are shown only when the source publishes them.' : 'No active tropical cyclone event is currently listed in the GDACS feed.'}</p></div></div>
              </div>

              <div className="forecast-heading" id="forecast"><h2>5 Day Local Forecast</h2><span>{location.name}</span></div>
              {weather?.daily.length ? <div className="five-day-list">{weather.daily.slice(0, 5).map((day, index) => <div className="forecast-day" key={day.date}>
                <span className="forecast-day-name">{index === 0 ? 'Today' : new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: weather.location.timezone }).format(new Date(`${day.date}T12:00:00`))}</span>
                <CloudRain size={15} className="forecast-icon" />
                <span className="forecast-rain">{day.precipitationMm == null ? '—' : `${numberText(day.precipitationMm)} mm`}</span>
                <span className="forecast-wind"><Wind size={13} /> {day.maxWindKmh == null ? '—' : `${numberText(day.maxWindKmh)} km/h`}</span>
                <strong>{day.minC == null || day.maxC == null ? '—' : `${numberText(day.minC)}° / ${numberText(day.maxC)}°`}</strong>
              </div>)}</div> : <div className="no-data-row">{weatherError || 'Forecast data is loading.'}</div>}
              <div className="source-footnote">Weather forecast by Open-Meteo · No cyclone forecast path is available unless provided by GDACS.</div>
            </section>
          </section>

          <section className="lower-grid" aria-label="Weather, infrastructure, and alerts">
            <section className="panel impact-panel" id="impact">
              <PanelTitle icon={MapPin} title="Nearby Mapped Facilities" trailing={loadingAssets ? 'Loading…' : `${assets.length} mapped`} />
              <div className="impact-body">
                <div className="mini-map-preview">
                  <MapContainer center={[location.latitude, location.longitude]} zoom={9} zoomControl={false} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} className="facility-map">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <CircleMarker center={[location.latitude, location.longitude]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#1682e8', fillOpacity: 1 }}><Tooltip>{location.name}</Tooltip></CircleMarker>
                    {nearestAssets.map(({ asset }) => <CircleMarker key={asset.id} center={[asset.lat, asset.lon]} radius={5} pathOptions={{ color: '#fff', weight: 1.5, fillColor: asset.type === 'hospital' ? '#e94851' : '#168b79', fillOpacity: .95 }}><Tooltip>{asset.name} · {asset.type}</Tooltip></CircleMarker>)}
                  </MapContainer>
                </div>
                <div className="facility-list">{nearestAssets.length ? nearestAssets.slice(0, 5).map(({ asset, distance }) => <div className="facility-row" key={asset.id}>
                  <span className={`facility-symbol ${asset.type}`}>{asset.type === 'hospital' ? '+' : 'S'}</span><span className="facility-name">{asset.name}</span><strong>{distance.toFixed(1)} km</strong>
                </div>) : <p className="empty-result">{loadingAssets ? 'Loading nearby mapped facilities…' : assetError || 'No mapped facilities in this area.'}</p>}
                  <p className="source-footnote">OpenStreetMap locations only. This is not a predicted impact or safety assessment.</p>
                </div>
              </div>
            </section>

            <section className="panel weather-panel" id="weather">
              <PanelTitle icon={MapPin} title={`Current Weather (${location.name})`} trailing={<button className="text-button" onClick={useMyLocation}>My location</button>} />
              <div className="weather-scene"><div className="weather-scene-sun" /><div className="weather-scene-cloud cloud-one" /><div className="weather-scene-cloud cloud-two" /><span>{weatherLabel(weather?.current.weatherCode ?? null)}</span></div>
              <div className="weather-conditions">
                <WeatherStat icon={Thermometer} label="Temperature" value={weather?.current.temperatureC == null ? '—' : `${numberText(weather.current.temperatureC)}°C`} />
                <WeatherStat icon={Droplets} label="Humidity" value={weather?.current.humidityPct == null ? '—' : `${numberText(weather.current.humidityPct)}%`} />
                <WeatherStat icon={CloudRain} label="Precipitation" value={weather?.current.precipitationMm == null ? '—' : `${numberText(weather.current.precipitationMm, 1)} mm`} />
                <WeatherStat icon={Wind} label="Wind speed" value={weather?.current.windKmh == null ? '—' : `${numberText(weather.current.windKmh)} km/h`} />
              </div>
              <div className="weather-footer"><span><i className="feed-pulse" /> {weather ? `Updated ${formatClock(weather.current.time, weather.location.timezone)}` : weatherError || 'Waiting for Open-Meteo'}</span><span>Open-Meteo</span></div>
            </section>

            <section className="panel alerts-panel" id="alerts">
              <PanelTitle icon={Bell} title="Latest Alerts" trailing={<button className="text-button" onClick={() => void refreshCyclones()}>{isRefreshing ? 'Refreshing…' : 'Refresh'} <Activity size={13} /></button>} />
              <div className="alert-list">
                {cycloneError ? <p className="empty-result">{cycloneError}</p> : cyclones.length ? cyclones.slice(0, 5).map((cyclone, index) => <a className={`alert-row alert-${index % 4}`} href={cyclone.sourceUrl || '#alerts'} key={cyclone.id} target={cyclone.sourceUrl ? '_blank' : undefined} rel="noreferrer">
                  <span className="alert-symbol"><AlertTriangle size={16} /></span><span className="alert-copy"><strong>{cyclone.name} · Tropical cyclone</strong><small>{cyclone.alertLevel ? `GDACS alert level ${cyclone.alertLevel}` : 'Active event reported by GDACS'}</small></span><time>{formatClock(cyclone.updatedAt)}</time>
                </a>) : <div className="no-alerts"><Check size={18} /><span>No active cyclone alerts reported by GDACS.</span></div>}
              </div>
              <div className="alert-source">Alert source: <a href="https://www.gdacs.org/" target="_blank" rel="noreferrer">GDACS <ExternalLink size={11} /></a></div>
            </section>
          </section>

          <footer className="dashboard-footer" id="historical">
            <span>Data is informational and may be delayed. Follow official emergency authorities.</span>
            <span>Weather: Open-Meteo · Cyclones: GDACS · Facilities: OpenStreetMap</span>
          </footer>
        </main>
      </div>

      {notice && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setNotice(''); }}>
        <section className="info-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button className="icon-button modal-close" aria-label="Close dialog" onClick={() => setNotice('')}><X size={18} /></button>
          {notice === 'safety' ? <><ShieldCheck size={24} className="modal-icon" /><h2 id="modal-title">Cyclone Safety</h2><p>Use official local warnings and evacuation orders. Keep drinking water, essential medicines, documents, a battery-powered radio, and charged phones ready. Stay away from windows and coastal floodwater during severe weather.</p><a className="official-link" href="https://ndma.gov.in/Natural-Hazards/Cyclone" target="_blank" rel="noreferrer">NDMA cyclone guidance <ExternalLink size={14} /></a><p className="modal-disclaimer">This dashboard is not an emergency alert service. In India, call 112 for emergency assistance.</p></>
            : notice === 'settings' ? <><Gauge size={24} className="modal-icon" /><h2 id="modal-title">Data & Map Settings</h2><p>Satellite imagery and live weather observations work without an API key. Wind, pressure, rainfall, cloud, and temperature map overlays require an OpenWeather API key.</p><code>VITE_OPENWEATHER_API_KEY=your_key</code><p>Set it in <strong>.env.local</strong>, then restart the development server. Never commit private keys.</p></>
              : notice === 'reports' ? <><ExternalLink size={24} className="modal-icon" /><h2 id="modal-title">Reports</h2><p>Reports are not generated because the connected public feeds do not provide a validated impact assessment. Exportable reporting can be added when an authoritative impact dataset is configured.</p></>
                : notice === 'historical' ? <><CalendarDays size={24} className="modal-icon" /><h2 id="modal-title">Historical Events</h2><p>Historical storm tracks are not bundled as sample data. The current GDACS event feed contains active events only; connect an official historical archive to enable this view.</p><a className="official-link" href="https://www.gdacs.org/" target="_blank" rel="noreferrer">GDACS data portal <ExternalLink size={14} /></a></>
                  : <><LocateFixed size={24} className="modal-icon" /><h2 id="modal-title">Location unavailable</h2><p>Location access was denied or timed out. Search for a city instead, or allow location access in your browser settings.</p></>}
        </section>
      </div>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub }: { icon: typeof Wind; label: string; value: string; sub: string }) {
  return <div className="metric-card"><Icon size={18} /><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></div>;
}

function PanelTitle({ icon: Icon, title, trailing }: { icon: typeof Wind; title: string; trailing?: React.ReactNode }) {
  return <div className="panel-title"><h2><Icon size={15} fill="currentColor" />{title}</h2>{trailing && <span>{trailing}</span>}</div>;
}

function WeatherStat({ icon: Icon, label, value }: { icon: typeof Wind; label: string; value: string }) {
  return <div className="weather-stat"><Icon size={19} /><span>{label}</span><strong>{value}</strong></div>;
}