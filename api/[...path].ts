import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server.ts';

let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!appPromise) {
      appPromise = createApp({ serverless: true });
    }
    const app = await appPromise;
    return app(req as any, res as any);
  } catch (err: any) {
    console.error('Vercel API handler error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'Serverless API initialization failed.',
          detail: err?.message || 'Unknown error'
        })
      );
    }
  }
}
