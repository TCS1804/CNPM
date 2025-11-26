const express = require('express');
const { connect } = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); 
app.use(express.json());

connect(process.env.MONGO_URI)
  .then(() => console.log('Auth DB connected'))
  .catch(err => console.error('Mongo Error:', err));

const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Auth Service running on port ${process.env.PORT}`);
});

const profileRoutes = require('./routes/profile');
app.use('/auth/profile', profileRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Auth Service running on port ${process.env.PORT}`);
});