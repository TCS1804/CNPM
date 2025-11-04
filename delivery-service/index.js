const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const deliveryRoutes = require('./routes/delivery');
app.use('/delivery', deliveryRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Delivery Service running on port ${process.env.PORT}`);
});
