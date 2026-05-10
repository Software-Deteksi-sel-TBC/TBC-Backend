import express, { type Express, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import caseRoutes from './routes/case.routes.js';
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

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server is running!');
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});