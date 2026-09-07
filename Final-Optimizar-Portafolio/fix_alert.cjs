const fs = require('fs');
let code = fs.readFileSync('src/components/IngestSidebar.tsx', 'utf8');

// The regex should match the exact block I inserted previously.
code = code.replace(
  /  const handleAddYahooTicker = async \(\) => \{[\s\S]*?setIsValidatingTicker\(false\);\n    \}\n  \};/,
  `  const handleAddYahooTicker = async () => {
    const tk = yahooTicker.trim().toUpperCase();
    
    // Validación de sintaxis básica (permite mercados extranjeros como TEF.MC o un par de letras extra)
    const isValid = /^[A-Z]{1,10}(\\.[A-Z]{1,4})?$/.test(tk);
    
    if (!isValid && tk.length > 0) {
      setError("Formato de ticker inválido. Usa símbolos estándar. Ej: AAPL, TEF.MC");
      return;
    }
    
    if (!tk) return;

    if (apiTickers.includes(tk)) {
      setYahooTicker('');
      return;
    }

    setIsValidatingTicker(true);
    setError(null);
    try {
      const res = await fetch(\`/api/yahoo/validate?ticker=\${tk}\`);
      const data = await res.json();
      
      if (data.valid) {
        setApiTickers([...apiTickers, data.symbol]);
        setYahooTicker('');
      } else {
        setError(\`El ticker "\${tk}" no existe o no tiene datos en Yahoo Finance.\`);
      }
    } catch (e) {
      setError(\`Error validando el ticker "\${tk}". Verifica tu conexión.\`);
    } finally {
      setIsValidatingTicker(false);
    }
  };`
);

fs.writeFileSync('src/components/IngestSidebar.tsx', code);
