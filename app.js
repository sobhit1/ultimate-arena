import express from 'express';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import contestRoutes from './routes/contestRoutes.js';
import checkForAuthCookie from './middlewares/authMiddleware.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

app.use('/api/info', checkForAuthCookie, profileRoutes);
app.use('/api/contest', checkForAuthCookie, contestRoutes);

app.use(errorHandler.RouteNotFoundHandler);
app.use(errorHandler.globalErrorHandler);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});