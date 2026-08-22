import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

const nodeEnv = optional('NODE_ENV', 'development');
const isProd = nodeEnv === 'production';

export const config = {
  nodeEnv,
  isProd,
  port: parseInt(optional('PORT', '3000'), 10),
  databaseUrl: isProd ? required('DATABASE_URL') : optional('DATABASE_URL', 'postgresql://umbrella:umbrella@localhost:5432/umbrella'),
  jwtSecret: isProd ? required('JWT_SECRET') : optional('JWT_SECRET', 'dev-secret-do-not-use-in-prod'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),
  corsOrigin: optional('CORS_ORIGIN', 'https://umbrella.lgbt'),
  superAdmin: {
    username: optional('SUPERADMIN_USERNAME', 'admin'),
    password: required('SUPERADMIN_PASSWORD')
  }
};

if (!isProd && config.jwtSecret === 'dev-secret-do-not-use-in-prod') {
  console.warn('[config] WARNING: using development JWT secret. Set JWT_SECRET in production.');
}
