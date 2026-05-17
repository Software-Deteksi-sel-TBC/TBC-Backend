import express, { type Express, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import caseRoutes from './routes/case.routes.js';
import { caseImageRouter, standaloneImageRouter } from './routes/image.routes.js';
import reviewRoutes from './routes/review.routes.js';
import commentRoutes from './routes/comment.routes.js';
import validationRoutes from './routes/validation.routes.js';
import consensusRoutes from './routes/consensus.routes.js';
import cors from 'cors';
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5001;
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || [],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/cases', caseImageRouter);
app.use('/api/images', standaloneImageRouter);
app.use('/api/review', reviewRoutes);
app.use('/api/images', commentRoutes);
app.use('/api/images', validationRoutes);
app.use('/api/cases', consensusRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server is running!');
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});