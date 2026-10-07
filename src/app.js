import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import shipmentRoutes from './routes/shipment.routes.js';
import healthRoutes from './routes/health.routes.js';
import { errorHandler, notFound } from './middlewares/error-handler.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
}));
app.use(express.json({ limit: '100kb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/shipments', shipmentRoutes);

app.use(notFound);
app.use(errorHandler);
