import express from 'express';
import 'dotenv/config';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import contestRoutes from './routes/contestRoutes.js';
import checkForAuthCookie from './middlewares/authMiddleware.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use(checkForAuthCookie);

app.use('/api/info', profileRoutes);
app.use('/api/contest', contestRoutes);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});