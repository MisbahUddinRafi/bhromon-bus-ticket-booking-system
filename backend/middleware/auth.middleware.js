module.exports = (req, res, next) => {

    const userHeader = req.headers['x-user'];

    if (!userHeader) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const user = JSON.parse(userHeader);
        req.user = user;
        next();
    } catch (err) {
        return res.status(400).json({ message: 'Invalid user data' });
    }
};
