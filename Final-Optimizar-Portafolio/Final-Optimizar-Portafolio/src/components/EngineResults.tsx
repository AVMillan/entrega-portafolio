import React from 'react';
import { EngineResult } from '../modules/engine';
import { formatPercentage, formatSharpe } from '../utils/formatters';

interface EngineResultsProps {
  engineData: EngineResult | null;
}

// Escala de colores para el heatmap (de -1 a 1)
const getCorrelationColor = (value: number, isDiagonal: boolean = false) => {
  if (isDiagonal || Math.abs(value - 1.0) < 1e-5) return 'bg-[#1E3A8A] text-slate-200'; // Dark blue background for diagonal like the screenshot
  if (value > 0.5) return 'bg-emerald-700/80 text-emerald-100';
  if (value > 0) return 'bg-emerald-900/60 text-emerald-200';
  if (value < -0.5) return 'bg-red-700/80 text-red-100';
  if (value < 0) return 'bg-red-900/60 text-red-200';
  return 'bg-slate-800 text-slate-400';
};

export const EngineResults: React.FC<EngineResultsProps> = ({ engineData }) => {
  if (!engineData) return null;

  return (
    <div className="space-y-6">
      <div className="text-slate-300 text-sm font-semibold tracking-wider uppercase border-b border-slate-700 pb-2 mb-4 mt-8">
        Motor de Procesamiento (Estadísticas y Covarianzas)
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Tabla de Estadísticas */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 overflow-hidden flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Estadísticas Descriptivas (Anualizadas)</h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-[#111827]">
                <tr>
                  <th className="p-3 border-b border-slate-700 font-semibold text-slate-300">Activo</th>
                  <th className="p-3 border-b border-slate-700 font-semibold text-slate-300 text-right">Retorno Esperado Anualizado</th>
                  <th className="p-3 border-b border-slate-700 font-semibold text-slate-300 text-right">Volatilidad Anualizada</th>
                  <th className="p-3 border-b border-slate-700 font-semibold text-slate-300 text-right">Ratio Sharpe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 font-mono">
                {engineData.stats.map(stat => (
                  <tr key={stat.ticker} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-semibold text-cyan-400">{stat.ticker}</td>
                    <td className="p-3 text-right tabular-nums text-slate-300">{formatPercentage(stat.annReturn)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-300">{formatPercentage(stat.annVol)}</td>
                    <td className="p-3 text-right tabular-nums text-emerald-400">{formatSharpe(stat.sharpe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Matrices */}
      <div className="space-y-6">
        {/* Matriz de Varianzas y Covarianzas */}
        <div className="bg-[#111827]/80 border border-slate-700/50 rounded-lg p-4 overflow-hidden flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center">
            <svg className="w-4 h-4 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4zm0 5c0 2.21 3.582 4 8 4s8-1.79 8-4"></path></svg>
            Matriz de Varianzas y Covarianzas (Anualizada)
          </h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-3 border-b border-slate-700/50 bg-transparent"></th>
                  {engineData.tickers.map(ticker => (
                    <th key={ticker} className="p-3 border-b border-slate-700/50 bg-transparent text-slate-400 font-semibold text-center tracking-wider">
                      {ticker}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                {engineData.covarianceMatrix.map((row, i) => (
                  <tr key={engineData.tickers[i]}>
                    <td className="p-3 border-b border-slate-700/50 bg-transparent font-semibold text-slate-400">
                      {engineData.tickers[i]}
                    </td>
                    {row.map((val, j) => {
                      const formattedVal = (val * 100).toFixed(2).replace('.', ',') + '%';
                      const isDiagonal = i === j;
                      return (
                        <td 
                          key={`${i}-${j}`} 
                          className={`p-3 text-center tabular-nums ${isDiagonal ? 'bg-slate-800 border border-slate-600 rounded' : 'text-slate-400'}`}
                        >
                          {formattedVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mapa de Calor de Correlaciones */}
        <div className="bg-[#111827]/80 border border-slate-700/50 rounded-lg p-4 overflow-hidden flex flex-col">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center">
            <svg className="w-4 h-4 mr-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            Matriz de Correlaciones Muestral
          </h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse text-xs border-spacing-1 border-separate">
              <thead>
                <tr>
                  <th className="p-3 bg-transparent"></th>
                  {engineData.tickers.map(ticker => (
                    <th key={ticker} className="p-3 bg-transparent text-slate-400 font-semibold text-center tracking-wider">
                      {ticker}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                {engineData.correlationMatrix.map((row, i) => (
                  <tr key={engineData.tickers[i]}>
                    <td className="p-3 bg-transparent font-semibold text-slate-400">
                      {engineData.tickers[i]}
                    </td>
                    {row.map((val, j) => {
                      const formattedVal = val.toFixed(2).replace('.', ',');
                      const isDiagonal = i === j;
                      return (
                        <td 
                          key={`${i}-${j}`} 
                          className={`p-3 text-center tabular-nums transition-colors rounded ${getCorrelationColor(val, isDiagonal)}`}
                        >
                          {formattedVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
