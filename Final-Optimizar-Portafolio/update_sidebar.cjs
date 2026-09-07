const fs = require('fs');
let code = fs.readFileSync('src/components/IngestSidebar.tsx', 'utf8');

// 1. Add state for validating ticker
code = code.replace(
  /const \[yahooTicker, setYahooTicker\] = useState\(''\);/,
  "const [yahooTicker, setYahooTicker] = useState('');\n  const [isValidatingTicker, setIsValidatingTicker] = useState(false);"
);

// 2. Replace handleAddYahooTicker
const newHandle = `  const handleAddYahooTicker = async () => {
    const tk = yahooTicker.trim().toUpperCase();
    
    // Validación de sintaxis básica (permite mercados extranjeros como TEF.MC o un par de letras extra)
    const isValid = /^[A-Z]{1,10}(\\.[A-Z]{1,4})?$/.test(tk);
    
    if (!isValid && tk.length > 0) {
      alert("Formato de ticker inválido. Usa símbolos estándar. Ej: AAPL, TEF.MC");
      return;
    }
    
    if (!tk) return;

    if (apiTickers.includes(tk)) {
      setYahooTicker('');
      return;
    }

    setIsValidatingTicker(true);
    try {
      const res = await fetch(\`/api/yahoo/validate?ticker=\${tk}\`);
      const data = await res.json();
      
      if (data.valid) {
        setApiTickers([...apiTickers, data.symbol]);
        setYahooTicker('');
      } else {
        alert(\`El ticker "\${tk}" no es válido o no existe en Yahoo Finance.\`);
      }
    } catch (e) {
      alert(\`Error validando el ticker "\${tk}".\`);
    } finally {
      setIsValidatingTicker(false);
    }
  };`;

code = code.replace(
  /  const handleAddYahooTicker = \(\) => \{[\s\S]*?setYahooTicker\(''\);\n  \};/,
  newHandle
);

// 3. Update the Add button and Input to handle isValidatingTicker
code = code.replace(
  /<button \n             onClick=\{handleAddYahooTicker\}\n            className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-1\.5 rounded transition-colors"\n          >\n            <Plus className="w-5 h-5" \/>\n          <\/button>/,
  `<button 
             onClick={handleAddYahooTicker}
             disabled={isValidatingTicker}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 p-1.5 rounded transition-colors"
          >
            {isValidatingTicker ? <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div> : <Plus className="w-5 h-5" />}
          </button>`
);

code = code.replace(
  /<input \n             type="text" \n             placeholder="Ej: AAPL" \n             value=\{yahooTicker\}\n            onChange=\{\(e\) => setYahooTicker\(e\.target\.value\)\}\n            onKeyDown=\{\(e\) => e\.key === 'Enter' && handleAddYahooTicker\(\)\}\n            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1\.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"\n          \/>/,
  `<input 
             type="text" 
             placeholder="Ej: AAPL" 
             value={yahooTicker}
             disabled={isValidatingTicker}
            onChange={(e) => setYahooTicker(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddYahooTicker()}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
          />`
);


fs.writeFileSync('src/components/IngestSidebar.tsx', code);
