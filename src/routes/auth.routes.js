import { Router } from 'express';
import {
  registerUser, loginUser, getMe,
  addStaffMember, updateStaffMember, deleteStaffMember,
  getStaffMembers, getRolePermissions,
  verifyEmail, resendVerification,
  inviteStaffMember, validateInviteToken, acceptInvite, resendInvite,
  forgotPassword, resetPassword,
  changePassword,
} from '../controllers/auth.controller.js';
import { enforceLimit } from '../middleware/planLimit.middleware.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/register',            registerUser);
router.post('/login',               loginUser);
router.get( '/verify-email',        verifyEmail);
router.post('/resend-verification', resendVerification);
router.get( '/invite/:token',       validateInviteToken);
router.post('/accept-invite',       acceptInvite);
router.post('/forgot-password',     forgotPassword);
router.post('/reset-password',      resetPassword);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.get('/me',    authenticate, getMe);
router.get('/users', authenticate, getStaffMembers);
router.get('/roles', authenticate, getRolePermissions);

// ── Staff management ──────────────────────────────────────────────────────────
router.post('/staff',         authenticate, enforceLimit('usersMax'), addStaffMember);
router.post('/invite',        authenticate, inviteStaffMember);
router.post('/resend-invite', authenticate, resendInvite);
router.put( '/staff/:id',     authenticate, updateStaffMember);
router.delete('/staff/:id',   authenticate, deleteStaffMember);

// backwards compat
router.put(   '/users/:id', authenticate, updateStaffMember);
router.delete('/users/:id', authenticate, deleteStaffMember);

router.put('/change-password', authenticate, changePassword);

export default router;