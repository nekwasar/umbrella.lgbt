import { ensureSuperAdmin } from '../lib/superadmin';

ensureSuperAdmin()
  .then(() => {
    console.log('Super admin ensured.');
  })
  .catch((err) => {
    console.error('Failed to seed super admin:', err);
    process.exit(1);
  });
