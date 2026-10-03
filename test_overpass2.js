const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const query = `
  [out:json][timeout:15];
  node["amenity"="hospital"](19.0,84.0,22.0,89.0);
  out body center;
`;
fetch(OVERPASS_API_URL, { 
  method: 'POST', 
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=' + encodeURIComponent(query)
})
  .then(res => res.json())
  .then(data => console.log('Status: OK, Nodes:', data.elements.length))
  .catch(err => console.error('Error:', err));
