async function test() {
  const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1mo', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const data = await res.json();
  console.log(data.chart.result[0].meta.symbol);
}
test();
