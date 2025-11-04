const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async ({ to, subject, text }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };
