import { spawn } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';

// Load .env
dotenv.config();
if (fs.existsSync('.env.local')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

console.log('🚀 Starting Local Dev Servers (Frontend + API Proxy)...');

// Start Vite on port 8081
const vite = spawn('npm', ['run', 'dev:frontend'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_PORT: '8081', VITE_API_URL: 'http://localhost:3000' },
});

// Start our custom local API & Proxy server on port 3000
const apiServer = spawn('node', ['scripts/dev-server.ts'], {
  stdio: 'inherit',
});

// Setup shutdown hooks
const cleanup = () => {
  console.log('\n🛑 Shutting down dev servers...');
  try {
    vite.kill('SIGINT');
  } catch {}
  try {
    apiServer.kill('SIGINT');
  } catch {}
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
