import express, { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './server/db.ts';
import { apiRouter } from './server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp(options?: { serverless?: boolean }) {
  const app = express();

  // Initialize SQLite schema and seed data
  initDatabase();

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(cookieParser());

  // Preserve pre-parsed body in serverless environments (e.g. Vercel)
  app.use((req, _res, next) => {
    if (req.body !== undefined && !(req as any)._body) {
      (req as any)._body = true;
    }
    next();
  });
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'KANTRO AI', time: new Date().toISOString() });
  });

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Ensure unmatched /api/* routes always return JSON 404 rather than HTML
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // Ensure API errors return JSON
  app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('API error:', err);
    if (!res.headersSent) {
      res.status(err?.status || 500).json({ error: err?.message || 'Internal server error.' });
    }
  });

  if (!options?.serverless) {
    const isProduction =
      process.env.NODE_ENV === 'production' ||
      (process.env.NODE_ENV !== 'development' && fs.existsSync(path.resolve(__dirname, 'dist', 'index.html')));

    if (!isProduction) {
      // Vite middleware for development
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      // Serve static files in production
      app.use(express.static(path.resolve(__dirname, 'dist')));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
      });
    }
  }

  return app;
}

async function startServer() {
  const app = await createApp({ serverless: false });
  const isDevSandbox =
    process.env.NODE_ENV === 'development' ||
    (Boolean(process.env.NGINX_PORT) && process.env.PORT === process.env.NGINX_PORT);
  const PORT = isDevSandbox
    ? Number(process.env.DEFAULT_APP_PORT) || 3000
    : Number(process.env.PORT) || 3000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KANTRO AI server running at http://0.0.0.0:${PORT}`);
  });
}

const isDirectRun =
  !process.env.VERCEL &&
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
