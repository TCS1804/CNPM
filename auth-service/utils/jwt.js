const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

// Generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: '1d' });
};

// Middleware to verify JWT and attach user info to request
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to allow specific roles
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

module.exports = {
  generateToken,
  verifyToken,
  allowRoles
};
