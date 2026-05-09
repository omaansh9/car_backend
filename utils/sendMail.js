const nodemailer = require('nodemailer');

const EMAIL_USER = "omaansh9@gmail.com";
const EMAIL_PASS = "zpxltwfeycissagn";
const EMAIL_SERVICE = process.env.EMAIL_SERVICE;
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587;
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';

const createTransporter = async () => {
  if (EMAIL_USER && EMAIL_PASS) {
    const transportConfig = {
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    };

    if (EMAIL_SERVICE) {
      transportConfig.service = EMAIL_SERVICE;
    } else {
      transportConfig.host = EMAIL_HOST || 'smtp.gmail.com';
      transportConfig.port = EMAIL_PORT;
      transportConfig.secure = EMAIL_SECURE;
    }

    try {
      const transporter = nodemailer.createTransport(transportConfig);
      await transporter.verify();
      return transporter;
    } catch (error) {
      console.error('Configured email transport failed, falling back to Ethereal:', error);
    }
  }

  const testAccount = await nodemailer.createTestAccount();
  console.warn('EMAIL_USER / EMAIL_PASS not configured or invalid. Using Ethereal test account:', testAccount.user);

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
}

const sendMail = async (to, subject, html) => {
  try {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: EMAIL_USER ? EMAIL_USER : 'LuxeDrive <no-reply@luxedrive.test>',
      to,
      subject,
      html
    });

    console.log('Email sent successfully to', to);
    if (!EMAIL_USER) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

module.exports = sendMail;