import { createApp } from './app';
import { config } from './config';
import { ensureSuperAdmin } from './lib/superadmin';

async function start() {
  try {
    await ensureSuperAdmin();
  } catch (err) {
    console.warn('[superadmin] could not seed super admin (DB not ready?):', (err as Error).message);
  }

  const app = createApp();

  app.listen(config.port, () => {
    console.log(`[umbrella-api] listening on :${config.port} (${config.nodeEnv})`);
  });
}

start();

process.on('unhandledRejection', (err) => {
  console.error('[umbrella-api] unhandled rejection:', err);
});
