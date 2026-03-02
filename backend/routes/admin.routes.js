const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin.controller');

router.get('/dashboard', admin.dashboard);
router.get('/cities', admin.getCities);
router.get('/operators', admin.getOperators);
router.get('/available-buses/:operatorId/:date', admin.getAvailableBuses);
router.post('/create-schedule', admin.createSchedule);
router.get('/active-schedules', admin.getActiveSchedules);
router.put('/cancel-schedule/:id', admin.cancelSchedule);
router.get('/past-schedules', admin.getPastSchedules);
router.get('/users', admin.getUsers);
router.get('/user-history/:id', admin.getUserHistory);
router.get('/operator-history/:id', admin.getOperatorHistory);
router.get('/schedule-details/:scheduleId', admin.getScheduleDetails);

module.exports = router;
