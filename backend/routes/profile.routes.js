const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const controller = require('../controllers/profile.controller');

/* Get profile info */
router.get('/profile', auth, controller.getProfile);

/* Update name */
router.put('/update-name', auth, controller.updateName);

/* Change password */
router.put('/change-password', auth, controller.changePassword);

/* Delete account */
router.patch('/delete', auth, controller.deleteAccount);

module.exports = router;
