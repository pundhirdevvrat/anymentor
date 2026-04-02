const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const verifyConnection = async () => {
  try {
    await getTransporter().verify();
    logger.info('Email transporter connected successfully');
  } catch (err) {
    logger.warn('Email transporter connection failed:', err.message);
  }
};

module.exports = { getTransporter, verifyConnection };
