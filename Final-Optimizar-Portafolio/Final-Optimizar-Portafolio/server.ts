import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(cors());
  app.use(express.json());

  // API route for Yahoo Finance
  app.get("/api/yahoo/validate", async (req, res) => {
    try {
      const { ticker } = req.query;
      if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: 'Ticker is required' });
      }
      
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!response.ok) return res.json({ valid: false });
      
      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && meta.symbol) {
        res.json({ valid: true, symbol: meta.symbol, name: meta.symbol });
      } else {
        res.json({ valid: false });
      }
    } catch (error: any) {
      res.json({ valid: false });
    }
  });

  app.get("/api/yahoo", async (req, res) => {
    try {
      const { ticker, period1, period2 } = req.query;
      
      if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: 'Ticker is required' });
      }
      
      const p1 = period1 ? Math.floor(new Date(String(period1)).getTime() / 1000) : Math.floor(new Date('2020-01-01').getTime() / 1000);
      let p2 = Math.floor(Date.now() / 1000);
      if (period2) {
          p2 = Math.floor(new Date(String(period2)).getTime() / 1000) + 86400;
      }

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${p1}&period2=${p2}`;
      
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) throw new Error('Failed to fetch from Yahoo');
      
      const data = await response.json();
      const result = data?.chart?.result?.[0];
      if (!result || !result.timestamp) throw new Error('No data');

      const formatted = result.timestamp.map((t: number, i: number) => ({
        date: new Date(t * 1000).toISOString(),
        open: result.indicators.quote[0].open[i],
        high: result.indicators.quote[0].high[i],
        low: result.indicators.quote[0].low[i],
        close: result.indicators.quote[0].close[i],
        adjClose: result.indicators.adjclose?.[0]?.adjclose?.[i] ?? result.indicators.quote[0].close[i],
        volume: result.indicators.quote[0].volume[i]
      })).filter((item: any) => item.close !== null && item.adjClose !== null);

      res.json(formatted);
    } catch (error: any) {
      console.error('Yahoo Finance Error:', error);
      res.status(500).json({ error: error.message || 'Error fetching data from Yahoo Finance' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
