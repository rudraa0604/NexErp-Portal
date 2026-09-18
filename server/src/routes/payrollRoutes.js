import express from 'express';
import {
  getPayrollRuns,
  getPayrollRunDetails,
  generateDraftPayroll,
  adjustPayrollDetail,
  finalizePayrollRun,
  markPayrollAsPaid,
  downloadSalarySlip,
  getMySalarySlips
} from '../controllers/payrollController.js';
import { verifyToken, isAdmin, isEmployeeOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/runs', verifyToken, isAdmin, getPayrollRuns);
router.get('/runs/:id', verifyToken, isAdmin, getPayrollRunDetails);
router.post('/generate-draft', verifyToken, isAdmin, generateDraftPayroll);
router.put('/adjust/:detailId', verifyToken, isAdmin, adjustPayrollDetail);
router.post('/finalize/:id', verifyToken, isAdmin, finalizePayrollRun);
router.post('/mark-paid/:id', verifyToken, isAdmin, markPayrollAsPaid);
router.get('/my-slips', verifyToken, isEmployeeOrAdmin, getMySalarySlips);
router.get('/slip/:detailId/download', verifyToken, isEmployeeOrAdmin, downloadSalarySlip);

export default router;
