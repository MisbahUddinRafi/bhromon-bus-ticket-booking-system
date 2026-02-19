const pool = require('../src/db');

/* =========================
   Admin Dashboard
========================= */
exports.dashboard = async (req, res) => {
    const user = JSON.parse(req.headers['x-user']);
    res.json({ name: user.name });
};

/* =========================
   Get All Cities
========================= */
exports.getCities = async (req, res) => {
    const result = await pool.query(`SELECT city_id, city_name FROM CITY ORDER BY city_name`);
    res.json(result.rows);
};

/* =========================
   Get All Operators
========================= */
exports.getOperators = async (req, res) => {
    const result = await pool.query(`SELECT operator_id, operator_name FROM BUS_OPERATOR ORDER BY operator_name`);
    res.json(result.rows);
};

/* =========================
   Get All Users
========================= */
exports.getUsers = async (req, res) => {
    const result = await pool.query(`SELECT user_id, name, email, phone_number, role FROM USERS ORDER BY name`);
    res.json(result.rows);
};

/* =========================
   Get Available Buses for Operator on a Date
========================= */
exports.getAvailableBuses = async (req, res) => {
    const { operatorId, date } = req.params;

    // Get buses of this operator not scheduled on the given date
    const result = await pool.query(`
        SELECT bus_id, bus_number, bus_type 
        FROM BUS 
        WHERE operator_id=$1
        AND bus_id NOT IN (
            SELECT bus_id 
            FROM SCHEDULE 
            WHERE journey_date=$2
            AND schedule_status='active'
        )
        ORDER BY bus_number
    `, [operatorId, date]);

    res.json(result.rows);
};

/* =========================
   Create Schedule
========================= */
exports.createSchedule = async (req, res) => {
    const {
        sourceCityId,
        destinationCityId,
        journeyDate,
        departureTime,
        price,
        busId
    } = req.body;

    if (sourceCityId === destinationCityId)
        return res.status(400).json({ message: "Same cities not allowed" });

    if (price <= 0 || price > 5000)
        return res.status(400).json({ message: "Invalid price" });

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1️⃣ Find or create route
        let route = await client.query(
            `SELECT route_id 
             FROM ROUTE 
             WHERE source_city_id=$1 
             AND destination_city_id=$2`,
            [sourceCityId, destinationCityId]
        );

        let routeId;

        if (route.rows.length === 0) {
            const newRoute = await client.query(
                `INSERT INTO ROUTE (source_city_id, destination_city_id)
                 VALUES ($1,$2)
                 RETURNING route_id`,
                [sourceCityId, destinationCityId]
            );
            routeId = newRoute.rows[0].route_id;
        } else {
            routeId = route.rows[0].route_id;
        }

        // 2️⃣ Insert schedule (Seats auto-created by DB trigger)
        await client.query(
            `INSERT INTO SCHEDULE 
            (journey_date, departure_time, price, schedule_status, bus_id, route_id)
            VALUES ($1,$2,$3,'active',$4,$5)`,
            [journeyDate, departureTime, price, busId, routeId]
        );

        await client.query('COMMIT');

        res.json({ message: "Schedule Created Successfully" });

    } catch (err) {
        await client.query('ROLLBACK');

        // Handle duplicate bus schedule error
        if (err.code === '23505') {
            return res.status(400).json({
                message: "This bus is already scheduled at this date and time"
            });
        }

        console.error(err);
        res.status(500).json({ message: "Error creating schedule" });

    } finally {
        client.release();
    }
};


/* =========================
   Cancel Schedule
========================= */
exports.cancelSchedule = async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE SCHEDULE
             SET schedule_status='cancelled'
             WHERE schedule_id=$1
             RETURNING schedule_id`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Schedule not found" });
        }

        res.json({ message: "Schedule Cancelled Successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error cancelling schedule" });
    }
};


/* =========================
   Get Active Schedules
========================= */
exports.getActiveSchedules = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.schedule_id,
                c1.city_name AS source,
                c2.city_name AS destination,
                s.journey_date,
                s.departure_time,
                s.price,
                s.schedule_status,
                b.bus_number,
                b.bus_type,
                bo.operator_name
            FROM SCHEDULE s
            JOIN ROUTE r ON s.route_id = r.route_id
            JOIN CITY c1 ON r.source_city_id = c1.city_id
            JOIN CITY c2 ON r.destination_city_id = c2.city_id
            JOIN BUS b ON s.bus_id = b.bus_id
            JOIN BUS_OPERATOR bo ON b.operator_id = bo.operator_id
            WHERE s.schedule_status = 'active'
            ORDER BY s.journey_date, s.departure_time
        `);

        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching schedules" });
    }
};


/* =========================
   Get User Booking History
========================= */
exports.getUserHistory = async (req, res) => {
    const result = await pool.query(`
        SELECT b.booking_id, b.booking_status, s.journey_date, s.departure_time,
               r.source_city_id, r.destination_city_id,
               c1.city_name AS source, c2.city_name AS destination,
               b.booking_time
        FROM BOOKING b
        JOIN SCHEDULE s ON b.schedule_id=s.schedule_id
        JOIN ROUTE r ON s.route_id=r.route_id
        JOIN CITY c1 ON r.source_city_id=c1.city_id
        JOIN CITY c2 ON r.destination_city_id=c2.city_id
        WHERE b.user_id=$1
        ORDER BY b.booking_time DESC
    `, [req.params.id]);
    res.json(result.rows);
};

/* =========================
   Get Operator Schedule History
========================= */
exports.getOperatorHistory = async (req, res) => {
    const result = await pool.query(`
        SELECT s.schedule_id, s.journey_date, s.departure_time,
               s.schedule_status, b.bus_number, b.bus_type
        FROM SCHEDULE s
        JOIN BUS b ON s.bus_id=b.bus_id
        WHERE b.operator_id=$1
        ORDER BY s.journey_date DESC, s.departure_time DESC
    `, [req.params.id]);
    res.json(result.rows);
};
