module.exports = (req, res, next) => {
  const userHeader = req.headers['x-user'];

  if (!userHeader) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = JSON.parse(userHeader);

  if (user.role !== 'customer') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  req.user = user;
  next();
};
