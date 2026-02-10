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
    const { fromCityId, toCityId } = req.body;              // ***** eikhane id or name hobe oita sure na
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
        `INSERT INTO RECENT_SEARCHES (user_id, route_id)
        VALUES ($1, $2)`,
        [userId, routeId]
    );

    res.json({ message: 'Search saved', routeId });
};

/* Last 3 searches */
exports.getRecentSearches = async (req, res) => {
    const userId = req.user.user_id;

    const result = await db.query(
        `
    SELECT 
      c1.city_name AS from_city,
      c2.city_name AS to_city,
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
