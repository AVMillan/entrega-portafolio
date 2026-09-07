const fs = require('fs');
let serverCode = fs.readFileSync('server.ts', 'utf8');

const validateRoute = `
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
`;

serverCode = serverCode.replace(
  /\/\/ API route for Yahoo Finance/,
  '// API route for Yahoo Finance\n' + validateRoute
);

fs.writeFileSync('server.ts', serverCode);
