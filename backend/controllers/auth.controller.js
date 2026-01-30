const pool = require("../src/db");




/*
SIGNUP LOGIC (NO HASHING):
1. Get name, email & password from request
2. Check if email exists
3. Insert new user
4. Respond

*/

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    /* 1. Validation */
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    /* 2. Check if email exists */
    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email already in use",
      });
    }

    /* 3. Insert new user */
    const insertResult = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING user_id, name, email, role",
      [name, email, password, role || "user"]
    );


    /* 4. Success Respond */
    res.status(201).json({
      message: "Signup successful",
      user: insertResult.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
};




/*
LOGIN LOGIC (NO HASHING):
1. Get email & password from request
2. Fetch user by email
3. Compare plain password
4. Respond
*/

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    /* Validation */
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    /* Get user */
    const result = await pool.query(
      "SELECT user_id, name, email, password, role FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    /* Plain password comparison */
    if (password !== user.password) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    /* Success */
    res.json({
      message: "Login successful (plain test)",
      user: {
        id: user.user_id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
};




