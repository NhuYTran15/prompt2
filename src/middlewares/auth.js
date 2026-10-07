import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { HttpError } from '../lib/http-error.js';

export async function authenticate(req, _res, next) {
  try {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new HttpError(401, 'Authorization header must use Bearer token');
    }

    const payload = verifyAccessToken(token);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) throw new HttpError(401, 'Invalid token subject');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, membership: true },
    });
    if (!user) throw new HttpError(401, 'User no longer exists');

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    return next(new HttpError(401, 'Invalid or expired access token'));
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role.name)) {
      return next(new HttpError(403, 'You do not have permission to perform this action'));
    }
    return next();
  };
}
