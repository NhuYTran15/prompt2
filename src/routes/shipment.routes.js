import { Router } from 'express';
import { z } from 'zod';
import { ShipmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = Router();
const updateSchema = z.object({
  body: z.object({ status: z.nativeEnum(ShipmentStatus) }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.unknown().optional(),
});

router.patch('/:id', authenticate, authorize('ADMIN'), validate(updateSchema), async (req, res) => {
  const shipment = await prisma.shipment.update({
    where: { id: req.validated.params.id },
    data: { status: req.validated.body.status },
  });
  return res.json({ data: shipment });
});

export default router;
