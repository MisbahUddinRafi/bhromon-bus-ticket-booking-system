const express = require("express");
const router = express.Router();

const { login, signup } = require("../controllers/auth.controller");

/*
POST /api/auth/login
POST /api/auth/signup
*/

router.post("/login", login);
router.post("/signup", signup);

module.exports = router;
