import * as XLSX from 'xlsx';
import { PriceRow } from '../../types';

export interface ParseResult {
  data: PriceRow[];
  tickers: string[];
  error?: string;
}

const DATE_KEYWORDS = ['date', 'fecha', 'fechas', 'time'];
const TICKER_KEYWORDS = ['ticker', 'symbol', 'activo'];
const ADJ_CLOSE_KEYWORDS = ['adj close', 'adjusted close', 'cierre ajustado', 'close'];

// Helper para convertir fechas seriales de Excel a dd/mm/yyyy string
const excelDateToJSDateStr = (serial: number) => {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                          
  const date_info = new Date(utc_value * 1000);
  // Manejo básico de fecha
  const day = String(date_info.getUTCDate()).padStart(2, '0');
  const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
  const year = date_info.getUTCFullYear();
  return `${year}/${month}/${day}`;
};

export const parseFile = async (file: File): Promise<ParseResult> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 1. Detección Inteligente de Hojas
        let targetSheetName = workbook.SheetNames[0];
        const preferredNames = ['datos', 'históricos', 'historicos', 'prices', 'data'];
        for (const name of workbook.SheetNames) {
          const lowerName = name.toLowerCase();
          if (preferredNames.some(p => lowerName.includes(p))) {
            targetSheetName = name;
            break;
          }
        }
        const sheet = workbook.Sheets[targetSheetName];
        
        // Leer como array de arrays para inspección
        const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
        
        if (!aoa || aoa.length === 0) {
          resolve({ data: [], tickers: [], error: 'El archivo está vacío o la hoja no tiene datos.' });
          return;
        }
        
        // 2. Escaneo Dinámico de Encabezados (Header Sniffing)
        let headerRowIdx = -1;
        let dateColIdx = -1;
        for (let i = 0; i < Math.min(200, aoa.length); i++) {
          const row = aoa[i];
          if (!row) continue;
          
          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j]).toLowerCase().trim();
            if (DATE_KEYWORDS.some(kw => cell === kw)) {
              headerRowIdx = i;
              dateColIdx = j;
              break;
            }
          }
          if (headerRowIdx !== -1) break;
        }
        
        if (headerRowIdx === -1) {
          resolve({ data: [], tickers: [], error: `No se pudo detectar una columna de Fecha/Date en las primeras 200 filas de la hoja "${targetSheetName}".` });
          return;
        }
        
        const headers = aoa[headerRowIdx].map(h => String(h || '').trim());
        
        // 3. Soporte Flexible de Formatos (Ancho y Largo)
        const isLongFormat = headers.some(h => TICKER_KEYWORDS.includes(h.toLowerCase()));
        
        const rawData = aoa.slice(headerRowIdx + 1);
        const parsedRows: PriceRow[] = [];
        const tickersSet = new Set<string>();
        
        if (isLongFormat) {
          // Formato Largo (Date, Ticker, Adj Close)
          const tickerColIdx = headers.findIndex(h => TICKER_KEYWORDS.includes(h.toLowerCase()));
          let priceColIdx = headers.findIndex(h => ADJ_CLOSE_KEYWORDS.includes(h.toLowerCase()));
          
          if (tickerColIdx === -1 || priceColIdx === -1) {
            resolve({ data: [], tickers: [], error: 'Formato largo detectado pero faltan columnas de Ticker o Precio.' });
            return;
          }
          
          // Pivoteo manual
          const dateMap = new Map<string, PriceRow>();
          for (const row of rawData) {
            if (!row[dateColIdx] || !row[tickerColIdx] || row[priceColIdx] === undefined) continue;
            
            let dateStr = row[dateColIdx];
            if (typeof dateStr === 'number') dateStr = excelDateToJSDateStr(dateStr);
            else dateStr = String(dateStr).trim();
            
            const ticker = String(row[tickerColIdx]).trim().toUpperCase();
            let price = row[priceColIdx];
            if (typeof price === 'string') price = parseFloat(price.replace(/,/g, ''));
            if (isNaN(price)) continue;
            
            tickersSet.add(ticker);
            if (!dateMap.has(dateStr)) {
              dateMap.set(dateStr, { date: dateStr });
            }
            dateMap.get(dateStr)![ticker] = price;
          }
          parsedRows.push(...Array.from(dateMap.values()));
        } else {
          // Formato Ancho (Date, Ticker1, Ticker2...)
          const activeTickers = [];
          const seenTickers = new Set<string>();
          for (let i = 0; i < headers.length; i++) {
            if (i !== dateColIdx && headers[i]) {
              const tk = headers[i].toUpperCase();
              if (!seenTickers.has(tk)) {
                activeTickers.push({ col: i, ticker: tk });
                seenTickers.add(tk);
                tickersSet.add(tk);
              }
            }
          }
          
          for (const row of rawData) {
            if (!row[dateColIdx]) continue;
            
            let dateStr = row[dateColIdx];
            if (typeof dateStr === 'number') dateStr = excelDateToJSDateStr(dateStr);
            else dateStr = String(dateStr).trim();
            
            const priceRow: PriceRow = { date: dateStr };
            let hasValidPrice = false;
            for (const { col, ticker } of activeTickers) {
              let price = row[col];
              if (price !== undefined && price !== null) {
                if (typeof price === 'string') price = parseFloat(price.replace(/,/g, ''));
                if (!isNaN(price) && price > 0) { 
                   priceRow[ticker] = price;
                   hasValidPrice = true;
                }
              }
            }
            if (hasValidPrice) {
              parsedRows.push(priceRow);
            }
          }
        }
        
        resolve({
          data: parsedRows,
          tickers: Array.from(tickersSet).sort()
        });
        
      } catch (err: any) {
        resolve({ data: [], tickers: [], error: err.message || 'Error desconocido al procesar el archivo.' });
      }
    };
    
    reader.onerror = () => resolve({ data: [], tickers: [], error: 'Error al leer el archivo físico.' });
    reader.readAsArrayBuffer(file);
  });
};
