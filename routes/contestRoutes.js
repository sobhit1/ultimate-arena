import express from 'express';
import contestController from '../controllers/contestController.js';

const router = express.Router();

router.post('/add-contest',contestController.createContest);

router.post('/add-participant/:contestID',contestController.addParticipant);

router.post('/add-problem/:contestID',contestController.addProblem);

router.post('/check-problem/:contestID/:problemID',contestController.checkIfSolved);

export default router;