import React, { useState, useMemo } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis, 
  LineChart, Line, Legend, PieChart, Pie 
} from 'recharts';
import { Download, CheckCircle2, Target } from 'lucide-react';
import { toPng } from 'html-to-image';
import { OptimizationResult, EngineResult } from '../modules/engine';
import { formatPercentage, formatSharpe, formatDate } from '../utils/formatters';
import { exportResultsToExcel } from '../utils/exportExcel';

interface OptimizationResultsProps {
  optData: OptimizationResult | null;
  engineData: EngineResult | null;
  progress: number;
  isOptimizing: boolean;
  riskFreeRate: number;
}

const COLORS = ['#3b82f6', '#10b981', '#fbbf24', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#64748b'];

const ScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.isCML || data.isFrontier) return null; // No tooltip for CML or Frontier lines
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs z-50">
        <p className="text-slate-300 font-semibold mb-2 border-b border-slate-700 pb-1">
          {data.name || 'Portafolio Simulado'}
        </p>
        <p className="text-emerald-400 mb-1"><span className="text-slate-400">Retorno:</span> {formatPercentage(data.ret)}</p>
        <p className="text-amber-400 mb-1"><span className="text-slate-400">Volatilidad:</span> {formatPercentage(data.vol)}</p>
        <p className="text-cyan-400"><span className="text-slate-400">Sharpe:</span> {formatSharpe(data.sharpe)}</p>
      </div>
    );
  }
  return null;
};

const LineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-xl text-xs min-w-[150px] z-50">
        <p className="text-slate-300 font-semibold mb-2 border-b border-slate-700 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between gap-6 mb-1">
            <span style={{ color: entry.color }} className="font-semibold">{entry.name}</span>
            <span className="text-slate-200 font-mono">{formatPercentage(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const OptimizationResults: React.FC<OptimizationResultsProps> = ({ optData, engineData, progress, isOptimizing, riskFreeRate }) => {
  const [selectedPort, setSelectedPort] = useState<'GMV' | 'MaxSharpe'>('MaxSharpe');
  
  const exportChart = (id: string, filename: string) => {
    const node = document.getElementById(id);
    if (node) {
      toPng(node, { backgroundColor: '#0B0F17' })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = filename;
          link.href = dataUrl;
          link.click();
        })
        .catch((err) => console.error('Error exportando imagen:', err));
    }
  };

  const cumReturnsData = useMemo(() => {
    if (!engineData || !optData) return [];
    
    const gmvWeights = optData.minVol.weights;
    const msWeights = optData.maxSharpe.weights;

    return engineData.dates.map((dateStr, i) => {
      const row: any = { date: formatDate(dateStr) };
      let gmvRet = 0;
      let msRet = 0;
      engineData.tickers.forEach((tk, j) => {
        const val = engineData.cumulativeReturns[i][j];
        row[tk] = val;
        gmvRet += val * gmvWeights[j];
        msRet += val * msWeights[j];
      });
      row['Mínima Varianza (GMV)'] = gmvRet;
      row['Max Sharpe (Tangente)'] = msRet;
      return row;
    });
  }, [engineData, optData]);

  const cmlData = useMemo(() => {
    if (!optData) return [];
    const optMax = optData.maxSharpe;
    const slope = (optMax.ret - riskFreeRate) / optMax.vol;
    const maxVolInSim = Math.max(...optData.portfolios.map(p => p.vol));
    const endVol = maxVolInSim * 1.1; // Extend line slightly beyond max vol
    return [
      { vol: 0, ret: riskFreeRate, isCML: true },
      { vol: endVol, ret: riskFreeRate + slope * endVol, isCML: true }
    ];
  }, [optData, riskFreeRate]);

  const frontierLineData = useMemo(() => {
    if (!optData) return [];
    
    // Sort all portfolios by volatility ascending
    const sorted = [...optData.portfolios]
      .filter(p => p.ret >= optData.minVol.ret) // Only upper half
      .sort((a, b) => a.vol - b.vol);
      
    const frontier: any[] = [];
    let currentMaxRet = -Infinity;
    
    // Define a small volatility bucket to group points (e.g. 0.1%)
    const bucketSize = 0.001; 
    let currentBucketVol = sorted.length > 0 ? Math.floor(sorted[0].vol / bucketSize) * bucketSize : 0;
    let maxRetInBucket = -Infinity;
    
    for (const p of sorted) {
      const bucket = Math.floor(p.vol / bucketSize) * bucketSize;
      
      if (bucket > currentBucketVol) {
        if (maxRetInBucket > currentMaxRet) {
          frontier.push({ vol: currentBucketVol + bucketSize/2, ret: maxRetInBucket, isFrontier: true });
          currentMaxRet = maxRetInBucket;
        }
        currentBucketVol = bucket;
        maxRetInBucket = p.ret;
      } else {
        if (p.ret > maxRetInBucket) {
          maxRetInBucket = p.ret;
        }
      }
    }
    
    // Add the last bucket
    if (maxRetInBucket > currentMaxRet) {
      frontier.push({ vol: currentBucketVol + bucketSize/2, ret: maxRetInBucket, isFrontier: true });
    }
    
    // Smooth it by ensuring strict monotonic increase, though it should be by construction 
    // since we only push if > currentMaxRet
    return frontier;
  }, [optData]);

  if (isOptimizing) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-8 flex flex-col items-center justify-center min-h-[400px] mt-8">
        <div className="w-full max-w-md space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300 font-semibold">Simulando Portafolios (Monte Carlo)...</span>
            <span className="text-cyan-400 font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 text-center">Calculando Frontera Eficiente y CML</p>
        </div>
      </div>
    );
  }

  if (!optData || !engineData) return null;

  const renderPoints = optData.portfolios.filter((_, i) => i % 5 === 0);
  const optMax = optData.maxSharpe;
  const optMin = optData.minVol;

  const activeWeights = selectedPort === 'GMV' ? optMin.weights : optMax.weights;
  const pieData = activeWeights
    .map((w, i) => ({ name: engineData.tickers[i], value: w }))
    .filter(d => d.value > 0.001)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6 mt-8 animate-in fade-in duration-500">
      
      {/* Cards de Resumen */}
            <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-200">Resultados de Optimización (Markowitz)</h2>
        <button
          onClick={() => exportResultsToExcel(optData, engineData, riskFreeRate)}
          className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded shadow-lg shadow-emerald-900/20 transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar a Excel
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* GMV Card */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6">
          <h4 className="text-emerald-400 font-semibold flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-5 h-5" /> Mínima Varianza Global (GMV)
          </h4>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Retorno Esperado</p>
              <p className="text-2xl font-mono text-slate-200">{formatPercentage(optMin.ret)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Volatilidad (Riesgo)</p>
              <p className="text-2xl font-mono text-emerald-400">{formatPercentage(optMin.vol)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Sharpe Ratio</p>
              <p className="text-xl font-mono text-slate-200">{formatSharpe(optMin.sharpe)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Activos Considerados</p>
              <p className="text-xl font-mono text-slate-200">{engineData.tickers.length}</p>
            </div>
          </div>
        </div>

        {/* Max Sharpe Card */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6">
          <h4 className="text-cyan-400 font-semibold flex items-center gap-2 mb-6">
            <Target className="w-5 h-5" /> Máximo Ratio de Sharpe (Tangente)
          </h4>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Retorno Esperado</p>
              <p className="text-2xl font-mono text-slate-200">{formatPercentage(optMax.ret)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Volatilidad (Riesgo)</p>
              <p className="text-2xl font-mono text-slate-400">{formatPercentage(optMax.vol)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Sharpe Ratio</p>
              <p className="text-xl font-mono text-cyan-400">{formatSharpe(optMax.sharpe)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Activos Considerados</p>
              <p className="text-xl font-mono text-slate-200">{engineData.tickers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Frontera */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5 mb-6" id="frontier-chart">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-slate-200 font-semibold">Frontera Eficiente de Markowitz</h3>
          <button 
            onClick={() => exportChart('frontier-chart', 'frontera-eficiente.png')} 
            className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded transition-colors"
          >
            <Download className="w-3 h-3" /> Exportar PNG
          </button>
        </div>
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis 
                type="number" 
                dataKey="vol" 
                tickFormatter={(v) => `${(v * 100).toFixed(2)}%`} 
                stroke="#94a3b8" 
                domain={['dataMin', 'dataMax']} 
                tick={{ fontSize: 11 }}
                tickMargin={10}
              />
              <YAxis 
                type="number" 
                dataKey="ret" 
                tickFormatter={(v) => `${(v * 100).toFixed(2)}%`} 
                stroke="#94a3b8" 
                domain={['dataMin', 'dataMax']}
                tick={{ fontSize: 11 }}
              />
              <ZAxis type="number" range={[15, 15]} />
              <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              
              {/* Nube de puntos */}
              <Scatter name="Portafolios" data={renderPoints} fill="#0ea5e9" opacity={0.3}>
                {renderPoints.map((_, index) => <Cell key={`cell-${index}`} fill="#38bdf8" />)}
              </Scatter>
              
              {/* Línea del Mercado de Capitales (CML) */}
              <Scatter 
                name="CML" 
                data={cmlData} 
                line={{ stroke: '#ec4899', strokeDasharray: '5 5', strokeWidth: 2 }} 
                shape={() => null} 
              />
              
              {/* Línea de Frontera Eficiente (Contorno Blanco) */}
              <Scatter 
                name="Frontera Eficiente" 
                data={frontierLineData} 
                line={{ stroke: '#ffffff', strokeWidth: 2 }} 
                shape={() => null} 
              />
              
              {/* Puntos de interés */}
              <Scatter data={[{...optMin, name: 'Mínima Varianza Global'}]} fill="#10b981" shape="star">
                <Cell key="min-vol" fill="#10b981" />
              </Scatter>
              <Scatter data={[{...optMax, name: 'Máximo Sharpe (Tangente)'}]} fill="#eab308" shape="circle">
                <Cell key="max-sharpe" fill="#ffffff" stroke="#eab308" strokeWidth={3} />
              </Scatter>
              
              {/* Activos individuales */}
              {engineData.stats.map(stat => (
                <Scatter 
                  key={stat.ticker} 
                  data={[{ vol: stat.annVol, ret: stat.annReturn, sharpe: stat.sharpe, name: stat.ticker }]} 
                  fill="#f59e0b" 
                  shape="diamond"
                >
                  <Cell fill="#f59e0b" />
                </Scatter>
              ))}

            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos Inferiores */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Asignación de Capital */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5 flex flex-col" id="allocation-chart">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-slate-200 font-semibold">Asignación de Capital</h3>
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-900 rounded p-1">
                <button 
                  onClick={() => setSelectedPort('GMV')} 
                  className={`text-xs px-3 py-1 rounded transition-colors ${selectedPort === 'GMV' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  GMV
                </button>
                <button 
                  onClick={() => setSelectedPort('MaxSharpe')} 
                  className={`text-xs px-3 py-1 rounded transition-colors ${selectedPort === 'MaxSharpe' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Max Sharpe
                </button>
              </div>
              <button onClick={() => exportChart('allocation-chart', 'asignacion.png')} className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-1.5 rounded transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 flex-1">
            <div className="h-[250px] w-full sm:w-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieData} 
                    innerRadius={60} 
                    outerRadius={85} 
                    paddingAngle={2} 
                    dataKey="value" 
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatPercentage(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 w-full max-h-[250px] overflow-y-auto pr-2">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[#0B0F17] z-10">
                  <tr className="border-b border-slate-700">
                    <th className="pb-2 text-slate-400 font-semibold text-xs tracking-wider">ACTIVO</th>
                    <th className="pb-2 text-slate-400 font-semibold text-xs tracking-wider text-right">PESO (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {pieData.map((d, i) => (
                    <tr key={d.name} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="text-slate-300 font-medium">{d.name}</span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-200">{formatPercentage(d.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Retornos Históricos */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5 flex flex-col" id="history-chart">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-slate-200 font-semibold">Retornos Acumulados Históricos</h3>
            <button 
              onClick={() => exportChart('history-chart', 'retornos.png')} 
              className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded transition-colors"
            >
              <Download className="w-3 h-3" /> Exportar PNG
            </button>
          </div>
          
          <div className="flex-1 min-h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumReturnsData} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 10 }} 
                  tickMargin={12} 
                  minTickGap={40} 
                />
                <YAxis 
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 10 }} 
                />
                <Tooltip content={<LineTooltip />} />
                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} 
                />
                
                {/* Activos individuales (finos y semi-transparentes) */}
                {engineData.tickers.map((tk, i) => (
                  <Line 
                    key={tk} 
                    type="monotone" 
                    dataKey={tk} 
                    stroke={COLORS[i % COLORS.length]} 
                    dot={false} 
                    strokeWidth={1} 
                    opacity={0.5} 
                  />
                ))}
                
                {/* Portafolios Óptimos (gruesos y sólidos) */}
                <Line 
                  type="monotone" 
                  dataKey="Max Sharpe (Tangente)" 
                  stroke="#3b82f6" 
                  dot={false} 
                  strokeWidth={2.5} 
                />
                <Line 
                  type="monotone" 
                  dataKey="Mínima Varianza (GMV)" 
                  stroke="#10b981" 
                  dot={false} 
                  strokeWidth={2.5} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
