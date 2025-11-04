const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const notifyRoutes = require('./routes/notify');
app.use('/notify', notifyRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Notification Service running on port ${process.env.PORT}`);
});
