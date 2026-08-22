// Server-only helpers. Do NOT add 'use client' here.
export const SERVER_API_URL =
  process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
