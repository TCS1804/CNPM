// auth-service/utils/mailer.js
const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
} else {
  console.warn(
    '[mailer] SMTP config is missing. Emails will be logged to console instead of being sent.'
  );
}

async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    console.log('==== DEV EMAIL (not actually sent) ====');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    console.log('HTML:', html);
    console.log('======================================');
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      text,
      html,
    });

    console.log('[mailer] Email sent:', info && info.messageId);
    // If using Ethereal or other test transports, nodemailer may provide a preview URL
    try {
      const preview = require('nodemailer').getTestMessageUrl(info);
      if (preview) console.log('[mailer] Preview URL:', preview);
    } catch (e) {
      // ignore
    }
  } catch (err) {
    console.error('[mailer] sendMail error:', err && err.message ? err.message : err);
    // rethrow so callers/controllers can handle/log the error as well
    throw err;
  }
}

module.exports = { sendMail };
