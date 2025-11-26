// server.js (payment-service) — BẢN CHUẨN
require('dotenv').config();                 // ➊ PHẢI đứng đầu tiên

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log('[payment-service]', req.method, req.url);
  next();
});

// ➋ Kết nối Mongo chỉ làm ở đây (đừng connect trong routes)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ➌ CHỈ require routes SAU KHI dotenv đã nạp
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/payment', paymentRoutes);

const PORT = process.env.PORT || 5008;
app.listen(PORT, () => {
  console.log(`💳 Payment service running on port ${PORT}`);
});
