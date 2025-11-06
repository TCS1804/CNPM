const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// --- ✅ HÀM MỚI: verifyTokenOrInternal ---
function verifyTokenOrInternal(req, res, next) {
  const internalSecret = req.get('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_SECRET;

  // Nếu header có secret hợp lệ → cho qua (đây là request từ payment-service)
  if (internalSecret && expectedSecret && internalSecret === expectedSecret) {
    return next();
  }

  // Ngược lại → yêu cầu xác thực JWT như thường
  return verifyToken(req, res, next);
}

const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Role not allowed" });
    }
    next();
  };
};

module.exports = { verifyToken, verifyTokenOrInternal, allowRoles };
