const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const query = `
  [out:json][timeout:15];
  node["amenity"="hospital"](19.0,84.0,22.0,89.0);
  out body center;
`;
fetch(OVERPASS_API_URL, { method: 'POST', body: query })
  .then(res => res.text().then(t => console.log('Status:', res.status, 'Body:', t.slice(0, 200))))
  .catch(err => console.error('Error:', err));
