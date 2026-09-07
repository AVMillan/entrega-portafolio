export type PriceRow = { date: string; [ticker: string]: string | number };

export type ReturnsMatrix = { dates: string[]; tickers: string[]; data: number[][] };

export type AssetStats = { ticker: string; annReturn: number; annVol: number; sharpe: number };

export type Portfolio = {
  weights: number[];
  ret: number;
  vol: number;
  sharpe: number;
};
