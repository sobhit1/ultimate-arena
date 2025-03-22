import express from 'express';
import profileController from '../controllers/profileController.js';

const router = express.Router();

router.post('/profile',profileController.updateProfile);

export default router;