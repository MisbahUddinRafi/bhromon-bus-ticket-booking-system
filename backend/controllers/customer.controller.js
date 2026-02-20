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
    const { fromCityId, toCityId, journeyDate } = req.body;              // ***** eikhane id or name hobe oita sure na
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

        // 1️⃣ Get route_id
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

        // 2️⃣ Base Query
        let query = `
            SELECT
                s.schedule_id,
                s.journey_date,
                s.departure_time,
                s.price,
                b.bus_number,
                b.bus_type,
                bo.operator_id,
                bo.operator_name
            FROM SCHEDULE s
            JOIN BUS b ON s.bus_id = b.bus_id
            JOIN BUS_OPERATOR bo ON b.operator_id = bo.operator_id
            WHERE s.route_id = $1
              AND s.journey_date = $2
              AND s.schedule_status = 'active'
        `;

        let values = [routeId, journeyDate];
        let index = 3;

        // 3️⃣ Bus Type Filter (AC / Non-AC)
        if (busTypes) {
            const typesArray = busTypes.split(',');
            query += ` AND b.bus_type = ANY($${index}::bus_type_enum[])`;
            values.push(typesArray);
            index++;
        }

        // 4️⃣ Operator Filter
        if (operatorIds) {
            const operatorsArray = operatorIds.split(',').map(Number);
            query += ` AND bo.operator_id = ANY($${index}::int[])`;
            values.push(operatorsArray);
            index++;
        }

        // 5️⃣ Sorting Logic
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

        // 🔎 Optional Debug
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
