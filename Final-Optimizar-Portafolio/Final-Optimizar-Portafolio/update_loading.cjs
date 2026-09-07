const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
let sidebarCode = fs.readFileSync('src/components/IngestSidebar.tsx', 'utf8');

// Update IngestSidebar
sidebarCode = sidebarCode.replace(
  /interface IngestSidebarProps \{/,
  'interface IngestSidebarProps {\n  onLoadingChange?: (isLoading: boolean) => void;'
);

sidebarCode = sidebarCode.replace(
  /export const IngestSidebar: React\.FC<IngestSidebarProps> = \(\{\s*onDataReady,\s*riskFreeRate,\s*onRiskFreeRateChange\s*\}\) => \{/,
  'export const IngestSidebar: React.FC<IngestSidebarProps> = ({ \n  onDataReady,\n  riskFreeRate,\n  onRiskFreeRateChange,\n  onLoadingChange\n}) => {'
);

sidebarCode = sidebarCode.replace(/setLoading\((true|false)\)/g, (match, p1) => {
  return `setLoading(${p1});\n    if (onLoadingChange) onLoadingChange(${p1})`;
});

fs.writeFileSync('src/components/IngestSidebar.tsx', sidebarCode);

// Update App.tsx
appCode = appCode.replace(
  /const \[ingestData, setIngestData\] = useState<CleaningResult \| null>\(null\);/,
  'const [ingestData, setIngestData] = useState<CleaningResult | null>(null);\n  const [isDataLoading, setIsDataLoading] = useState(false);'
);

appCode = appCode.replace(
  /<IngestSidebar \s*onDataReady=\{handleDataReady\} \s*riskFreeRate=\{riskFreeRate\}\s*onRiskFreeRateChange=\{setRiskFreeRate\}\s*\/>/g,
  '<IngestSidebar \n              onDataReady={handleDataReady} \n              riskFreeRate={riskFreeRate}\n              onRiskFreeRateChange={setRiskFreeRate}\n              onLoadingChange={setIsDataLoading}\n            />'
);

// We need to modify the main area logic in App.tsx
// If isDataLoading is true, show the loader.
const loadingJSX = `
            {isDataLoading ? (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6 min-h-[400px] flex items-center justify-center flex-col gap-4">
                 <div className="text-cyan-500 animate-pulse">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                 </div>
                 <div className="text-cyan-400 font-medium tracking-wide">
                    Procesando datos del mercado...
                 </div>
              </div>
            ) : !ingestData?.cleanData || ingestData.cleanData.length === 0 ? (
`;

appCode = appCode.replace(
  /\{\!ingestData\?\.cleanData \|\| ingestData\.cleanData\.length === 0 \? \(/,
  loadingJSX
);

fs.writeFileSync('src/App.tsx', appCode);
