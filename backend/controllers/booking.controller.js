                                                                                                                                                                                                            const db = require('../src/db');

/* ============================================================
   Booking Controller
   Handles seat selection, validation, and booking confirmation
   ============================================================ */

/**
 * GET /api/customer/schedule-seats/:scheduleId
 * Fetch all seats for a schedule with their current status
 * Used by frontend to render real-time seat grid
 */
exports.getScheduleSeats = async (req, res) => {
    const { scheduleId } = req.params;

    try {
        // Validate schedule ID
        if (!scheduleId || isNaN(scheduleId)) {
            return res.status(400).json({ message: 'Invalid schedule ID' });
        }

        // Call the get_schedule_seats function
        const result = await db.query(
            'SELECT * FROM get_schedule_seats($1)',
            [parseInt(scheduleId)]
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ message: 'No seats found for this schedule' });
        }

        res.json({
            success: true,
            seats: result.rows
        });

    } catch (err) {
        console.error('Error fetching schedule seats:', err);
        res.status(500).json({ message: 'Error fetching seats' });
    }
};


/**
 * POST /api/customer/validate-seats
 * Validate seat availability and create pending booking with holds
 * 
 * Request body:
 * {
 *   scheduleId: INT,
 *   seatNumbers: ["S1", "S2", ...]
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   booking_id: INT,
 *   message: STRING
 * }
 */
exports.validateAndReserveSeats = async (req, res) => {
    const { scheduleId, seatNumbers } = req.body;
    const userId = req.user.user_id;

    try {
        // Input validation
        if (!scheduleId || !seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input: scheduleId and seatNumbers array required'
            });
        }

        if (!Array.isArray(seatNumbers)) {
            return res.status(400).json({
                success: false,
                message: 'seatNumbers must be an array'
            });
        }

        if (seatNumbers.length > 4) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 4 seats can be selected per booking'
            });
        }

        // Call the validate_and_reserve_seats function
        const result = await db.query(
            'SELECT validate_and_reserve_seats($1, $2, $3) as result',
            [userId, scheduleId, seatNumbers]
        );

        if (!result.rows || !result.rows[0]) {
            return res.status(500).json({
                success: false,
                message: 'Error processing seat validation'
            });
        }

        const response = result.rows[0].result;

        res.json(response);

    } catch (err) {
        console.error('Error validating seats:', err);
        res.status(500).json({
            success: false,
            message: 'Error validating seats: ' + err.message
        });
    }
};


/**
 * POST /api/customer/complete-booking
 * Complete pending booking by updating seat statuses to 'booked'
 * Will also need passenger details in actual implementation
 * 
 * Request body:
 * {
 *   bookingId: INT
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   booking_id: INT,
 *   message: STRING
 * }
 */
exports.completeBooking = async (req, res) => {
    const { bookingId } = req.body;
    const userId = req.user.user_id;

    try {
        // Input validation
        if (!bookingId || isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID'
            });
        }

        // Verify booking belongs to current user
        const bookingCheck = await db.query(
            'SELECT user_id, booking_status FROM BOOKING WHERE booking_id = $1',
            [bookingId]
        );

        if (!bookingCheck.rows || bookingCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const booking = bookingCheck.rows[0];

        if (booking.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: This booking does not belong to you'
            });
        }

        if (booking.booking_status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Only pending bookings can be completed'
            });
        }

        // Call the complete_booking function
        const result = await db.query(
            'SELECT complete_booking($1) as result',
            [bookingId]
        );

        if (!result.rows || !result.rows[0]) {
            return res.status(500).json({
                success: false,
                message: 'Error completing booking'
            });
        }

        const response = result.rows[0].result;

        res.json(response);

    } catch (err) {
        console.error('Error completing booking:', err);
        res.status(500).json({
            success: false,
            message: 'Error completing booking: ' + err.message
        });
    }
};


/**
 * POST /api/customer/cancel-booking/:bookingId
 * Cancel pending booking and release seat holds
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: STRING
 * }
 */
exports.cancelBooking = async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user.user_id;

    try {
        // Input validation
        if (!bookingId || isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking ID'
            });
        }

        // Verify booking belongs to current user
        const bookingCheck = await db.query(
            'SELECT user_id, booking_status FROM BOOKING WHERE booking_id = $1',
            [bookingId]
        );

        if (!bookingCheck.rows || bookingCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const booking = bookingCheck.rows[0];

        if (booking.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: This booking does not belong to you'
            });
        }

        // Call the cancel_booking function
        const result = await db.query(
            'SELECT cancel_booking($1) as result',
            [bookingId]
        );

        if (!result.rows || !result.rows[0]) {
            return res.status(500).json({
                success: false,
                message: 'Error cancelling booking'
            });
        }

        const response = result.rows[0].result;

        res.json(response);

    } catch (err) {
        console.error('Error cancelling booking:', err);
        res.status(500).json({
            success: false,
            message: 'Error cancelling booking: ' + err.message
        });
    }
};


/**
 * GET /api/customer/schedule-details/:scheduleId
 * Get detailed information about a schedule (operator, price, available seats, etc.)
 * Used by booking modal header
 */
exports.getScheduleDetails = async (req, res) => {
    const { scheduleId } = req.params;

    try {
        if (!scheduleId || isNaN(scheduleId)) {
            return res.status(400).json({ message: 'Invalid schedule ID' });
        }

        const result = await db.query(
            `SELECT
                s.schedule_id,
                s.journey_date,
                s.departure_time,
                s.price, 
                s.bus_id,
                b.bus_type,
                b.bus_number, 
                bo.operator_id,
                bo.operator_name, 
                s.route_id, 
                c1.city_id as from_city_id,
                c2.city_id as to_city_id,
                c1.city_name as from_city,
                c2.city_name as to_city,
                (SELECT COUNT(*) FROM SCHEDULE_SEAT WHERE schedule_id = $1 AND schedule_seat_status = 'available') as available_seats
            FROM SCHEDULE s
            JOIN BUS b ON s.bus_id = b.bus_id
            JOIN BUS_OPERATOR bo ON b.operator_id = bo.operator_id
            JOIN ROUTE r ON s.route_id = r.route_id
            JOIN CITY c1 ON r.source_city_id = c1.city_id
            JOIN CITY c2 ON r.destination_city_id = c2.city_id
            WHERE s.schedule_id = $1 and s.schedule_status = 'active'`,
            [scheduleId]
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        res.json({
            success: true,
            schedule: result.rows[0]
        });

    } catch (err) {
        console.error('Error fetching schedule details:', err);
        res.status(500).json({ message: 'Error fetching schedule details' });
    }
};
