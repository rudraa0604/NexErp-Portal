import express from 'express';
import {
  punchToggle,
  getTodaySummary,
  getTodayList,
  getMyStatus,
  overrideStatus,
  getMonthCalendar,
  getSettings,
  updateSettings,
  applyHalfDay
} from '../controllers/attendanceController.js';
import { verifyToken, isAdmin, isEmployeeOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/punch', verifyToken, punchToggle);
router.post('/half-day', verifyToken, isEmployeeOrAdmin, applyHalfDay);
router.get('/my-status', verifyToken, getMyStatus);
router.get('/today-summary', verifyToken, isAdmin, getTodaySummary);
router.get('/today-list', verifyToken, isAdmin, getTodayList);
router.post('/override', verifyToken, isAdmin, overrideStatus);
router.get('/calendar/:employeeId?', verifyToken, isEmployeeOrAdmin, getMonthCalendar);
router.get('/settings', verifyToken, isAdmin, getSettings);
router.post('/settings', verifyToken, isAdmin, updateSettings);

export default router;
