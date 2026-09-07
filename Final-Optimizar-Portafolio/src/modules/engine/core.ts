import { PriceRow, AssetStats } from '../../types';

export interface EngineResult {
  dates: string[];
  tickers: string[];
  dailyReturns: number[][]; // [date_index][ticker_index]
  cumulativeReturns: number[][]; // [date_index][ticker_index]
  stats: AssetStats[];
  covarianceMatrix: number[][]; // Anualizada
  correlationMatrix: number[][];
}

export const runEngine = (data: PriceRow[], tickers: string[], riskFreeRate: number = 0): EngineResult => {
  const N = data.length;
  const T = tickers.length;

  const dates: string[] = [];
  const dailyReturns: number[][] = [];
  const cumulativeReturns: number[][] = [];

  // Inicializar multiplicadores acumulados para la composición geométrica
  const cumMultipliers = new Array(T).fill(1);

  // 1 & 2. Retornos simples y acumulados
  for (let i = 1; i < N; i++) {
    dates.push(data[i].date);
    const rowReturns: number[] = [];
    const rowCum: number[] = [];

    for (let j = 0; j < T; j++) {
      const ticker = tickers[j];
      const priceToday = Number(data[i][ticker]);
      const priceYesterday = Number(data[i - 1][ticker]);

      let R_t = 0;
      if (priceYesterday > 0) {
        R_t = (priceToday / priceYesterday) - 1;
      }

      rowReturns.push(R_t);
      cumMultipliers[j] *= (1 + R_t);
      rowCum.push(cumMultipliers[j] - 1); // prod(1 + R_t) - 1
    }
    dailyReturns.push(rowReturns);
    cumulativeReturns.push(rowCum);
  }

  // 3. Estadísticas descriptivas (Media diaria)
  const numReturns = dailyReturns.length;
  const means = new Array(T).fill(0);
  for (let i = 0; i < numReturns; i++) {
    for (let j = 0; j < T; j++) {
      means[j] += dailyReturns[i][j];
    }
  }
  for (let j = 0; j < T; j++) {
    means[j] /= numReturns;
  }

  // 4 & 5. Matriz de Covarianzas (Muestral)
  const covarianceMatrix: number[][] = Array(T).fill(0).map(() => Array(T).fill(0));
  const correlationMatrix: number[][] = Array(T).fill(0).map(() => Array(T).fill(0));
  const variances = new Array(T).fill(0);

  if (numReturns > 1) {
    for (let i = 0; i < T; i++) {
      for (let j = 0; j < T; j++) {
        let sumProduct = 0;
        for (let t = 0; t < numReturns; t++) {
          sumProduct += (dailyReturns[t][i] - means[i]) * (dailyReturns[t][j] - means[j]);
        }
        let cov = sumProduct / (numReturns - 1); // Muestral (n-1)
        
        // 6. Protección contra división por cero (Estabilidad numérica)
        if (i === j) {
          cov += 1e-8; // Regularización
          variances[i] = cov;
        }
        covarianceMatrix[i][j] = cov;
      }
    }
  }

  // Stats Finales
  const stats: AssetStats[] = [];
  for (let i = 0; i < T; i++) {
    const annReturn = means[i] * 252;
    let variance = variances[i];
    
    if (isNaN(variance) || variance <= 0) variance = 1e-8;
    
    const annVol = Math.sqrt(variance * 252);
    const sharpe = annVol > 0 ? ((annReturn - riskFreeRate) / annVol) : 0;

    stats.push({
      ticker: tickers[i],
      annReturn,
      annVol,
      sharpe
    });
  }

  // Matriz de correlación y Anualización de Covarianza
  for (let i = 0; i < T; i++) {
    for (let j = 0; j < T; j++) {
      const cov = covarianceMatrix[i][j];
      const volI = Math.sqrt(variances[i]);
      const volJ = Math.sqrt(variances[j]);
      
      let corr = 0;
      if (volI > 0 && volJ > 0) {
        corr = cov / (volI * volJ);
      }
      correlationMatrix[i][j] = corr;

      // Anualizar matriz de covarianza (\Sigma_{diaria} * 252)
      covarianceMatrix[i][j] = cov * 252;
    }
  }

  return {
    dates,
    tickers,
    dailyReturns,
    cumulativeReturns,
    stats,
    covarianceMatrix,
    correlationMatrix
  };
};
