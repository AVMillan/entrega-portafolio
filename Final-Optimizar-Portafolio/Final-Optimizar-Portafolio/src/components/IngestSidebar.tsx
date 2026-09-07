import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, ChevronRight, Activity, Calendar, Download, Settings, Plus, X } from 'lucide-react';
import { parseFile } from '../modules/ingest/parser';
import { cleanAndAlignData, CleaningResult } from '../modules/ingest/cleaning';
import { PriceRow } from '../types';

interface IngestSidebarProps {
  onLoadingChange?: (isLoading: boolean) => void;
  onDataReady: (data: CleaningResult) => void;
  riskFreeRate: number;
  onRiskFreeRateChange: (val: number) => void;
}

export const IngestSidebar: React.FC<IngestSidebarProps> = ({ 
  onDataReady,
  riskFreeRate,
  onRiskFreeRateChange,
  onLoadingChange
}) => {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rawParsedData, setRawParsedData] = useState<PriceRow[]>([]);
  const [availableTickers, setAvailableTickers] = useState<string[]>([]);
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(new Set());
  const [diagnostic, setDiagnostic] = useState<CleaningResult['diagnostic'] | null>(null);

  // Yahoo API state
  const [yahooTicker, setYahooTicker] = useState('');
  const [isValidatingTicker, setIsValidatingTicker] = useState(false);
  const [apiTickers, setApiTickers] = useState<string[]>(['AAPL', 'MSFT', 'SPY']);
  
  // Format dates for inputs
  const today = new Date();
  const threeYearsAgo = new Date(today);
  threeYearsAgo.setFullYear(today.getFullYear() - 3);
  
  const [fromDate, setFromDate] = useState(threeYearsAgo.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    if (onLoadingChange) onLoadingChange(true);
    setFileError(null);
    setDiagnostic(null);

    const result = await parseFile(file);
    
    if (result.error) {
      setFileError(result.error);
      setLoading(false);
    if (onLoadingChange) onLoadingChange(false);
      return;
    }

    setRawParsedData(result.data);
    setAvailableTickers(result.tickers);
    setSelectedTickers(new Set(result.tickers)); // Seleccionar todos por defecto
    
    // Ejecutar limpieza inicial
    processData(result.data, result.tickers);
    setLoading(false);
    if (onLoadingChange) onLoadingChange(false);
  };

  const processData = (rawData: PriceRow[], tickersToProcess: string[]) => {
    const result = cleanAndAlignData(rawData, tickersToProcess);
    
    if (result.error) {
      setFileError(result.error);
      setDiagnostic(null);
      // Enviamos datos vacíos para limpiar la vista principal
      onDataReady({ cleanData: [], tickers: [], diagnostic: { totalDates: 0, filledGaps: 0, startDate: '', endDate: '' }, error: result.error });
    } else {
      setFileError(null);
      setDiagnostic(result.diagnostic);
      onDataReady(result);
    }
  };

  const toggleTicker = (ticker: string) => {
    const newSelected = new Set(selectedTickers);
    if (newSelected.has(ticker)) {
      newSelected.delete(ticker);
    } else {
      newSelected.add(ticker);
    }
    setSelectedTickers(newSelected);
    
    if (newSelected.size > 0 && rawParsedData.length > 0) {
        processData(rawParsedData, Array.from(newSelected) as string[]);
    } else {
        setDiagnostic(null);
        onDataReady({ cleanData: [], tickers: [], diagnostic: { totalDates: 0, filledGaps: 0, startDate: '', endDate: '' } });
    }
  };

  const handleAddYahooTicker = async () => {
    const tk = yahooTicker.trim().toUpperCase();
    
    // Validación de sintaxis básica (permite mercados extranjeros como TEF.MC o un par de letras extra)
    const isValid = /^[A-Z]{1,10}(\.[A-Z]{1,4})?$/.test(tk);
    
    if (!isValid && tk.length > 0) {
      setApiError("Formato de ticker inválido. Usa símbolos estándar. Ej: AAPL, TEF.MC");
      return;
    }
    
    if (!tk) return;

    if (apiTickers.includes(tk)) {
      setYahooTicker('');
      return;
    }

    setIsValidatingTicker(true);
    setApiError(null);
    try {
      const apiPath = window.location.hostname.includes('netlify.app') ? '/.netlify/functions/validate' : '/api/yahoo/validate';
      const res = await fetch(`${apiPath}?ticker=${tk}`);
      const data = await res.json();
      
      if (data.valid) {
        setApiTickers([...apiTickers, data.symbol]);
        setYahooTicker('');
      } else {
        setApiError(`El ticker "${tk}" no existe o no tiene datos en Yahoo Finance.`);
      }
    } catch (e) {
      setApiError(`Error validando el ticker "${tk}". Verifica tu conexión.`);
    } finally {
      setIsValidatingTicker(false);
    }
  };

  const removeApiTicker = (tk: string) => {
    setApiTickers(apiTickers.filter(t => t !== tk));
  };

  const setPresetDates = (years: number) => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - years);
    
    setToDate(end.toISOString().split('T')[0]);
    setFromDate(start.toISOString().split('T')[0]);
  };

  const downloadApiData = async () => {
    if (apiTickers.length === 0) {
      setApiError("Agrega al menos un ticker para descargar datos.");
      return;
    }
    if (!fromDate || !toDate) {
      setApiError("Selecciona las fechas de inicio y fin.");
      return;
    }

    setLoading(true);
    if (onLoadingChange) onLoadingChange(true);
    setApiError(null);
    setDiagnostic(null);

    try {
      const dateMap = new Map<string, any>();
      const processedTickers: string[] = [];

      for (const ticker of apiTickers) {
        const apiPath = window.location.hostname.includes('netlify.app') ? '/.netlify/functions/yahoo' : '/api/yahoo';
        const response = await fetch(`${apiPath}?ticker=${encodeURIComponent(ticker)}&period1=${fromDate}&period2=${toDate}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`Error al descargar ${ticker}: ${errData.error || response.statusText}`);
        }
        
        const data = await response.json();
        if (!data || data.length === 0) {
          throw new Error(`No se encontraron datos para ${ticker} en el rango seleccionado.`);
        }

        processedTickers.push(ticker);
        
        for (const row of data) {
          const dateStr = new Date(row.date).toISOString().split('T')[0].replace(/-/g, '/');
          
          if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, { date: dateStr });
          }
          
          const adjClose = row.adjClose ?? row.close;
          if (adjClose !== undefined && adjClose !== null) {
            dateMap.get(dateStr)[ticker] = adjClose;
          }
        }
      }

      const rawData = Array.from(dateMap.values());
      if (rawData.length === 0) {
        throw new Error("No se obtuvieron datos válidos para los tickers seleccionados.");
      }

      rawData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const result = cleanAndAlignData(rawData, processedTickers);
      if (result.error) {
        setApiError(result.error);
        onDataReady({ cleanData: [], tickers: [], diagnostic: { totalDates: 0, filledGaps: 0, startDate: '', endDate: '' }, error: result.error });
      } else {
        setDiagnostic(result.diagnostic);
        onDataReady(result);
      }
    } catch (err: any) {
      setApiError(err.message || "Error al conectar con el servidor proxy de Yahoo Finance.");
    } finally {
      setLoading(false);
    if (onLoadingChange) onLoadingChange(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Parámetros del Motor */}
      <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" />
          Parámetros del Motor
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-slate-400">Tasa Libre de Riesgo (Anual)</span>
              <span className="text-cyan-400 font-mono font-medium">{(riskFreeRate * 100).toFixed(2).replace('.', ',')}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="0.2" 
              step="0.0025" 
              value={riskFreeRate}
              onChange={(e) => onRiskFreeRateChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 mt-2">Usada para calcular el Ratio de Sharpe y la CML.</p>
          </div>
        </div>
      </div>

      {/* Yahoo Finance API */}
      <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Download className="w-4 h-4 text-slate-400" />
          API Yahoo Finance
        </h3>
        
        <div className="flex gap-2 mb-3">
          <input 
            type="text" 
            placeholder="Ej: AAPL" 
            value={yahooTicker}
            onChange={(e) => setYahooTicker(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddYahooTicker()}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <button 
            onClick={handleAddYahooTicker}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-1.5 rounded transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {apiError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-2.5 flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs leading-relaxed">{apiError}</p>
          </div>
        )}
        
        {apiTickers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {apiTickers.map(tk => (
              <span key={tk} className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs px-2 py-1 rounded flex items-center gap-1 font-mono">
                {tk}
                <button onClick={() => removeApiTicker(tk)} className="hover:text-blue-300 hover:bg-blue-500/20 rounded p-0.5"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Desde</label>
            <div className="relative">
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Hasta</label>
            <div className="relative">
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-1">
            <button onClick={() => setPresetDates(1)} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded py-1 text-xs text-slate-300 transition-colors">1A</button>
            <button onClick={() => setPresetDates(3)} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded py-1 text-xs text-slate-300 transition-colors">3A</button>
            <button onClick={() => setPresetDates(5)} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded py-1 text-xs text-slate-300 transition-colors">5A</button>
          </div>
        </div>

        <button 
          onClick={downloadApiData}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded shadow-lg shadow-blue-900/20 transition-colors text-sm"
        >
          Descargar Datos API
        </button>
      </div>

      {/* Upload File */}
      <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded p-3 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-[#10B981] font-semibold text-sm">Cierre Ajustado Activo</h4>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">
            El sistema requiere y procesará estrictamente precios de cierre ajustado (Adjusted Close) para capturar dividendos y splits.
          </p>
        </div>
      </div>

      {/* Upload File */}
      <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-slate-400" />
          Importar Datos
        </h3>
        
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-500 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <p className="mb-1 text-sm text-slate-400"><span className="font-semibold text-cyan-400">Clic para subir</span> o arrastra XLSX/CSV</p>
            <p className="text-xs text-slate-500">Detecta ancho, largo e identifica hojas.</p>
          </div>
          <input type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileUpload} />
        </label>

        {fileError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 flex items-start gap-3 mt-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs mt-1 leading-relaxed">{fileError}</p>
          </div>
        )}

      </div>

      {loading && (
        <div className="text-sm text-cyan-400 animate-pulse text-center">Analizando archivo...</div>
      )}


      {/* Tickers Selection */}
      {availableTickers.length > 0 && (
        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            Activos Detectados ({availableTickers.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {availableTickers.map(ticker => (
              <button
                key={ticker}
                onClick={() => toggleTicker(ticker)}
                className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors border ${
                  selectedTickers.has(ticker)
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                }`}
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic Panel */}
      {diagnostic && (
        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            Diagnóstico de Alineación
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Observaciones (días)</span>
              <span className="text-sm font-mono text-slate-200">{diagnostic.totalDates.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Rango Efectivo</span>
              <span className="text-xs font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded">
                {diagnostic.startDate} <ChevronRight className="w-3 h-3 inline text-slate-500" /> {diagnostic.endDate}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Huecos Rellenados (F. Fill)</span>
              <span className={`text-sm font-mono ${diagnostic.filledGaps > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {diagnostic.filledGaps}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
