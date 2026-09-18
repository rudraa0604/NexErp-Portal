import express from 'express';
import {
  getAdvances,
  createAdvance,
  updateAdvance
} from '../controllers/advanceController.js';
import { verifyToken, isAdmin, isEmployeeOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, isEmployeeOrAdmin, getAdvances);
router.post('/', verifyToken, isAdmin, createAdvance);
router.put('/:id', verifyToken, isAdmin, updateAdvance);

export default router;
