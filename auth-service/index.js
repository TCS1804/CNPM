const express = require('express');
const { connect } = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User'); // 👈 thêm

const app = express();
app.use(cors());
app.use(express.json());

connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Auth DB connected');

    // ⚙️ Tạo admin mặc định (CHỈ KHI được bật qua env)
    // By default this is disabled. To enable automatic creation set
    // CREATE_DEFAULT_ADMIN=true in the auth-service .env (only for local/dev).
    const shouldCreateAdmin = String(process.env.CREATE_DEFAULT_ADMIN || 'false').toLowerCase() === 'true';
    if (shouldCreateAdmin) {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

      let admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        const hashed = await bcrypt.hash(adminPassword, 10);
        admin = await User.create({
          username: adminUsername,
          password: hashed,
          role: 'admin',
          verified: true,
        });
        console.log('✅ Default admin created:', adminUsername);
      } else {
        console.log('✅ Admin already exists:', admin.username);
      }
    } else {
      console.log('ℹ️ Default admin creation is disabled. Set CREATE_DEFAULT_ADMIN=true to enable.');
    }
  })
  .catch(err => console.error('Mongo Error:', err));

const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const adminRoutes = require('./routes/admin');
app.use('/auth/admin', adminRoutes);

const profileRoutes = require('./routes/profile');
app.use('/auth/profile', profileRoutes);

// ⚠️ Chỉ nên listen 1 lần
app.listen(process.env.PORT, () => {
  console.log(`Auth Service running on port ${process.env.PORT}`);
});
