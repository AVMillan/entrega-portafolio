import { Handler } from '@netlify/functions';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });

export const handler: Handler = async (event) => {
  try {
    const ticker = event.queryStringParameters?.ticker;
    if (!ticker) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Ticker is required' }),
      };
    }

    const result = await yahooFinance.quote(ticker);
    if (result && result.symbol) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valid: true, symbol: result.symbol, name: result.shortName || result.longName }),
      };
    } else {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valid: false }),
      };
    }
  } catch (error: any) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valid: false }),
    };
  }
};
