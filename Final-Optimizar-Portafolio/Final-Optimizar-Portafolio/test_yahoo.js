import YahooFinance from 'yahoo-finance2';
async function test() {
  const yahooFinance = new YahooFinance();
  const result = await yahooFinance.historical('AAPL', { period1: '2021-01-01', period2: '2021-01-10' });
  console.log(result.slice(0, 2));
}
test();
