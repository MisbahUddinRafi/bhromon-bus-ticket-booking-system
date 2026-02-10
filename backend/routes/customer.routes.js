const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const controller = require('../controllers/customer.controller');

router.get('/dashboard', auth, controller.dashboardInfo);
router.get('/cities', auth, controller.getCities);
router.post('/search', auth, controller.searchRoute);
router.get('/recent-searches', auth, controller.getRecentSearches);

module.exports = router;
