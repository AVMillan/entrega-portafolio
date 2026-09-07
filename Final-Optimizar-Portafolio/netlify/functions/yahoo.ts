import { Handler } from '@netlify/functions';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['ripHistorical'] });

export const handler: Handler = async (event) => {
  try {
    const { ticker, period1, period2 } = event.queryStringParameters || {};

    if (!ticker) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Ticker is required' }),
      };
    }

    const queryOptions: any = {
      period1: period1 ? String(period1) : '2020-01-01',
      interval: '1d',
    };

    if (period2) {
      queryOptions.period2 = String(period2);
    }

    const result = await yahooFinance.historical(ticker, queryOptions);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('Yahoo Finance Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Error fetching data from Yahoo Finance' }),
    };
  }
};
