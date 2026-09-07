import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import YahooFinance from 'yahoo-finance2';
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });
  
  app.use(cors());
  app.use(express.json());

  // API route for Yahoo Finance

  app.get("/api/yahoo/validate", async (req, res) => {
    try {
      const { ticker } = req.query;
      if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ error: 'Ticker is required' });
      }
      
      const result = await yahooFinance.quote(ticker);
      if (result && result.symbol) {
        res.json({ valid: true, symbol: result.symbol, name: result.shortName || result.longName });
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
      
      const queryOptions: any = {
        period1: period1 ? String(period1) : '2020-01-01',
        interval: '1d',
      };
      
      if (period2) {
        queryOptions.period2 = String(period2);
      }
      
      // Fetch historical data
      const result = await yahooFinance.historical(ticker, queryOptions);
      res.json(result);
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
