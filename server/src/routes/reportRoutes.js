import express from 'express';
import {
  getMonthlyPayrollSummary,
  getStatutoryReport,
  getAdvanceReport,
  exportPayrollExcel
} from '../controllers/reportController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/payroll-summary', verifyToken, isAdmin, getMonthlyPayrollSummary);
router.get('/statutory', verifyToken, isAdmin, getStatutoryReport);
router.get('/advances', verifyToken, isAdmin, getAdvanceReport);
router.get('/export/payroll/:runId', verifyToken, isAdmin, exportPayrollExcel);

export default router;
