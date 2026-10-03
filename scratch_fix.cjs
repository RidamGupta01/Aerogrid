const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf-8');
css = css.replace(/\/\* Custom Range Slider \*\/[\s\S]*?(?=EOF|$)/, '');
fs.writeFileSync('src/index.css', css.trim() + '\n');
console.log('Removed custom CSS');

let tsx = fs.readFileSync('src/components/SidePanel.tsx', 'utf-8');
tsx = tsx.replace(/className="w-full accent-white cursor-pointer h-1\.5 bg-\[#3C4043\] rounded-lg appearance-none"/g, 'className="w-full accent-white cursor-pointer bg-[#3C4043] h-2 rounded-lg"');
fs.writeFileSync('src/components/SidePanel.tsx', tsx);
console.log('Updated SidePanel');

let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(/className="w-full accent-white cursor-pointer h-1\.5 bg-\[#3C4043\] rounded-lg appearance-none"/g, 'className="w-full accent-white cursor-pointer bg-[#3C4043] h-2 rounded-lg"');
fs.writeFileSync('src/App.tsx', app);
console.log('Updated App');
