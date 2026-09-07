const fs = require('fs');
let code = fs.readFileSync('src/components/IngestSidebar.tsx', 'utf8');

// 1. Split state
code = code.replace(
  /const \[error, setError\] = useState<string \| null>\(null\);/,
  `const [apiError, setApiError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);`
);

// 2. Update handleFileUpload
code = code.replace(
  /const handleFileUpload = async \(e: React.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?    setLoading\(false\);[\s\S]*?\};/,
  (match) => {
    return match.replace(/setError/g, 'setFileError').replace(/setApiError\(null\)/g, ''); 
  }
);

// 3. Update processData
code = code.replace(
  /const processData = \(rawData: PriceRow\[\], tickersToProcess: string\[\]\) => \{[\s\S]*?    \}\n  \};/,
  (match) => {
    return match.replace(/setError/g, 'setFileError');
  }
);

// 4. Update handleAddYahooTicker
code = code.replace(
  /const handleAddYahooTicker = async \(\) => \{[\s\S]*?setIsValidatingTicker\(false\);\n    \}\n  \};/,
  (match) => {
    return match.replace(/setError/g, 'setApiError').replace(/setFileError/g, 'setApiError');
  }
);

// 5. Update downloadApiData
code = code.replace(
  /const downloadApiData = async \(\) => \{[\s\S]*?if \(onLoadingChange\) onLoadingChange\(false\);\n    \}\n  \};/,
  (match) => {
    return match.replace(/setError/g, 'setApiError').replace(/setFileError/g, 'setApiError');
  }
);

// 6. Fix any leftovers (if any global setError remain, but shouldn't)

// 7. Update the JSX rendering
// Remove the global error block
code = code.replace(
  /      \{error && \([\s\S]*?      \}\)\n/,
  ''
);

// 8. Inject apiError into Yahoo Finance API section
const apiErrorBlock = `
        {apiError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 flex items-start gap-3 mt-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs mt-1 leading-relaxed">{apiError}</p>
          </div>
        )}
`;
code = code.replace(
  /        <button \n           onClick=\{downloadApiData\}\n/,
  apiErrorBlock + '\n        <button \n           onClick={downloadApiData}\n'
);

// 9. Inject fileError into Upload File section
const fileErrorBlock = `
        {fileError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 flex items-start gap-3 mt-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs mt-1 leading-relaxed">{fileError}</p>
          </div>
        )}
`;
code = code.replace(
  /          <input type="file" className="hidden" accept="\.csv, application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet, application\/vnd\.ms-excel" onChange=\{handleFileUpload\} \/>\n        <\/label>\n      <\/div>/,
  `          <input type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileUpload} />
        </label>
${fileErrorBlock}
      </div>`
);

fs.writeFileSync('src/components/IngestSidebar.tsx', code);
