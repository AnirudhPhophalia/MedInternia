import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import {
  generateCertificate,
  getUserCertificates,
  getCertificateById,
  verifyCertificate,
  getDoctorIssuedCertificates,
  revokeCertificate,
  exportCertificateData
} from '../controllers/certificateController';

const router = Router();

// Generate certificate
router.post('/generate', authenticate, requirePermission('certificate:issue'), generateCertificate);

// Get certificates for user
router.get('/user/:userId', getUserCertificates);

// Get certificate by certificate ID
router.get('/:certificateId', getCertificateById);

// Verify certificate
router.post('/verify', verifyCertificate);

// Get certificates issued by doctor
router.get('/doctor/issued', authenticate, requirePermission('certificate:issue'), getDoctorIssuedCertificates);

// Revoke certificate
router.patch('/:certificateId/revoke', authenticate, requirePermission('certificate:issue'), revokeCertificate);

// Export certificate data
router.get('/:certificateId/export', exportCertificateData);

export default router;
