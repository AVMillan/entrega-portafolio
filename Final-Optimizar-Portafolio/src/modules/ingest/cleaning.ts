import { PriceRow } from '../../types';
import { formatDate } from '../../utils/formatters';

export interface CleaningResult {
  cleanData: PriceRow[];
  tickers: string[];
  diagnostic: {
    totalDates: number;
    filledGaps: number;
    startDate: string;
    endDate: string;
  };
  error?: string;
}

export const cleanAndAlignData = (rawData: PriceRow[], selectedTickers: string[], maxForwardFill: number = 3): CleaningResult => {
  if (rawData.length < 2) {
    return { cleanData: [], tickers: [], diagnostic: { totalDates: 0, filledGaps: 0, startDate: '', endDate: '' }, error: "Se requieren al menos 2 puntos de datos históricos para calcular retornos." };
  }

  if (selectedTickers.length === 0) {
    return { cleanData: [], tickers: [], diagnostic: { totalDates: 0, filledGaps: 0, startDate: '', endDate: '' }, error: "Debe seleccionar al menos un activo." };
  }

  // 1. Normalización de fechas y ordenamiento cronológico
  const normalizedData = rawData.map(row => {
    // Standardize date internally to sortable YYYY/MM/DD
    const parts = row.date.replace(/-/g, '/').split('/');
    let sortableDate = row.date;
    
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        sortableDate = `${parts[0]}/${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}`;
      } else {
        // DD/MM/YYYY
        sortableDate = `${parts[2]}/${parts[1].padStart(2, '0')}/${parts[0].padStart(2, '0')}`;
      }
    }
    
    return { ...row, _sortKey: sortableDate };
  });

  normalizedData.sort((a, b) => a._sortKey.localeCompare(b._sortKey));

  // Eliminar duplicados de fechas
  const uniqueDates = new Map<string, any>();
  normalizedData.forEach(row => {
    uniqueDates.set(row._sortKey, row);
  });

  const sortedData = Array.from(uniqueDates.values());

  // 2. Alineación de Fechas (Intersección estricta) y Manejo de Nulos (Forward Fill)
  let filledGaps = 0;
  const cleanData: PriceRow[] = [];

  // Mantenemos el último precio conocido de cada ticker para el forward fill
  const lastKnownPrices: Record<string, { price: number, missingDays: number }> = {};
  selectedTickers.forEach(t => lastKnownPrices[t] = { price: 0, missingDays: 0 });

  for (let i = 0; i < sortedData.length; i++) {
    const row = sortedData[i];
    const newRow: PriceRow = { date: formatDate(row._sortKey) };
    let isValidRow = true;

    for (const ticker of selectedTickers) {
      const price = Number(row[ticker]);
      
      if (price > 0) {
        newRow[ticker] = price;
        lastKnownPrices[ticker] = { price, missingDays: 0 };
      } else {
        // Falta el dato, intentamos Forward Fill
        const last = lastKnownPrices[ticker];
        if (last.price > 0 && last.missingDays < maxForwardFill) {
          newRow[ticker] = last.price;
          last.missingDays++;
          filledGaps++;
        } else {
          isValidRow = false; // Intersección estricta falla si no se puede rellenar
          break;
        }
      }
    }

    if (isValidRow) {
      cleanData.push(newRow);
    }
  }

  // Validación final de observaciones
  if (cleanData.length < 2) {
    return { 
      cleanData: [], 
      tickers: selectedTickers,
      diagnostic: { totalDates: 0, filledGaps: 0, startDate: '', endDate: '' },
      error: "Se requieren al menos 2 puntos de datos históricos alineados para calcular retornos. Revisa los activos seleccionados o el rango de fechas."
    };
  }

  return {
    cleanData,
    tickers: selectedTickers,
    diagnostic: {
      totalDates: cleanData.length,
      filledGaps,
      startDate: cleanData[0].date,
      endDate: cleanData[cleanData.length - 1].date
    }
  };
};
