import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getPatients, getPatientById, updatePatientMedicalInfo } from '../controllers/patientController';

const router = Router();

router.get('/', authenticate, authorize('doctor'), getPatients);

router.get('/:id', authenticate, getPatientById);

router.put('/:id/medical-info', authenticate, updatePatientMedicalInfo);

export default router;
