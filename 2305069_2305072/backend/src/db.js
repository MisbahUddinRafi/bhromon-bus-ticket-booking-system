const { Pool, types } = require("pg");
require("dotenv").config({ path: "./backend/.env" });


types.setTypeParser(1082, (val) => val); // DATE type as string
types.setTypeParser(1114, (val) => val); // TIMESTAMP type as string

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD), // FORCE STRING
  database: process.env.DB_NAME,
});

module.exports = pool;
