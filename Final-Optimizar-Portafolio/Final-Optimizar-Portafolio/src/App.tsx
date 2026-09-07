/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IngestSidebar } from './components/IngestSidebar';
import { EngineResults } from './components/EngineResults';
import { OptimizationResults } from './components/OptimizationResults';
import { DataSummary } from './components/DataSummary';
import { CleaningResult } from './modules/ingest/cleaning';
import { runEngine, runMonteCarloOptimization, OptimizationResult } from './modules/engine';
import { formatCurrency } from './utils/formatters';

export default function App() {
  const [ingestData, setIngestData] = useState<CleaningResult | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [riskFreeRate, setRiskFreeRate] = useState<number>(0);
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optProgress, setOptProgress] = useState(0);
  const [optData, setOptData] = useState<OptimizationResult | null>(null);

  // Resize logic
  const [sidebarWidth, setSidebarWidth] = useState(320); // 320px default
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing.current) {
      setSidebarWidth((prevWidth) => Math.max(250, Math.min(mouseMoveEvent.clientX, 800)));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handleDataReady = (data: CleaningResult) => {
    setIngestData(data);
    setOptData(null); // Reset optimization when new data arrives
  };

  const engineData = useMemo(() => {
    if (!ingestData?.cleanData || ingestData.cleanData.length < 2) return null;
    return runEngine(ingestData.cleanData, ingestData.tickers, riskFreeRate);
  }, [ingestData, riskFreeRate]);


  useEffect(() => {
    let isMounted = true;
    
    const runOpt = async () => {
      if (!engineData) {
        setOptData(null);
        return;
      }
      setIsOptimizing(true);
      setOptProgress(0);
      try {
        const result = await runMonteCarloOptimization(
          engineData, 
          riskFreeRate, 
          10000, 
          (p) => { if (isMounted) setOptProgress(p); }
        );
        if (isMounted) setOptData(result);
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setIsOptimizing(false);
      }
    };

    runOpt();

    return () => {
      isMounted = false;
    };
  }, [engineData, riskFreeRate]);

  return (
    <ErrorBoundary>
      <div className="h-screen overflow-hidden bg-[#0B0F17] text-slate-200 flex flex-col font-sans">
        {/* Encabezado global */}
        <header className="w-full bg-[#111827] border-b border-slate-800 p-4 shrink-0">
          <h1 className="text-xl font-bold text-[#00F0FF] tracking-wide uppercase">
            Optimización de Portafolios
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Modelos y Simulaciones Financieras &bull; Angela Millán &bull; Prof. Rudi L. Cressa A.
          </p>
        </header>

        {/* Contenedor Principal (Sidebar + Main) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Barra Lateral de Controles */}
          <aside className="bg-[#111827]/50 border-r border-slate-800 p-4 overflow-y-auto flex flex-col shrink-0" style={{ width: sidebarWidth }}>
            <div className="text-slate-300 text-sm font-semibold tracking-wider uppercase border-b border-slate-700 pb-2 mb-4">
              Controles e Ingesta
            </div>
            
            <IngestSidebar 
              onDataReady={handleDataReady} 
              riskFreeRate={riskFreeRate}
              onRiskFreeRateChange={setRiskFreeRate}
              onLoadingChange={setIsDataLoading}
            />
            
          </aside>

          {/* Resizer Handle */}
          <div
            className="w-2 cursor-col-resize hover:bg-cyan-500/30 bg-transparent shrink-0 z-10 transition-colors border-r border-slate-800/30 -ml-1"
            onMouseDown={startResizing}
          />

          {/* Área Principal de Resultados */}
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="text-slate-300 text-sm font-semibold tracking-wider uppercase border-b border-slate-700 pb-2 mb-4">
              Resultados
            </div>
            
            
            {isDataLoading ? (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6 min-h-[400px] flex items-center justify-center flex-col gap-4">
                 <div className="text-amber-500 animate-pulse">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                 </div>
                 <div className="text-amber-500 font-medium tracking-wide">
                    Procesando datos del mercado...
                 </div>
              </div>
            ) : !ingestData?.cleanData || ingestData.cleanData.length === 0 ? (

              <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6 min-h-[400px] flex items-center justify-center flex-col gap-3">
                 <div className="text-slate-500 text-sm italic">
                    Esperando importación de datos...
                 </div>
                 {ingestData?.error && (
                    <div className="text-red-400 text-sm max-w-md text-center bg-red-900/20 p-3 rounded">
                      {ingestData.error}
                    </div>
                 )}
              </div>
            ) : (
              <div className="space-y-6">
                <DataSummary ingestData={ingestData} />
                
                {/* Motor de Procesamiento (Estadísticas y Covarianzas) */}
                <EngineResults engineData={engineData} />

                {/* Optimización */}
                {(isOptimizing || optData) && (
                  <OptimizationResults 
                    optData={optData} 
                    engineData={engineData} 
                    progress={optProgress} 
                    isOptimizing={isOptimizing} 
                    riskFreeRate={riskFreeRate}
                  />
                )}
              </div>
            )}
          </main>
        </div>

        {/* Pie de página global */}
        <footer className="w-full bg-[#111827] border-t border-slate-800 p-4 text-xs text-slate-400 flex flex-col sm:flex-row sm:justify-between items-center text-center sm:text-left gap-2 shrink-0">
          <div>
            Modelos y Simulaciones Financieras (Trimestre Julio - Septiembre 2026)<br/>
            Desarrollado por: <span className="text-slate-300">Angela Millán</span>
          </div>
          <div className="sm:text-right">
            Cátedra: Prof. Rudi L. Cressa A.<br/>
            Instituto de Estudios Superiores de Administración (IESA)
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
