const db = require('../src/db');
const bcrypt = require('bcrypt');

/* ===============================
   Get Profile
================================= */
exports.getProfile = async (req, res) => {

    const userId = req.user.user_id;

    try {
        const result = await db.query(
            `SELECT user_id, name, email, phone_number, role, user_status, created_at
             FROM USERS
             WHERE user_id = $1`,
            [userId]
        );

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


/* ===============================
   Update Name
================================= */
exports.updateName = async (req, res) => {

    const userId = req.user.user_id;
    const { name } = req.body;

    try {

        await db.query(
            `UPDATE USERS
             SET name = $1
             WHERE user_id = $2`,
            [name, userId]
        );

        res.json({ message: "Name updated successfully" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


/* ===============================
   Change Password (ASK OLD PASSWORD)
================================= */
exports.changePassword = async (req, res) => {

    const userId = req.user.user_id;
    const { oldPassword, newPassword } = req.body;

    try {

        // Get current password hash
        const result = await db.query(
            `SELECT password FROM USERS WHERE user_id = $1`,
            [userId]
        );

        const user = result.rows[0];

        // Compare old password
        const match = await bcrypt.compare(oldPassword, user.password);

        if (!match) {
            return res.status(400).json({ message: "Old password is incorrect" });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await db.query(
            `UPDATE USERS
             SET password = $1
             WHERE user_id = $2`,
            [hashedPassword, userId]
        );

        res.json({ message: "Password changed successfully" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


/* ===============================
   Delete Account (ASK OLD PASSWORD)
================================= */
exports.deleteAccount = async (req, res) => {

    const userId = req.user.user_id;
    const { oldPassword } = req.body;

    try {

        // Get password
        const result = await db.query(
            `SELECT password FROM USERS WHERE user_id = $1`,
            [userId]
        );

        const user = result.rows[0];

        const match = await bcrypt.compare(oldPassword, user.password);

        if (!match) {
            return res.status(400).json({ message: "Old password is incorrect" });
        }

        // Soft delete (trigger will check upcoming trip)
        await db.query(
            `UPDATE USERS
             SET user_status = 'deleted'
             WHERE user_id = $1`,
            [userId]
        );

        res.json({ message: "Account deleted successfully" });

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
