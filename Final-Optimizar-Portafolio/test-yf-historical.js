import yf from 'yahoo-finance2';
const yf2 = new yf();
async function run() {
  const data = await yf2.historical('AAPL', { period1: '2023-01-01', period2: '2023-01-05' });
  console.log(JSON.stringify(data.slice(0, 2), null, 2));
}
run();
