import { Router } from 'express';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  rescheduleAppointment,
  cancelAppointment,
  completeAppointment
} from '../controllers/appointmentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All appointment routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/appointments:
 *   post:
 *     summary: Create a new appointment (patients only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId, scheduledDate, scheduledTime]
 *             properties:
 *               doctorId:
 *                 type: string
 *                 description: ID of the doctor
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *                 description: Appointment date and time
 *               scheduledTime:
 *                 type: string
 *                 description: Appointment time in HH:mm format
 *               reason:
 *                 type: string
 *                 description: Reason for appointment
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Only patients can create appointments
 */
router.post('/', authorize('patient'), createAppointment);

/**
 * @openapi
 * /api/appointments:
 *   get:
 *     summary: Get appointments (patients see their own, doctors see their scheduled)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [scheduled, completed, cancelled, rescheduled] }
 *     responses:
 *       200:
 *         description: List of appointments
 *       401:
 *         description: Not authenticated
 */
router.get('/', getAppointments);

/**
 * @openapi
 * /api/appointments/{id}:
 *   get:
 *     summary: Get appointment details
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Appointment details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: No permission to view this appointment
 *       404:
 *         description: Appointment not found
 */
router.get('/:id', getAppointmentById);

/**
 * @openapi
 * /api/appointments/{id}/reschedule:
 *   patch:
 *     summary: Reschedule an appointment (patients only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scheduledDate, scheduledTime]
 *             properties:
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *               scheduledTime:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment rescheduled successfully
 *       403:
 *         description: Can only reschedule your own appointments
 *       404:
 *         description: Appointment not found
 */
router.patch('/:id/reschedule', authorize('patient'), rescheduleAppointment);

/**
 * @openapi
 * /api/appointments/{id}/cancel:
 *   patch:
 *     summary: Cancel an appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *       403:
 *         description: No permission to cancel this appointment
 *       404:
 *         description: Appointment not found
 */
router.patch('/:id/cancel', cancelAppointment);

/**
 * @openapi
 * /api/appointments/{id}/complete:
 *   patch:
 *     summary: Mark appointment as completed (doctors only)
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment marked as completed
 *       403:
 *         description: Only doctors can complete appointments
 *       404:
 *         description: Appointment not found
 */
router.patch('/:id/complete', authorize('doctor', 'admin'), completeAppointment);

export default router;
