const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const controller = require('../controllers/customer.controller');
const bookingController = require('../controllers/booking.controller');

router.get('/dashboard', auth, controller.dashboardInfo);
router.get('/cities', auth, controller.getCities);
router.post('/search', auth, controller.searchRoute);
router.get('/recent-searches', auth, controller.getRecentSearches);
router.get('/schedules', auth, controller.getSchedules);

// Booking Routes
router.get('/schedule-seats/:scheduleId', auth, bookingController.getScheduleSeats);
router.get('/schedule-details/:scheduleId', auth, bookingController.getScheduleDetails);
router.get('/check-existing-bookings/:scheduleId', auth, bookingController.checkExistingBookings);
router.post('/cancel-booking/:bookingId', auth, bookingController.cancelBooking);
router.post('/create-booking', auth, bookingController.createPendingBooking);
router.post('/confirm-payment', auth, bookingController.confirmPayment);


module.exports = router;

