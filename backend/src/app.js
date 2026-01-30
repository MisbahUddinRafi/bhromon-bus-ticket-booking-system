const express = require("express");
const pool = require("./db");
require("dotenv").config({ path: "./backend/.env" });

const authRoutes = require("../routes/auth.routes");

const app = express();
app.use(express.json());

/* Test DB connection */
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT current_database(), NOW()");
    res.json({
      message: "Database connected successfully",
      database: result.rows[0].current_database,
      time: result.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Login routes */
app.use("/api/auth", authRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
