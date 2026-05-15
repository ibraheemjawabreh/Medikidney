const fs = require('fs');
const path = require('path');

const directoriesToScan = [
  'components',
  'constants',
  'context',
  'hooks',
  'screens',
  'services',
  'translations',
  'utils',
  'login',
  'AppNavigation'
];

const filesToScan = [
  'App.js',
  'index.js'
];

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (!extensions.includes(ext)) return;

  try {
    let code = fs.readFileSync(filePath, 'utf8');
    
    // First, remove JSX comments like {/* comment */}
    code = code.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

    // Next, remove multiline comments /* ... */
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');

    // Finally, remove single line comments //
    // Negative lookbehind (?<!:) ensures we don't match http:// or https://
    code = code.replace(/(?<!:)\/\/.*$/gm, '');
    
    // Clean up multiple blank lines left by comment removal
    const cleanedCode = code.replace(/\n\s*\n\s*\n/g, '\n\n');

    if (code !== cleanedCode) {
      fs.writeFileSync(filePath, cleanedCode, 'utf8');
      console.log(`Cleaned: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

console.log('Starting comment removal...');
for (const dir of directoriesToScan) {
  processDirectory(path.join(__dirname, dir));
}

for (const file of filesToScan) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    processFile(fullPath);
  }
}

console.log('Finished removing comments.');
