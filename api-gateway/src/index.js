// import express from 'express';
// import cors from 'cors';
// import morgan from 'morgan';
// import helmet from 'helmet';
// import { createProxyMiddleware } from 'http-proxy-middleware';

// const app = express();
// const PORT = process.env.PORT || 5020;
// const PREFIX = (process.env.API_PREFIX || '/api').replace(/\/$/, '');

// app.use((req, _res, next) => {
//   console.log('[gateway] incoming', req.method, req.url);
//   next();
// });

// const mountProxy = (fromPath, target, toBasePath) => {
//   app.use(
//     fromPath,
//     createProxyMiddleware({
//       target,
//       changeOrigin: true,
//       pathRewrite: (path) => {
//         const newPath = path.replace(fromPath, toBasePath);
//         console.log('[gateway] rewrite', path, '->', newPath);
//         return newPath;
//       },
//     })
//   );
// };

// // AUTH
// mountProxy(`${PREFIX}/auth`,
//   process.env.AUTH_SERVICE_URL || 'http://auth-service:5001',
//   '/auth'
// );

// // RESTAURANT
// mountProxy(`${PREFIX}/restaurant`,
//   process.env.RESTAURANT_SERVICE_URL || 'http://restaurant-service:5002',
//   '/restaurant'
// );

// // ORDER
// mountProxy(`${PREFIX}/orders`,
//   process.env.ORDER_SERVICE_URL || 'http://order-service:5003',
//   '/order'
// );

// // DELIVERY
// mountProxy(`${PREFIX}/delivery`,
//   process.env.DELIVERY_SERVICE_URL || 'http://delivery-service:5004',
//   '/delivery'
// );

// // NOTIFICATION
// mountProxy(`${PREFIX}/notifications`,
//   process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5006',
//   '/notifications'
// );

// // PAYMENT
// mountProxy(`${PREFIX}/payment`,
//   process.env.PAYMENT_SERVICE_URL || 'http://payment-service:5008',
//   '/payment'
// );

// // UPLOADS
// mountProxy(`${PREFIX}/uploads`,
//   process.env.RESTAURANT_SERVICE_URL || 'http://restaurant-service:5002',
//   '/uploads'
// );

// app.use(helmet());
// app.use(cors());
// app.use(morgan('tiny'));

// app.listen(PORT, () => {
//   console.log(`API Gateway running on :${PORT} with prefix '${PREFIX}'`);
// });

// SGU_CNPM_DoAn-main/api-gateway/src/index.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 5020;
const PREFIX = (process.env.API_PREFIX || '/api').replace(/\/$/, '');

app.use((req, _res, next) => {
  console.log('[gateway] incoming', req.method, req.url);
  next();
});

// Ensure CORS headers and reply to preflight (OPTIONS) locally
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // If browser preflight, respond immediately
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ---------- AUTH ----------
app.use(
  `${PREFIX}/auth`,
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://auth-service:5001',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // gốc: /api/auth/login
      // req.url trong proxy: "/login"
      const newPath = '/auth' + req.url;       // -> /auth/login
      console.log('[gateway] rewrite', path, '->', newPath);
      return newPath;
    },
  })
);

// ---------- RESTAURANT ----------
app.use(
  `${PREFIX}/restaurant`,
  createProxyMiddleware({
    target: process.env.RESTAURANT_SERVICE_URL || 'http://restaurant-service:5002',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // gốc: /api/restaurant/api/restaurants
      // req.url trong proxy: "/api/restaurants"
      const newPath = '/restaurant' + req.url; // -> /restaurant/api/restaurants
      console.log('[gateway] rewrite', path, '->', newPath);
      return newPath;
    },
  })
);

// ---------- ORDER ----------
app.use(
  `${PREFIX}/orders`,
  createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL || 'http://order-service:5003',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // ví dụ: /api/orders/restaurant?restaurantId=...
      // req.url: "/restaurant?restaurantId=..."
      const newPath = '/order' + req.url;      // -> /order/restaurant?...
      console.log('[gateway] rewrite', path, '->', newPath);
      return newPath;
    },
  })
);

// ---------- DELIVERY ----------
app.use(
  `${PREFIX}/delivery`,
  createProxyMiddleware({
    target: process.env.DELIVERY_SERVICE_URL || 'http://delivery-service:5004',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      const newPath = '/delivery' + req.url;
      console.log('[gateway] rewrite', path, '->', newPath);
      return newPath;
    },
  })
);

// ---------- NOTIFICATIONS ----------
app.use(
  `${PREFIX}/notifications`,
  createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5006',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      const newPath = '/notifications' + req.url; // lưu ý "notifications" số nhiều
      console.log('[gateway] rewrite', path, '->', newPath);
      return newPath;
    },
  })
);

// ---------- PAYMENT ----------
app.use(
  `${PREFIX}/payment`,
  createProxyMiddleware({
    target: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:5008',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      const newPath = '/payment' + req.url;
      console.log('[gateway] rewrite', path, '->', newPath);
      return newPath;
    },
  })
);

// ---------- UPLOADS ----------
app.use(
  `${PREFIX}/uploads`,
  createProxyMiddleware({
    target: process.env.RESTAURANT_SERVICE_URL || 'http://restaurant-service:5002',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      const newPath = '/uploads' + req.url;
      console.log('[gateway] rewrite', path, '->', newPath);
      return newPath;
    },
  })
);

app.use(helmet());
app.use(cors());
app.use(morgan('tiny'));

app.listen(PORT, () => {
  console.log(`API Gateway running on :${PORT} with prefix '${PREFIX}'`);
});
