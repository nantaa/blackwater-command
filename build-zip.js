// build-zip.js - Packages blackwater-command-itch.zip with index.html at root
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const stageDir = path.join(__dirname, 'temp_stage_zip');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir);

// Copy blackwater-command.html to index.html at root
fs.copyFileSync(
  path.join(__dirname, 'blackwater-command.html'),
  path.join(stageDir, 'index.html')
);

// Delete existing zip
const zipPath = path.join(__dirname, 'blackwater-command-itch.zip');
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Compress using PowerShell with simple execution
const psScript = `Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force`;
cp.execSync(`powershell -NoProfile -Command "${psScript}"`, { stdio: 'inherit' });

// Cleanup staging
fs.rmSync(stageDir, { recursive: true, force: true });

const stat = fs.statSync(zipPath);
console.log(`Successfully built blackwater-command-itch.zip (${stat.size} bytes)`);

// Verify zip root contains index.html
const listScript = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('${zipPath}').Entries | Select-Object -ExpandProperty FullName`;
const entries = cp.execSync(`powershell -NoProfile -Command "${listScript}"`, { encoding: 'utf8' }).trim().split(/\r?\n/);
console.log('Zip contents:', entries);
if (!entries.includes('index.html')) {
  console.error('ERROR: index.html is NOT at the root of the zip archive!');
  process.exit(1);
}
console.log('Verification passed: index.html is at root of archive.');
