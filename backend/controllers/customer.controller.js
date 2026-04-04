const db = require('../src/db');

/* Dashboard header info */
exports.dashboardInfo = async (req, res) => {
    res.json({ name: req.user.name });
};

/* Load all cities */
exports.getCities = async (req, res) => {
    const result = await db.query(
        'SELECT city_id, city_name FROM CITY ORDER BY city_name'
    );
    res.json(result.rows);
};

/* Search route & save recent search */
exports.searchRoute = async (req, res) => {
    const { fromCityId, toCityId, journeyDate } = req.body;
    const userId = req.user.user_id;

    const routeResult = await db.query(
        `SELECT route_id FROM ROUTE
        WHERE source_city_id = $1 AND destination_city_id = $2`,
        [fromCityId, toCityId]
    );

    if (routeResult.rows.length === 0) {
        return res.status(404).json({ message: 'Route not found' });
    }

    const routeId = routeResult.rows[0].route_id;

    await db.query(
        `INSERT INTO RECENT_SEARCHES (user_id, route_id, journey_date)
        VALUES ($1, $2, $3)`,
        [userId, routeId, journeyDate]
    );

    res.json({ message: 'Search saved', routeId });
};


/* Complete expired schedules */
const completeExpiredSchedules = async () => {
    await db.query(`
        UPDATE SCHEDULE
        SET schedule_status = 'completed'
        WHERE schedule_status = 'active'
        AND (journey_date + departure_time) < NOW()
    `);
};

// Get schedules based on search criteria
exports.getSchedules = async (req, res) => {

    const {
        fromCityId,
        toCityId,
        journeyDate,
        sortPrice,
        sortTime,
        busTypes,
        operatorIds
    } = req.query;

    try {

        // Basic validation
        if (!fromCityId || !toCityId || !journeyDate) {
            return res.status(400).json({
                message: 'Missing required search parameters'
            });
        }

        // 1. Get route_id
        const routeResult = await db.query(
            `SELECT route_id FROM ROUTE
             WHERE source_city_id = $1 
               AND destination_city_id = $2`,
            [fromCityId, toCityId]
        );

        if (routeResult.rows.length === 0) {
            return res.status(404).json({ message: 'Route not found' });
        }

        const routeId = routeResult.rows[0].route_id;


        // Update the schedule status: 
        await completeExpiredSchedules();

        // 2. Base Query
        let query = `
            SELECT
                s.schedule_id,
                s.journey_date,
                s.departure_time,
                s.price,
                b.bus_number,
                b.bus_type,
                bo.operator_id,
                bo.operator_name, 
                (SELECT count(*) FROM SCHEDULE_SEAT ss WHERE ss.schedule_id = s.schedule_id AND ss.schedule_seat_status = 'available') as available_seats    
            FROM SCHEDULE s
            JOIN BUS b ON s.bus_id = b.bus_id
            JOIN BUS_OPERATOR bo ON b.operator_id = bo.operator_id
            WHERE s.route_id = $1
              AND s.journey_date = $2
              AND s.schedule_status = 'active'
        `;

        let values = [routeId, journeyDate];
        let index = 3;

        // 3. Bus Type Filter (AC / Non-AC)
        if (busTypes) {
            const typesArray = busTypes.split(',');
            query += ` AND b.bus_type = ANY($${index}::bus_type_enum[])`;
            values.push(typesArray);
            index++;
        }

        // 4. Operator Filter
        if (operatorIds) {
            const operatorsArray = operatorIds.split(',').map(Number);
            query += ` AND bo.operator_id = ANY($${index}::int[])`;
            values.push(operatorsArray);
            index++;
        }

        // 5. Sorting Logic
        let orderClause = ' ORDER BY s.departure_time ASC'; // default

        if (sortPrice === 'low') {
            orderClause = ' ORDER BY s.price ASC';
        }
        else if (sortPrice === 'high') {
            orderClause = ' ORDER BY s.price DESC';
        }
        else if (sortTime === 'early') {
            orderClause = ' ORDER BY s.departure_time ASC';
        }
        else if (sortTime === 'late') {
            orderClause = ' ORDER BY s.departure_time DESC';
        }

        query += orderClause;

        // Optional Debug
        // console.log("Final Query:", query);
        // console.log("Values:", values);

        const schedules = await db.query(query, values);

        res.json(schedules.rows);

    } catch (err) {
        console.error("Schedule Fetch Error:", err);
        res.status(500).json({
            message: 'Error fetching schedules'
        });
    }
};






