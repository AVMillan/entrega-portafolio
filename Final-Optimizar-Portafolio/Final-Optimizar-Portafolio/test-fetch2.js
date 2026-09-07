async function test() {
  const period1 = Math.floor(new Date('2023-01-01').getTime() / 1000);
  const period2 = Math.floor(new Date('2023-01-05').getTime() / 1000);
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&period1=${period1}&period2=${period2}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const data = await res.json();
  const result = data.chart.result[0];
  const formatted = result.timestamp.map((t, i) => ({
    date: new Date(t * 1000).toISOString(),
    open: result.indicators.quote[0].open[i],
    high: result.indicators.quote[0].high[i],
    low: result.indicators.quote[0].low[i],
    close: result.indicators.quote[0].close[i],
    adjClose: result.indicators.adjclose[0].adjclose[i],
    volume: result.indicators.quote[0].volume[i]
  }));
  console.log(JSON.stringify(formatted, null, 2));
}
test();
