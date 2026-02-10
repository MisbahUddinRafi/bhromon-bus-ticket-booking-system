const pool = require("../src/db");
const bcrypt = require("bcrypt");

/* =========================
   Helper: Normalize Phone
   Removes all whitespace
========================= */
function isValidName(name) {
  return /^[A-Za-z ]{3,50}$/.test(name);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeBDPhone(phone) {
  phone = phone.replace(/\s+/g, "");

  if (phone.startsWith("+880")) {
    phone = phone.replace("+880", "0");
  }

  return phone;
}

function isValidBDPhone(phone) {
  return /^(012|013|014|015|016|017|018|019)\d{8}$/.test(phone);
}





/*  ==============================
SIGNUP LOGIC (NO HASHING):
1. Get name, email, phone, password, role
2. Normalize phone number
3. Validate inputs
4. Check if email OR phone already exists
5. Insert new user
6. Respond
================================
*/

exports.signup = async (req, res) => {
  try {
    let { name, email, phone_number, password } = req.body;

    /* 1. Basic validation */
    if (!name || !email || !phone_number || !password) {
      return res.status(400).json({
        message: "Name, email, phone number and password are required",
      });
    }

    /* 2. Trim and Normalize */
    name = name.trim();
    email = email.trim().toLowerCase();
    phone_number = normalizeBDPhone(phone_number);

    /* 3. Name validation */
    if (!isValidName(name)) {
      return res.status(400).json({
        message: "Name must be 3-50 characters and contain only letters and spaces",
      });
    }

    /* 4. Email validation */
    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    /* 5. Bangladesh Phone validation */
    if (!isValidBDPhone(phone_number)) {
      return res.status(400).json({
        message: "Invalid Bangladeshi phone number format",
      });
    }

    /* 6. Check if email or phone already exists */
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

    /* 7. Hash password */
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    /* 8. Insert new user */
    const insertResult = await pool.query(
      `INSERT INTO users (name, email, phone_number, password, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, name, email, phone_number, role`,
      [name, email, phone_number, hashedPassword, "customer"]           // only "customer" role allowed at signup
    );

    /* 9. Success response */
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



/*  ============================================
LOGIN LOGIC (WITH HASHING):
1. Get identifier (email OR phone) & password
2. Normalize phone if used
3. Fetch user by email OR phone
4. Compare hashed password
5. Respond
==========================================
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
      value = normalizeBDPhone(identifier);

      if (!isValidBDPhone(value)) {
        return res.status(400).json({
          message: "Invalid phone number format",
        });
      }

      query = "SELECT * FROM users WHERE phone_number = $1";
    } else {
      // Email
      if (!isValidEmail(identifier)) {
        return res.status(400).json({
          message: "Invalid email format",
        });
      }
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

    /* 4. password comparison */
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    /* 5. Success */
    res.json({
      message: "Login successful",
      user: {
        user_id: user.user_id,
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
