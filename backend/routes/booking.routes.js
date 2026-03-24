const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const authMiddleware = require('../middleware/auth.middleware');

/* ============================================================
   Booking Routes
   All routes require authentication
   ============================================================ */

// Middleware: Verify customer is authenticated
router.use(authMiddleware);

/**
 * GET /api/customer/schedule-seats/:scheduleId
 * Get all seats for a schedule with their current status
 */
router.get('/schedule-seats/:scheduleId', bookingController.getScheduleSeats);

/**
 * GET /api/customer/schedule-details/:scheduleId
 * Get schedule details (operator, time, price, bus type, available seats)
 */
router.get('/schedule-details/:scheduleId', bookingController.getScheduleDetails);

/**
 * POST /api/customer/validate-seats
 * Validate seat availability and create pending booking
 */
router.post('/validate-seats', bookingController.validateAndReserveSeats);

/**
 * POST /api/customer/complete-booking
 * Complete pending booking by updating seat statuses to 'booked'
 */
router.post('/complete-booking', bookingController.completeBooking);

/**
 * POST /api/customer/cancel-booking/:bookingId
 * Cancel pending booking and release seat holds
 */
router.post('/cancel-booking/:bookingId', bookingController.cancelBooking);

module.exports = router;
