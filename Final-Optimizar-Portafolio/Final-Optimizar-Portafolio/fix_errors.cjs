const fs = require('fs');
let code = fs.readFileSync('src/components/IngestSidebar.tsx', 'utf8');

// Remove the global error block that is causing typescript error
code = code.replace(
  /      \{error && \([\s\S]*?      \}\)\n/g,
  ''
);

// To place apiError directly below the ticker input inside the "API Yahoo Finance" container,
// let's look for the input block.
code = code.replace(
  /        \{apiError && \([\s\S]*?        \}\)\n        <button \n           onClick=\{downloadApiData\}/,
  '        <button \n           onClick={downloadApiData}' // remove from above download button
);

const newApiErrorBlock = `
        {apiError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-2.5 flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs leading-relaxed">{apiError}</p>
          </div>
        )}
`;

// Insert it right after the flex container holding the input and plus button
code = code.replace(
  /          <\/button>\n        <\/div>\n/,
  `          </button>\n        </div>\n${newApiErrorBlock}`
);

// For the file error, it is already rendered in the correct place, let's just make it visually consistent:
code = code.replace(
  /        \{fileError && \([\s\S]*?        \}\)\n      <\/div>/,
  `        {fileError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-2.5 flex items-start gap-2 mt-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs leading-relaxed">{fileError}</p>
          </div>
        )}
      </div>`
);

fs.writeFileSync('src/components/IngestSidebar.tsx', code);
