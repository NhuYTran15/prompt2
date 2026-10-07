import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign(
    { role: user.role.name },
    env.JWT_SECRET,
    { subject: String(user.id), expiresIn: env.JWT_EXPIRES_IN, algorithm: 'HS256' },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
}
