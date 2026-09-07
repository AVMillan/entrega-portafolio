const fs = require('fs');
let code = fs.readFileSync('src/utils/exportExcel.ts', 'utf8');

// For "Resumen Portafolios", we want row 4 (Sharpe) to have '0.00' (no percentage)
// Note: In the previous code, row === 4 check was applied. We should ensure it works.
// We will explicitly set all formats to standard 2-decimal ('0.00') where appropriate.

// Let's rewrite the logic inside exportResultsToExcel for formatting:

code = code.replace(
  /  applyFormats\(wsResume, \(ref, cell\) => \{[\s\S]*?  \}\);/,
  `  applyFormats(wsResume, (ref, cell) => {
    const row = parseInt(ref.replace(/\\D/g, ''), 10);
    if (row === 4) { // Ratio de Sharpe
      cell.z = '0.00';
    } else { // Retornos, Riesgo y Pesos
      cell.z = '0.00%';
    }
  });`
);

// We need to verify how row is extracted, \D is non-digits. So it replaces letters with nothing, leaving the row number.
// In the previous attempt: const col = ref.replace(/[0-9]/g, ''); -> this gets the column letter.

code = code.replace(
  /  applyFormats\(wsSim, \(ref, cell\) => \{[\s\S]*?  \}\);/,
  `  applyFormats(wsSim, (ref, cell) => {
    const col = ref.replace(/[0-9]/g, '');
    if (col === 'C') { // Sharpe is in column C
      cell.z = '0.00';
    } else { // Retorno and Volatility in A and B
      cell.z = '0.00%';
    }
  });`
);

fs.writeFileSync('src/utils/exportExcel.ts', code);
