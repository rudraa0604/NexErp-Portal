import express from 'express';
import {
  getEmployees,
  getEmployeeProfile,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  uploadDocument
} from '../controllers/employeeController.js';
import { verifyToken, isAdmin, isEmployeeOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, isAdmin, getEmployees);
router.get('/:id', verifyToken, isEmployeeOrAdmin, getEmployeeProfile);
router.post('/', verifyToken, isAdmin, createEmployee);
router.put('/:id', verifyToken, isAdmin, updateEmployee);
router.patch('/:id/toggle-status', verifyToken, isAdmin, toggleEmployeeStatus);
router.post('/:id/documents', verifyToken, isAdmin, uploadDocument);

export default router;
