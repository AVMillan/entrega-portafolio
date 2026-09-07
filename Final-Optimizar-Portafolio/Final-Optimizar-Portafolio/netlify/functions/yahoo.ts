import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  try {
    const { ticker, period1, period2 } = event.queryStringParameters || {};
    
    if (!ticker) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Ticker is required' }),
      };
    }

    const p1 = period1 ? Math.floor(new Date(period1).getTime() / 1000) : Math.floor(new Date('2020-01-01').getTime() / 1000);
    let p2 = Math.floor(Date.now() / 1000);
    if (period2) {
        p2 = Math.floor(new Date(period2).getTime() / 1000);
        // Yahoo Finance expects period2 to be exclusive or up to current, so add 1 day to be safe if period2 is date only
        p2 += 86400; 
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${p1}&period2=${p2}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `Error fetching data from Yahoo Finance: ${response.statusText}` }),
      };
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result || !result.timestamp) {
       return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No data found for ticker' }),
      };
    }

    const formatted = result.timestamp.map((t: number, i: number) => ({
      date: new Date(t * 1000).toISOString(),
      open: result.indicators.quote[0].open[i],
      high: result.indicators.quote[0].high[i],
      low: result.indicators.quote[0].low[i],
      close: result.indicators.quote[0].close[i],
      adjClose: result.indicators.adjclose?.[0]?.adjclose?.[i] ?? result.indicators.quote[0].close[i],
      volume: result.indicators.quote[0].volume[i]
    })).filter((item: any) => item.close !== null && item.adjClose !== null);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(formatted),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Error fetching data' }),
    };
  }
};
