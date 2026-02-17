import express, { type Express } from 'express';
import 'dotenv/config';
import { prisma } from './lib/PrismaClient';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import AuthRoute from './Router/AuthRoute';
import UserRoute from './Router/UserRoute';
import ProductRoute from './Router/ProductRoute';

const app: Express = express();

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use(cookieParser(process.env.COOKIE_SECRET)); // Use COOKIE_SECRET to sign cookies


// API Routes
app.use('/api/v1/auth/', AuthRoute);
app.use('/api/v1/user/', UserRoute);
app.use('/api/v1/product/', ProductRoute);

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

// Health check endpoint for db connection
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('Health check failed:', err);
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
})


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

