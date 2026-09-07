const fs = require('fs');

// 1. Fix formatters.ts
let formatters = fs.readFileSync('src/utils/formatters.ts', 'utf8');
formatters = formatters.replace(
  /export const formatSharpe = \(value: number\): string => \{[\s\S]*?\};/,
  `export const formatSharpe = (value: number): string => {
  if (isNaN(value)) return '0,00%';
  return new Intl.NumberFormat('es-ES', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};`
);
fs.writeFileSync('src/utils/formatters.ts', formatters);

// 2. Fix exportExcel.ts
let exportExcel = fs.readFileSync('src/utils/exportExcel.ts', 'utf8');

// Resumen Portafolios (row 4 -> '0.00%')
exportExcel = exportExcel.replace(
  /    if \(row === 4\) \{ \/\/ Ratio de Sharpe\n      cell\.z = '0\.00';/,
  `    if (row === 4) { // Ratio de Sharpe
      cell.z = '0.00%';`
);

// Simulaciones Monte Carlo (col C -> '0.00%')
exportExcel = exportExcel.replace(
  /    if \(col === 'C'\) \{ \/\/ Sharpe\n      cell\.z = '0\.00';/,
  `    if (col === 'C') { // Sharpe
      cell.z = '0.00%';`
);

fs.writeFileSync('src/utils/exportExcel.ts', exportExcel);

