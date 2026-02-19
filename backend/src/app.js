const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: "./backend/.env" });

const authRoutes = require("../routes/auth.routes");
const customerRoutes = require("../routes/customer.routes");
const adminRoutes = require("../routes/admin.routes");



const app = express();

/* =====================
   MIDDLEWARE
===================== */
app.use(cors());              // allow cross-origin requests
app.use(express.json());

/* =====================
   TEST ROUTE
===================== */
app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

/* =====================
   AUTH ROUTES
===================== */
app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use('/api/admin', adminRoutes);


app.listen(3000, () => {
  console.log("Server running on port 3000");
});
