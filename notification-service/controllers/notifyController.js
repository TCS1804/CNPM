const { sendEmail } = require('../services/email');
const { sendSMS } = require('../services/sms');

exports.email = async (req, res) => {
  try {
    await sendEmail(req.body);
    res.json({ message: 'Email sent' });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Email failed' });
  }
};

exports.sms = async (req, res) => {
  try {
    await sendSMS(req.body);
    res.json({ message: 'SMS sent' });
  } catch (e) {
    res.status(500).json({ message: e.message || 'SMS failed' });
  }
};
