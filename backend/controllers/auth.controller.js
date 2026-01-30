const pool = require("../src/db");

/* =========================
   Helper: Normalize Phone
   Removes all whitespace
========================= */
function normalizePhone(phone) {
  return phone.replace(/\s+/g, "");
}

/*
SIGNUP LOGIC (NO HASHING):
1. Get name, email, phone, password, role
2. Normalize phone number
3. Validate inputs
4. Check if email OR phone already exists
5. Insert new user
6. Respond
*/

exports.signup = async (req, res) => {
  try {
    let { name, email, phone_number, password, role } = req.body;

    /* 1. Basic validation */
    if (!name || !email || !phone_number || !password) {
      return res.status(400).json({
        message: "Name, email, phone number and password are required",
      });
    }

    /* 2. Normalize phone number (remove spaces) */
    phone_number = normalizePhone(phone_number);

    /* 3. Validate phone format (11 digits) */
    if (!/^\d{11}$/.test(phone_number)) {
      return res.status(400).json({
        message: "Phone number must contain exactly 11 digits",
      });
    }

    /* 4. Check if email or phone already exists */
    const existingUser = await pool.query(
      `SELECT user_id 
       FROM users 
       WHERE email = $1 OR phone_number = $2`,
      [email, phone_number]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email or phone number already in use",
      });
    }

    /* 5. Insert new user */
    const insertResult = await pool.query(
      `INSERT INTO users (name, email, phone_number, password, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, name, email, phone_number, role`,
      [name, email, phone_number, password, role || "user"]
    );

    /* 6. Success response */
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
1. Get identifier (email OR phone) & password
2. Normalize phone if used
3. Fetch user by email OR phone
4. Compare plain password
5. Respond
*/

exports.login = async (req, res) => {
  try {
    let { identifier, password } = req.body;

    /* 1. Validation */
    if (!identifier || !password) {
      return res.status(400).json({
        message: "Email/Phone and password are required",
      });
    }

    /* 2. Detect phone or email */
    let query;
    let value;

    if (/^\d[\d\s]*$/.test(identifier)) {
      // Looks like phone number
      value = normalizePhone(identifier);

      if (!/^\d{11}$/.test(value)) {
        return res.status(400).json({
          message: "Invalid phone number format",
        });
      }

      query = "SELECT * FROM users WHERE phone_number = $1";
    } else {
      // Email
      value = identifier;
      query = "SELECT * FROM users WHERE email = $1";
    }

    /* 3. Fetch user */
    const result = await pool.query(query, [value]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    /* 4. Plain password comparison */
    if (password !== user.password) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    /* 5. Success */
    res.json({
      message: "Login successful (plain test)",
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
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
