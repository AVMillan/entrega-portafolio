import yf from 'yahoo-finance2';
console.log(typeof yf);
try {
  const yfInstance = new yf({ suppressNotices: ['ripHistorical'] });
  console.log("Success with new");
} catch(e) {
  console.log("Failed with new:", e.message);
}
