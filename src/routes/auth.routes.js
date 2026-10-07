import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/http-error.js';
import { signAccessToken } from '../lib/jwt.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

const router = Router();
const publicUserSelect = {
  id: true,
  username: true,
  fullName: true,
  role: { select: { name: true } },
  membership: { select: { name: true, score: true } },
};

const registerSchema = z.object({
  body: z.object({
    username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/),
    fullName: z.string().trim().min(2).max(100),
    password: z.string().min(8).max(72),
  }),
  params: z.unknown().optional(),
  query: z.unknown().optional(),
});

const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1).max(50),
    password: z.string().min(1).max(72),
  }),
  params: z.unknown().optional(),
  query: z.unknown().optional(),
});

router.post('/register', validate(registerSchema), async (req, res) => {
  const { username, fullName, password } = req.validated.body;
  const [role, membership] = await Promise.all([
    prisma.role.findUnique({ where: { name: 'CUSTOMER' } }),
    prisma.membership.findUnique({ where: { name: 'BRONZE' } }),
  ]);
  if (!role || !membership) throw new HttpError(503, 'System seed data is unavailable');

  const user = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      fullName,
      passwordHash: await bcrypt.hash(password, 12),
      roleId: role.id,
      membershipId: membership.id,
    },
    select: publicUserSelect,
  });
  return res.status(201).json({ data: user });
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { username, password } = req.validated.body;
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    include: { role: true, membership: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid username or password');
  }

  const { passwordHash: _passwordHash, roleId: _roleId, membershipId: _membershipId, ...safeUser } = user;
  return res.json({
    data: {
      accessToken: signAccessToken(user),
      tokenType: 'Bearer',
      user: safeUser,
    },
  });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: publicUserSelect });
  return res.json({ data: user });
});

export default router;
