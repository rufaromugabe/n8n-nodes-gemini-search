const { exec } = require('child_process');
const path = require('path');

// Path to the project root
const projectRoot = path.resolve(__dirname, '..');

// Run prettier with --write to fix all files
const command = 'npx prettier --write "**/*.{ts,js,json,md}"';

console.log(`Running: ${command}`);
exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`Prettier formatting complete: \n${stdout}`);
});
