import jwt from 'jsonwebtoken';
import db from '../db/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'erp_super_secret_jwt_key_2026_secure!';

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user record
    const user = db.get('SELECT id, name, email, role, employee_id, status FROM users WHERE id = ?', [decoded.id]);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'User account not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

export function isAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden. Admin privileges required.' });
  }
  next();
}

export function isEmployeeOrAdmin(req, res, next) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'employee') {
    return res.status(403).json({ success: false, message: 'Forbidden. Access restricted.' });
  }
  next();
}
