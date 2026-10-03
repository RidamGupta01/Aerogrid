const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf-8');

const hook = `
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) { }
  };
  return [storedValue, setValue] as const;
}

export default function App() {`;

app = app.replace('export default function App() {', hook);

app = app.replace(
  "const [appMode, setAppMode] = useState('cyclone');",
  "const [appMode, setAppMode] = useLocalStorage('aerogrid_mode', 'cyclone');"
);

app = app.replace(
  "const [region, setRegion] = useState('odisha');",
  "const [region, setRegion] = useLocalStorage('aerogrid_region', 'odisha');"
);

app = app.replace(
  "const [userLocation, setUserLocation] = useState<[number, number] | null>(null);",
  "const [userLocation, setUserLocation] = useLocalStorage<[number, number] | null>('aerogrid_location', null);"
);

fs.writeFileSync('src/App.tsx', app);
console.log('App patched');
