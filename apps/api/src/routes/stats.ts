import { Router } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

/**
 * Public live counts for the homepage "Community Stats" sidebar. Real data
 * only — never hardcoded placeholders (a 404 must degrade to "—", not a lie).
 * Cached 5 min at the web layer (`apiFetch(..., 300, ['stats'])`) plus a short
 * shared-cache header here.
 */
router.get('/', async (_req, res) => {
  const [glossaryTerms, cityGuides, countryResources, qaAnswers] = await Promise.all([
    prisma.page.count({ where: { type: 'GLOSSARY', status: 'PUBLISHED' } }),
    prisma.page.count({ where: { type: 'CITY', status: 'PUBLISHED' } }),
    prisma.page.count({ where: { type: 'RESOURCES', status: 'PUBLISHED' } }),
    prisma.answer.count({ where: { status: 'PUBLISHED' } })
  ]);

  res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.json({ glossaryTerms, cityGuides, countryResources, qaAnswers });
});

export default router;