import http from 'http';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();
if (fs.existsSync('.env.local')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const PORT = 3000;
const VITE_PORT = 8081;

console.log('📡 Initializing API Dev Server...');

// Import Vercel Edge handlers dynamically
const getHandlers = async () => {
  const users = (await import('../api/users/index.ts')).default;
  const circlePair = (await import('../api/circle-pair/index.ts')).default;
  const circlePhone = (await import('../api/circle-phone/index.ts')).default;
  const invoices = (await import('../api/invoices/index.js')).default;
  return { users, circlePair, circlePhone, invoices };
};

let handlers: any = null;

// Translation helper: Express-like req/res to Web Fetch Request/Response
async function handleEdgeRoute(handlerFn: any, req: http.IncomingMessage, res: http.ServerResponse) {
  let body: any = null;
  if (req.method === 'POST' || req.method === 'PUT') {
    const buffers: any[] = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    body = Buffer.concat(buffers);
  }

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || `localhost:${PORT}`;
  const url = `${protocol}://${host}${req.url}`;
  
  const init: RequestInit = {
    method: req.method,
    headers: req.headers as any,
    body: body,
  };
  
  const fetchReq = new Request(url, init);

  try {
    const fetchRes = await handlerFn(fetchReq);
    
    res.statusCode = fetchRes.status;
    fetchRes.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    const resBody = await fetchRes.text();
    res.end(resBody);
  } catch (error) {
    console.error('Edge Handler Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error', details: String(error) }));
  }
}

// Translation helper: Express-like req/res to Vercel Node handler
async function handleNodeRoute(handlerFn: any, req: any, res: any) {
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  
  res.json = (data: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };

  let body: any = null;
  if (req.method === 'POST' || req.method === 'PUT') {
    const buffers: any[] = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers).toString();
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = rawBody;
    }
  }
  
  req.body = body;

  try {
    await handlerFn(req, res);
  } catch (error) {
    console.error('Node Handler Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error', details: String(error) }));
  }
}

// Proxy to Vite Frontend Server
function proxyToVite(req: http.IncomingMessage, res: http.ServerResponse) {
  const options = {
    hostname: 'localhost',
    port: VITE_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxyReq, { end: true });

  proxyReq.on('error', (err) => {
    console.error('Vite Proxy Error:', err);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>Bad Gateway</h1><p>Vite frontend server is not running on port 8081. Please wait a second and reload.</p>');
  });
}

const server = http.createServer(async (req, res) => {
  // CORS configuration for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Load handlers if not loaded yet
  if (!handlers) {
    try {
      handlers = await getHandlers();
    } catch (err) {
      console.error('Failed to load handlers:', err);
      res.statusCode = 500;
      res.end('Failed to initialize local API handlers');
      return;
    }
  }

  const urlPath = req.url?.split('?')[0] || '';

  // API Routes Routing
  if (urlPath === '/api/users') {
    await handleEdgeRoute(handlers.users, req, res);
  } else if (urlPath === '/api/circle-pair') {
    await handleEdgeRoute(handlers.circlePair, req, res);
  } else if (urlPath === '/api/circle-phone') {
    await handleEdgeRoute(handlers.circlePhone, req, res);
  } else if (urlPath === '/api/invoices') {
    await handleNodeRoute(handlers.invoices, req, res);
  } else {
    // Non-API route -> proxy to Vite dev server
    proxyToVite(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`✅ Custom API Proxy Dev Server is listening on http://localhost:${PORT}`);
  console.log(`📡 Forwarding non-API traffic to Vite on http://localhost:${VITE_PORT}\n`);
});
