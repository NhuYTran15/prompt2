import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http-error.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParams, paginationQuery } from '../schemas/common.js';

const router = Router();
const orderInclude = {
  user: { select: { id: true, username: true, fullName: true } },
  details: { include: { product: { select: { id: true, name: true } } } },
  shipments: { orderBy: { id: 'asc' } },
};

const createOrderSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      productId: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().positive(),
    })).min(1).max(50).refine(
      (items) => new Set(items.map((item) => item.productId)).size === items.length,
      'Each product may appear only once',
    ),
  }),
  params: z.unknown().optional(),
  query: z.unknown().optional(),
});

const listSchema = z.object({
  body: z.unknown().optional(),
  params: z.unknown().optional(),
  query: paginationQuery,
});

function presentOrder(order) {
  const total = order.details.reduce(
    (sum, detail) => sum.plus(detail.unitPrice.mul(detail.quantity)),
    new Prisma.Decimal(0),
  );
  return { ...order, total: total.toFixed(2) };
}

async function createOrderWithRetry(userId, items) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({ data: { userId } });

        for (const item of items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new HttpError(404, `Product ${item.productId} not found`);

          const update = await tx.product.updateMany({
            where: { id: item.productId, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          });
          if (update.count === 0) {
            throw new HttpError(409, `Insufficient stock for product ${product.name}`);
          }

          await tx.orderDetail.create({
            data: {
              orderId: order.id,
              productId: product.id,
              quantity: item.quantity,
              unitPrice: product.price,
            },
          });
        }

        return tx.order.findUnique({ where: { id: order.id }, include: orderInclude });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error?.code === 'P2034' && attempt < 3) continue;
      throw error;
    }
  }
  throw new HttpError(409, 'Could not create order due to concurrent updates');
}

router.use(authenticate);

router.post('/', validate(createOrderSchema), async (req, res) => {
  const order = await createOrderWithRetry(req.user.id, req.validated.body.items);
  return res.status(201).json({ data: presentOrder(order) });
});

router.get('/', validate(listSchema), async (req, res) => {
  const { page, limit } = req.validated.query;
  const where = req.user.role.name === 'ADMIN' ? {} : { userId: req.user.id };
  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: orderInclude,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({ where }),
  ]);
  return res.json({
    data: orders.map(presentOrder),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

router.get('/:id', validate(idParams), async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.validated.params.id },
    include: orderInclude,
  });
  if (!order) throw new HttpError(404, 'Order not found');
  if (req.user.role.name !== 'ADMIN' && order.userId !== req.user.id) {
    throw new HttpError(403, 'You cannot access this order');
  }
  return res.json({ data: presentOrder(order) });
});

router.post('/:id/shipments', authorize('ADMIN'), validate(idParams), async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.validated.params.id } });
  if (!order) throw new HttpError(404, 'Order not found');
  const shipment = await prisma.shipment.create({ data: { orderId: order.id } });
  return res.status(201).json({ data: shipment });
});

export default router;
