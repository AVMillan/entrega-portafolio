const fs = require('fs');
let code = fs.readFileSync('src/components/OptimizationResults.tsx', 'utf8');

// Import the function
if (!code.includes('exportResultsToExcel')) {
  code = code.replace(
    /import \{ formatPercentage, formatSharpe, formatDate \} from '\.\.\/utils\/formatters';/,
    "import { formatPercentage, formatSharpe, formatDate } from '../utils/formatters';\nimport { exportResultsToExcel } from '../utils/exportExcel';"
  );
}

// Add the button next to the title
const newTitleSection = `      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-200">Resultados de Optimización (Markowitz)</h2>
        <button
          onClick={() => exportResultsToExcel(optData, engineData, riskFreeRate)}
          className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded shadow-lg shadow-emerald-900/20 transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar a Excel
        </button>
      </div>`;

code = code.replace(
  /<h2 className="text-xl font-semibold text-slate-200 mb-6">Resultados de Optimización \(Markowitz\)<\/h2>/,
  newTitleSection
);

fs.writeFileSync('src/components/OptimizationResults.tsx', code);