/* Last 3 searches */
exports.getRecentSearches = async (req, res) => {
    const userId = req.user.user_id;

    const result = await db.query(
        `
    SELECT 
      c1.city_name AS from_city,
      c2.city_name AS to_city,
      c1.city_id AS from_city_id,
      c2.city_id AS to_city_id,
      rs.journey_date,
      rs.search_time
    FROM RECENT_SEARCHES rs
    JOIN ROUTE r ON rs.route_id = r.route_id
    JOIN CITY c1 ON r.source_city_id = c1.city_id
    JOIN CITY c2 ON r.destination_city_id = c2.city_id
    WHERE rs.user_id = $1
    ORDER BY rs.search_time DESC
    LIMIT 3
    `,
        [userId]
    );

    res.json(result.rows);
};









/* Get upcoming trips */
// get/api/customer/upcoming-trips 

exports.getUpcomingTrips = async (req, res) => {
    const userId = req.user.user_id;

    // Update the schedule status: 
    await completeExpiredSchedules();

    try {
        const result = await db.query(
            `SELECT 
                b.booking_id, 
                b.booking_status, 
                to_char(b.booking_time, 'DD-MM-YYYY HH24:MI:SS') AS booking_time,
                u.name AS user_name,
                s.schedule_id,
                to_char(s.journey_date, 'DD-MM-YYYY') AS journey_date,
                s.departure_time,
                bo.operator_name,
                bo.contact_number, 
                bus.bus_number,
                c1.city_name AS from_city, 
                c2.city_name AS to_city,
                p.payment_amount AS total_fare,
                p.payment_type AS payment_method,
                (SELECT COUNT(*)::int FROM BOOKED_SEAT bs WHERE bs.booking_id = b.booking_id) AS total_seats_booked,
                COALESCE((
                    SELECT JSON_AGG(JSON_BUILD_OBJECT('seat_number', bs.seat_number, 'name', bs.passenger_name, 'gender', bs.passenger_gender))
                    FROM BOOKED_SEAT bs
                    WHERE bs.booking_id = b.booking_id
                ), '[]'::json) AS passenger_info
            FROM BOOKING b
            JOIN USERS u ON b.user_id = u.user_id
            JOIN SCHEDULE s ON b.schedule_id = s.schedule_id
            JOIN BUS bus ON s.bus_id = bus.bus_id
            JOIN BUS_OPERATOR bo ON bus.operator_id = bo.operator_id
            JOIN ROUTE r ON s.route_id = r.route_id
            JOIN CITY c1 ON r.source_city_id = c1.city_id
            JOIN CITY c2 ON r.destination_city_id = c2.city_id
            LEFT JOIN PAYMENT p ON b.booking_id = p.booking_id
            WHERE b.user_id = $1 
            AND (s.journey_date + s.departure_time) >= NOW()
            AND b.booking_status = 'confirmed' 
            ORDER BY b.booking_time DESC
        `,
            [userId]
        )

        res.json(result.rows);
    } catch (err) {
        console.error("Upcoming Trips Error:", err);
        res.status(500).json({
            message: 'Error fetching upcoming trips'
        });
    }

}



