const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const url = req.originalUrl || req.url || '';

  // ⚠️ BỎ QUA CHECK TOKEN CHO ADMIN / SPLIT CONFIG
  if (
    url.includes('/admin/') ||      // ví dụ /order/admin/summary, /restaurant/admin/restaurants
    url.includes('/split-config')   // cấu hình chia tiền
  ) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

module.exports = { verifyToken, allowRoles };
