// order-service/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

FRONTEND_ORIGIN='http://localhost:5173'


app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Order DB connected'))
  .catch(err => console.error('Mongo Error:', err));

const orderRoutes = require('./routes/order');
app.use('/order', orderRoutes);

const PORT = process.env.PORT || 5030;
app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
});