/* Get past trips */
// get/api/customer/past-trips
exports.getPastTrips = async (req, res) => {
    const userId = req.user.user_id;

    try {
        const result = await db.query(
            `SELECT 
                b.booking_id, 
                b.booking_status, 
                to_char(b.booking_time, 'DD-MM-YYYY HH24:MI:SS') AS booking_time,
                u.name AS user_name,
                to_char(s.journey_date, 'DD-MM-YYYY') AS journey_date,
                s.departure_time,
                bo.operator_name,
                bo.contact_number,
                bus.bus_number,
                c1.city_name AS from_city, 
                c2.city_name AS to_city,
                p.payment_amount AS total_fare,
                p.payment_type AS payment_method,
                (SELECT COUNT(*)::int FROM BOOKED_SEAT bs WHERE bs.booking_id = b.booking_id) AS total_seats_booked,
                COALESCE((
                    SELECT JSON_AGG(JSON_BUILD_OBJECT('seat_number', bs.seat_number, 'name', bs.passenger_name, 'gender', bs.passenger_gender))
                    FROM BOOKED_SEAT bs
                    WHERE bs.booking_id = b.booking_id
                ), '[]'::json) AS passenger_info
            FROM BOOKING b
            JOIN USERS u ON b.user_id = u.user_id
            JOIN SCHEDULE s ON b.schedule_id = s.schedule_id
            JOIN BUS bus ON s.bus_id = bus.bus_id
            JOIN BUS_OPERATOR bo ON bus.operator_id = bo.operator_id
            JOIN ROUTE r ON s.route_id = r.route_id
            JOIN CITY c1 ON r.source_city_id = c1.city_id
            JOIN CITY c2 ON r.destination_city_id = c2.city_id
            LEFT JOIN PAYMENT p ON b.booking_id = p.booking_id
            WHERE b.user_id = $1 
            AND (s.journey_date + s.departure_time) < NOW()
            AND b.booking_status IN ('pending', 'confirmed')  
            ORDER BY b.booking_time DESC
        `,
            [userId]
        )

        res.json(result.rows);
    } catch (err) {
        console.error("Past Trips Error:", err);
        res.status(500).json({
            message: 'Error fetching past trips'
        });
    }
};


/* Cancel booking */
exports.cancelBooking = async (req, res) => {
    const { bookingId, refundMethod } = req.body;
    const userId = req.user.user_id;

    // Acquire a client for transaction
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Verify booking ownership and status
        const bookingResult = await client.query(
            `SELECT b.booking_id, b.booking_status, s.journey_date, s.departure_time
             FROM BOOKING b
             JOIN SCHEDULE s ON b.schedule_id = s.schedule_id
             WHERE b.booking_id = $1 AND b.user_id = $2`,
            [bookingId, userId]
        );

        if (bookingResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Booking not found' });
        }

        const booking = bookingResult.rows[0];

        if (booking.booking_status === 'cancelled') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }

        // 2. Check time difference (Must be > 2 hours)
        const now = new Date();

        // Handle journey_date being a Date object or string
        let departure;
        if (booking.journey_date instanceof Date) {
            // PG returns Date object for journey_date. 
            // We strip time from Date object and add the departure_time.
            const journeyDateOnly = booking.journey_date.toISOString().split('T')[0];
            departure = new Date(`${journeyDateOnly}T${booking.departure_time}`);
        } else {
            // Assume journey_date is a string in YYYY-MM-DD or DD-MM-YYYY
            // PG's default output might vary, but we'll try to parse it.
            const dateStr = booking.journey_date;
            departure = new Date(`${dateStr}T${booking.departure_time}`);
        }

        const timeDiffHours = (departure - now) / (1000 * 60 * 60);

        if (timeDiffHours < 2) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Cannot cancel booking less than 2 hours before departure' });
        }

        // 3. Update booking status
        // The user's trigger (trg_booking_cancel) will handle seat availability
        // And the other trigger will handle the refund logic (according to policy)
        await client.query(
            `UPDATE BOOKING 
             SET booking_status = 'cancelled' 
             WHERE booking_id = $1`,
            [bookingId]
        );

        // Commit transaction
        await client.query('COMMIT');

        res.json({ success: true, message: 'Booking cancelled successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Cancel Booking Error:', err);
        res.status(500).json({ message: 'Error cancelling booking' });
    } finally {
        client.release();
    }
};
