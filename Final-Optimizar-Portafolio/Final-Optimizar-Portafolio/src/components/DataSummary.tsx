import React from 'react';
import { CleaningResult } from '../modules/ingest/cleaning';
import { formatNumber } from '../utils/formatters';

interface DataSummaryProps {
  ingestData: CleaningResult;
}

export const DataSummary: React.FC<DataSummaryProps> = ({ ingestData }) => {
  const { cleanData, tickers, diagnostic } = ingestData;
  const validAssets = tickers.length;
  const observations = cleanData.length;
  const filledGaps = diagnostic.filledGaps;
  
  // Format dates: Assuming YYYY/MM/DD or YYYY-MM-DD
  const formatDisplayDate = (d: string) => {
    if (!d) return '';
    return d.replace(/\//g, '-');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 overflow-hidden flex flex-col">
        <div className="flex items-center mb-4 text-slate-300 font-semibold text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
          Previsualización de Datos (Primeras 5 filas)
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#111827]">
              <tr>
                <th className="p-3 border-b border-slate-700 font-semibold text-slate-400 text-xs tracking-wider uppercase">Fecha</th>
                {tickers.map(t => (
                  <th key={t} className="p-3 border-b border-slate-700 font-semibold text-slate-400 text-xs tracking-wider uppercase text-right">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 font-mono">
              {cleanData.slice(0, 5).map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 text-slate-300">{formatDisplayDate(row.date)}</td>
                  {tickers.map(t => {
                     const val = Number(row[t]);
                     // Format logic exactly like the user's screenshot: "152,83"
                     return (
                        <td key={t} className="p-3 text-right text-slate-300">
                          {formatNumber(val)}
                        </td>
                     );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-center text-xs text-slate-500 mt-4 pt-2 border-t border-slate-700/30">
           Mostrando 5 de {observations} filas totales.
        </div>
      </div>
    </div>
  );
};
