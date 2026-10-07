import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http-error.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParams, paginationQuery } from '../schemas/common.js';

const router = Router();
const productBody = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.coerce.number().positive().max(99999999.99),
  quantity: z.coerce.number().int().nonnegative(),
});
const listSchema = z.object({
  body: z.unknown().optional(),
  params: z.unknown().optional(),
  query: paginationQuery.extend({ search: z.string().trim().max(100).optional() }),
});
const createSchema = z.object({ body: productBody, params: z.unknown().optional(), query: z.unknown().optional() });
const updateSchema = z.object({ body: productBody.partial().refine((v) => Object.keys(v).length > 0), params: z.object({ id: z.coerce.number().int().positive() }), query: z.unknown().optional() });

router.get('/', validate(listSchema), async (req, res) => {
  const { page, limit, search } = req.validated.query;
  const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};
  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' } }),
    prisma.product.count({ where }),
  ]);
  return res.json({ data: products, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

router.get('/:id', validate(idParams), async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.validated.params.id } });
  if (!product) throw new HttpError(404, 'Product not found');
  return res.json({ data: product });
});

router.post('/', authenticate, authorize('ADMIN'), validate(createSchema), async (req, res) => {
  const product = await prisma.product.create({ data: req.validated.body });
  return res.status(201).json({ data: product });
});

router.patch('/:id', authenticate, authorize('ADMIN'), validate(updateSchema), async (req, res) => {
  const product = await prisma.product.update({
    where: { id: req.validated.params.id },
    data: req.validated.body,
  });
  return res.json({ data: product });
});

router.delete('/:id', authenticate, authorize('ADMIN'), validate(idParams), async (req, res) => {
  await prisma.product.delete({ where: { id: req.validated.params.id } });
  return res.status(204).send();
});

export default router;
