import { EngineResult } from './core';

export interface PortfolioPoint {
  weights: number[];
  ret: number;
  vol: number;
  sharpe: number;
}

export interface OptimizationResult {
  portfolios: PortfolioPoint[];
  maxSharpe: PortfolioPoint;
  minVol: PortfolioPoint;
}

// Genera un vector aleatorio que suma 1 (Distribución Dirichlet uniforme plana)
const generateRandomWeights = (numAssets: number): number[] => {
  const weights = new Array(numAssets);
  let sum = 0;
  for (let i = 0; i < numAssets; i++) {
    const val = Math.random();
    weights[i] = val;
    sum += val;
  }
  for (let i = 0; i < numAssets; i++) {
    weights[i] /= sum;
  }
  return weights;
};

// Calcula el retorno y volatilidad de un portafolio dado sus pesos
const evaluatePortfolio = (
  weights: number[],
  expectedReturns: number[],
  covMatrix: number[][],
  riskFreeRate: number
): PortfolioPoint => {
  const numAssets = weights.length;
  
  // Retorno esperado = w^T * R
  let portReturn = 0;
  for (let i = 0; i < numAssets; i++) {
    portReturn += weights[i] * expectedReturns[i];
  }
  
  // Varianza = w^T * Cov * w
  let portVariance = 0;
  for (let i = 0; i < numAssets; i++) {
    let rowSum = 0;
    for (let j = 0; j < numAssets; j++) {
      rowSum += covMatrix[i][j] * weights[j];
    }
    portVariance += weights[i] * rowSum;
  }
  
  const portVol = Math.sqrt(Math.max(0, portVariance));
  const sharpe = portVol > 0 ? (portReturn - riskFreeRate) / portVol : 0;
  
  return {
    weights,
    ret: portReturn,
    vol: portVol,
    sharpe
  };
};

export const runMonteCarloOptimization = async (
  engineData: EngineResult,
  riskFreeRate: number,
  numSimulations: number = 10000,
  onProgress?: (progress: number) => void
): Promise<OptimizationResult> => {
  const expectedReturns = engineData.stats.map(s => s.annReturn);
  const covMatrix = engineData.covarianceMatrix;
  const numAssets = engineData.tickers.length;
  
  const portfolios: PortfolioPoint[] = [];
  
  let bestSharpe: PortfolioPoint | null = null;
  let bestMinVol: PortfolioPoint | null = null;

  // Ejecutamos en bloques para no bloquear el Hilo Principal (Main Thread) de la UI
  const CHUNK_SIZE = 500;
  
  for (let i = 0; i < numSimulations; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, numSimulations);
    
    for (let j = i; j < end; j++) {
      const weights = generateRandomWeights(numAssets);
      const pt = evaluatePortfolio(weights, expectedReturns, covMatrix, riskFreeRate);
      
      portfolios.push(pt);
      
      if (!bestSharpe || pt.sharpe > bestSharpe.sharpe) {
        bestSharpe = pt;
      }
      if (!bestMinVol || pt.vol < bestMinVol.vol) {
        bestMinVol = pt;
      }
    }
    
    // Reportar progreso y liberar el hilo
    if (onProgress) {
      onProgress((end / numSimulations) * 100);
    }
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return {
    portfolios,
    maxSharpe: bestSharpe!,
    minVol: bestMinVol!
  };
};
