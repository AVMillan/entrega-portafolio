const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

appCode = appCode.replace(
  /className="text-cyan-500 animate-pulse"/,
  'className="text-amber-500 animate-pulse"'
);

appCode = appCode.replace(
  /className="text-cyan-400 font-medium tracking-wide"/,
  'className="text-amber-500 font-medium tracking-wide"'
);

fs.writeFileSync('src/App.tsx', appCode);
