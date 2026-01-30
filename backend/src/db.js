const { Pool } = require("pg");
require("dotenv").config({ path: "./backend/.env" });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD), // FORCE STRING
  database: process.env.DB_NAME,
});

module.exports = pool;
