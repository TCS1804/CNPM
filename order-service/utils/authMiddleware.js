const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const url = req.originalUrl || req.url || '';

  // ⚠️ BỎ QUA CHECK TOKEN CHO CÁC ROUTE ADMIN / SPLIT CONFIG
  // ví dụ: /order/admin/..., /restaurant/admin/..., /payment/split-config
  if (
    url.includes('/admin/') ||      // mọi route chứa /admin/
    url.includes('/split-config')   // route cấu hình chia tiền
  ) {
    return next();
  }

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

// --- ✅ HÀM MỚI: verifyTokenOrInternal (giữ nguyên phần còn lại) ---
function verifyTokenOrInternal(req, res, next) {
  const internalSecret = req.get('x-internal-secret');
  const expectedSecret = process.env.INTERNAL_SECRET;

  if (internalSecret && expectedSecret && internalSecret === expectedSecret) {
    return next();
  }
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
