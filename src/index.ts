import express, { type Express, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import caseRoutes from './routes/case.routes.js';
import { caseImageRouter, standaloneImageRouter } from './routes/image.routes.js';
import reviewRoutes from './routes/review.routes.js';
import commentRoutes from './routes/comment.routes.js';
import validationRoutes from './routes/validation.routes.js';
import consensusRoutes from './routes/consensus.routes.js';
import reportRoutes from './routes/report.routes.js';
import cors from 'cors';
import { swaggerSpec } from './config/swagger.js';
import { generalLimiter, authLimiter } from './middlewares/rate-limit.middleware.js';
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5001;
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || [],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(morgan('dev'));
app.use(express.json());
app.use(cors(corsOptions));
app.use(generalLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/cases/:id', caseImageRouter); 
app.use('/api/images', standaloneImageRouter);
app.use('/api/review', reviewRoutes);
app.use('/api/images', commentRoutes);
app.use('/api/images', validationRoutes);
app.use('/api/cases', consensusRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (_req: Request, res: Response) => {
  res.send('Express + TypeScript Server is running!');
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
