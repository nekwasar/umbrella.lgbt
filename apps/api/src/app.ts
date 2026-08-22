import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { prisma } from './db/prisma';
import adminAuthRouter from './routes/auth/admin';
import userAuthRouter from './routes/auth/user';
import adminPagesRouter from './routes/admin/pages';
import publicPagesRouter from './routes/public/pages';
import adminsRouter from './routes/admin/admins';
import usersRouter from './routes/admin/users';
import statsRouter from './routes/admin/stats';
import qaReadRouter from './routes/qa/read';
import qaWriteRouter from './routes/qa/write';
import qaAnswersRouter from './routes/qa/answers';
import qaCommentsRouter from './routes/qa/comments';
import adminQaRouter from './routes/admin/qa';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Caddy terminates TLS and proxies; trust its forwarded headers so rate
  // limiters key off the real client IP.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Global per-IP safety net (health is exempt for orchestration probes).
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, try again later' },
      skip: (req) => req.path === '/health'
    })
  );

  app.get('/', (_req, res) => {
    res.json({
      name: 'umbrella-api',
      version: '0.1.0',
      env: config.nodeEnv
    });
  });

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ok',
        db: 'up',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(503).json({
        status: 'degraded',
        db: 'down',
        timestamp: new Date().toISOString()
      });
    }
  });

  // --- v1 routes ---
  const api = express.Router();
  api.use('/auth/admin', adminAuthRouter);
  api.use('/auth', userAuthRouter);
  api.use('/admin/pages', adminPagesRouter);
  api.use('/admin/admins', adminsRouter);
  api.use('/admin/users', usersRouter);
  api.use('/admin/stats', statsRouter);
  api.use('/admin/qa', adminQaRouter);
  api.use('/qa', qaReadRouter);
  api.use('/qa', qaWriteRouter);
  api.use('/answers', qaAnswersRouter);
  api.use('/comments', qaCommentsRouter);
  api.use('/pages', publicPagesRouter);
  app.use('/api', api);

  // 404 for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[umbrella-api] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
