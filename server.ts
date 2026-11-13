import express, { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './server/db.ts';
import { apiRouter } from './server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInitialized = false;

export async function createApp(options: { serverless?: boolean } = {}) {
  const app = express();
  app.set('trust proxy', 1);

  // Initialize SQLite schema and preserve/seed data once per process
  if (!dbInitialized) {
    initDatabase();
    dbInitialized = true;
  }

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(cookieParser());
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'KANTRO AI', time: new Date().toISOString() });
  });

  // Mount API endpoints
  app.use('/api', apiRouter);

  // Ensure unknown /api/* routes return JSON instead of falling through to SPA HTML
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // Ensure Express middleware/body-parser/route errors return JSON instead of HTML
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    const status = err?.status || err?.statusCode || 500;
    console.error(`Server error on ${req.method} ${req.originalUrl}:`, err);
    if (req.originalUrl.startsWith('/api')) {
      return res.status(status).json({
        error: err?.message || 'Internal server error'
      });
    }
    return res.status(status).send(err?.message || 'Internal server error');
  });

  if (!options.serverless) {
    const distDir = path.resolve(__dirname, 'dist');
    const isProduction =
      process.env.NODE_ENV === 'production' ||
      (process.env.NODE_ENV !== 'development' && fs.existsSync(path.join(distDir, 'index.html')));

    if (!isProduction) {
      // Vite middleware for development
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: 'spa',
      });
      app.use(vite.middlewares);

      // Fallback to transform index.html for all SPA routes in development
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        try {
          let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    } else {
      // Serve static files in production
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  return app;
}

async function startServer() {
  const app = await createApp({ serverless: false });

  // Resolve port:
  // 1. Explicit --port CLI flag
  // 2. AI Studio dev container with Nginx reverse proxy (NGINX_PORT -> DEFAULT_APP_PORT=3000)
  // 3. Cloud Run / production standalone (PORT injected by platform, e.g. 8080)
  // 4. Fallback to 3000
  let PORT = 3000;
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    PORT = parseInt(process.argv[portArgIndex + 1], 10);
  } else if (process.env.NGINX_PORT && process.env.DEFAULT_APP_PORT) {
    PORT = parseInt(process.env.DEFAULT_APP_PORT, 10);
  } else if (process.env.PORT) {
    PORT = parseInt(process.env.PORT, 10);
  } else if (process.env.DEFAULT_APP_PORT) {
    PORT = parseInt(process.env.DEFAULT_APP_PORT, 10);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KANTRO AI server running at http://0.0.0.0:${PORT}`);
  });
}

const isDirectRun = (() => {
  if (process.env.VERCEL) return false;
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(__filename);
  } catch {
    return path.resolve(process.argv[1]) === __filename;
  }
})();

if (isDirectRun) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
