import * as XLSX from 'xlsx';
import { OptimizationResult } from '../modules/engine/optimizer';
import { EngineResult } from '../modules/engine/core';

// Función auxiliar para aplicar formatos nativos de Excel a las celdas
const applyFormats = (ws: XLSX.WorkSheet, formatRules: (cellRef: string, cell: XLSX.CellObject) => void) => {
  for (const key in ws) {
    if (key.startsWith('!')) continue;
    const cell = ws[key];
    if (cell.t === 'n') {
      formatRules(key, cell);
    }
  }
};

export const exportResultsToExcel = (
  optData: OptimizationResult,
  engineData: EngineResult,
  riskFreeRate: number
) => {
  const wb = XLSX.utils.book_new();

  // 1. Resumen Portafolios
  const resumeData = [
    ['Métrica', 'Portafolio de Tangencia (Max Sharpe)', 'Mínima Varianza Global (GMV)'],
    ['Retorno Esperado (Anual)', optData.maxSharpe.ret, optData.minVol.ret],
    ['Volatilidad (Riesgo Anual)', optData.maxSharpe.vol, optData.minVol.vol],
    ['Ratio de Sharpe', optData.maxSharpe.sharpe, optData.minVol.sharpe],
    [],
    ['Pesos Óptimos', '', ''],
  ];

  engineData.tickers.forEach((ticker, index) => {
    resumeData.push([
      ticker,
      optData.maxSharpe.weights[index] || 0,
      optData.minVol.weights[index] || 0
    ]);
  });

  const wsResume = XLSX.utils.aoa_to_sheet(resumeData);
  applyFormats(wsResume, (ref, cell) => {
    const row = parseInt(ref.replace(/\D/g, ''), 10);
    if (row === 4) { // Ratio de Sharpe
      cell.z = '0.00%';
    } else { // Retornos, Riesgo y Pesos
      cell.z = '0.00%';
    }
  });
  // Ajustar anchos de columna para mejor legibilidad
  wsResume['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsResume, 'Resumen Portafolios');

  // 2. Simulaciones Monte Carlo
  const simData = optData.portfolios.map(p => ({
    'Retorno Esperado': p.ret,
    'Volatilidad (Riesgo)': p.vol,
    'Ratio de Sharpe': p.sharpe
  }));
  const wsSim = XLSX.utils.json_to_sheet(simData);
  applyFormats(wsSim, (ref, cell) => {
    cell.z = '0.00%'; // Formatear todo (Retorno, Volatilidad y Sharpe) como porcentaje
  });
  wsSim['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSim, 'Simulaciones Monte Carlo');

  // 3. Matriz de Covarianzas
  const covData: any[][] = [['', ...engineData.tickers]];
  engineData.tickers.forEach((t1, i) => {
    const row = [t1];
    engineData.tickers.forEach((t2, j) => {
      row.push(engineData.covarianceMatrix[i][j]);
    });
    covData.push(row);
  });
  const wsCov = XLSX.utils.aoa_to_sheet(covData);
  applyFormats(wsCov, (ref, cell) => {
    cell.z = '0.00%';
  });
  // Ajustar anchos
  const covCols = [{ wch: 10 }];
  engineData.tickers.forEach(() => covCols.push({ wch: 12 }));
  wsCov['!cols'] = covCols;
  
  XLSX.utils.book_append_sheet(wb, wsCov, 'Matriz Covarianzas');

  try {
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Resultados_Optimizacion_Portafolios_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
    console.log("Excel exportado exitosamente:", fileName);
  } catch (error) {
    console.error("Error al exportar Excel:", error);
  }
};
