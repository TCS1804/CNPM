// restaurant-service/index.js
const express = require('express');
const { connect } = require('mongoose');
const cors = require('cors');
const fileUpload = require('express-fileupload');
require('dotenv').config();

const app = express();
const path = require('path');
const fs = require('fs');

// Middleware
app.use(cors());

// static serve for uploaded images
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

app.use(express.json());
app.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/' }));

// MongoDB connection
connect(process.env.MONGO_URI)
  .then(() => console.log('Restaurant DB connected'))
  .catch((err) => console.error('Mongo Error:', err));

// Routes
const restaurantRoutes = require('./routes/restaurant');
app.use('/restaurant', restaurantRoutes);

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Restaurant Service running on port ${PORT}`);
});
