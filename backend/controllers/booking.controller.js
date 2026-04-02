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
