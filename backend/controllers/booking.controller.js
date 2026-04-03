// database connection
const db = require('../src/db');

/* ============================================================
   Booking Controller
   Handles seat selection, validation, and booking confirmation
   ============================================================ */

/**
 * GET /api/customer/schedule-seats/:scheduleId
 * Fetch all seats for a schedule with their current status
 * Used by frontend to render seat grid with correct colors
 */
exports.getScheduleSeats = async (req, res) => {
    const { scheduleId } = req.params;

    try {
        if (!scheduleId || isNaN(scheduleId)) {
            return res.status(400).json({ message: 'Invalid schedule ID' });
        }

        // Fetch all seats with their status, ordered by seat number
        const result = await db.query(
            `SELECT *
            FROM SCHEDULE_SEAT 
            WHERE schedule_id = $1
            ORDER BY CAST(SUBSTR(seat_number, 2) AS INTEGER)`,
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
 * GET /api/customer/check-existing-bookings/:scheduleId
 * Check how many seats the user already has booked on this schedule
 * Used before allowing seat selection to enforce max 4 seats per schedule
 */
exports.checkExistingBookings = async (req, res) => {
    const { scheduleId } = req.params;
    const userId = req.user.user_id;

    try {
        if (!scheduleId || isNaN(scheduleId)) {
            return res.status(400).json({ message: 'Invalid schedule ID' });
        }

        // Call the count_existing_booked_seat function
        const result = await db.query(
            'SELECT count_existing_booked_seat($1, $2) as existing_seats',
            [userId, parseInt(scheduleId)]
        );

        if (!result.rows || result.rows[0] === undefined) {
            return res.status(500).json({ message: 'Error checking existing bookings' });
        }

        const existingSeats = result.rows[0].existing_seats;

        res.json({
            success: true,
            existing_seats: existingSeats,
            max_seats: 4,
            available_slots: 4 - existingSeats
        });

    } catch (err) {
        console.error('Error checking existing bookings:', err);
        res.status(500).json({ message: 'Error checking existing bookings' });
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

/**
 * POST /api/customer/cancel-booking/:bookingId
 * Cancel a confirmed booking and free up seats
 * (TODO: Add refund logic in next phase)
 */
exports.cancelBooking = async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user.user_id;

    try {
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

        // Call cancel_booking function
        // Note: The function checks 6-hour rule internally
        try {
            const result = await db.query(
                'SELECT cancel_booking($1) as result',
                [bookingId]
            );

            if (!result.rows || !result.rows[0].result) {
                return res.status(500).json({
                    success: false,
                    message: 'Error cancelling booking'
                });
            }

            res.json({
                success: true,
                message: 'Booking cancelled successfully'
            });

        } catch (dbErr) {
            // Return the database error message (e.g., 6-hour rule violation)
            return res.status(400).json({
                success: false,
                message: dbErr.message || 'Cannot cancel booking'
            });
        }

    } catch (err) {
        console.error('Error cancelling booking:', err);
        res.status(500).json({
            success: false,
            message: 'Error cancelling booking'
        });
    }
};


/**
 * POST /api/customer/create-booking
 * Create a pending booking (no seat changes)
 * Step 3 of booking flow: After passenger info, before payment
 */
exports.createPendingBooking = async (req, res) => {
    const userId = req.user.user_id;
    const { scheduleId, seats } = req.body;

    try {
        // Validate input
        if (!scheduleId || !seats || !Array.isArray(seats) || seats.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid booking data'
            });
        }

        // Check if schedule is still active
        const scheduleCheck = await db.query(
            'SELECT schedule_status FROM SCHEDULE WHERE schedule_id = $1',
            [scheduleId]
        );

        if (!scheduleCheck.rows.length || scheduleCheck.rows[0].schedule_status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Schedule is no longer active'
            });
        }

        // Validate all seats are still available
        const seatCheck = await db.query(
            `SELECT seat_number FROM SCHEDULE_SEAT 
             WHERE schedule_id = $1 
             AND seat_number = ANY($2::varchar[]) 
             AND schedule_seat_status = 'available'`,
            [scheduleId, seats]
        );

        if (seatCheck.rows.length !== seats.length) {
            return res.status(409).json({
                success: false,
                message: 'Some seats are no longer available'
            });
        }

        // Create pending booking - NO seat status changes
        const bookingResult = await db.query(
            `INSERT INTO BOOKING (user_id, schedule_id, booking_status) 
             VALUES ($1, $2, 'pending') 
             RETURNING booking_id`,
            [userId, scheduleId]
        );

        const bookingId = bookingResult.rows[0].booking_id;

        res.json({
            success: true,
            bookingId: bookingId,
            message: 'Booking created with pending status'
        });

    } catch (err) {
        console.error('Error creating pending booking:', err);
        res.status(500).json({
            success: false,
            message: 'Error creating booking'
        });
    }
};


/**
 * POST /api/customer/confirm-payment
 * Confirm payment and finalize booking using the confirm_booking() DB function
 * Step 4 of booking flow: Final confirmation with transaction safety
 */
exports.confirmPayment = async (req, res) => {
    const userId = req.user.user_id;
    const { bookingId, scheduleId, paymentType, paymentAmount, seats } = req.body;

    // Acquire a client from the pool for transaction
    const client = await db.connect();

    try {
        // Validate input
        if (!bookingId || !scheduleId || !paymentType || !paymentAmount || !seats || seats.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required payment data'
            });
        }

        // Verify booking belongs to user and is pending
        const bookingCheck = await client.query(
            'SELECT user_id, booking_status FROM BOOKING WHERE booking_id = $1',
            [bookingId]
        );

        if (!bookingCheck.rows.length) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (bookingCheck.rows[0].user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (bookingCheck.rows[0].booking_status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Booking is not in pending status' });
        }

        // Prepare arrays for the DB function
        const seatNumbers = seats.map(s => s.seatNumber);
        const passengerNames = seats.map(s => s.passengerName);
        const passengerGenders = seats.map(s => s.passengerGender);

        // Begin transaction
        await client.query('BEGIN');

        // Call confirm_booking function (handles locking, validation, insert, update)
        await client.query(
            'SELECT confirm_booking($1, $2, $3, $4, $5, $6, $7, $8)',
            [
                bookingId,
                userId,
                scheduleId,
                seatNumbers,
                passengerNames,
                passengerGenders,
                paymentAmount,
                paymentType
            ]
        );

        // Commit transaction
        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Payment confirmed and booking completed',
            bookingId: bookingId
        });

    } catch (err) {
        // Rollback on any error
        await client.query('ROLLBACK');
        console.error('Error confirming payment:', err);

        // Determine error message
        let errorMsg = 'Payment failed. Please try again.';
        if (err.message && err.message.includes('no longer available')) {
            errorMsg = 'Some seats were booked by another user. Please select different seats.';
        }

        res.status(500).json({
            success: false,
            message: errorMsg
        });

    } finally {
        client.release();
    }
};
