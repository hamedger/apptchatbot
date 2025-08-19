const twilio = require('twilio');
const logger = require('./logger');

/**
 * Sends an admin notification via WhatsApp using Twilio.
 * Expects the following env vars to be set at runtime:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER (e.g., whatsapp:+14155238886)
 * - ADMIN_WHATSAPP_NUMBER (e.g., whatsapp:+1234567890)
 */
async function notifyAdmin(appointment) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !adminNumber) {
    logger.warn('Missing Twilio env vars. Skipping admin notification.');
    return { skipped: true };
  }

  const client = twilio(accountSid, authToken);

  const {
    name = 'N/A',
    phone = 'N/A',
    email = 'N/A',
    address = 'N/A',
    areas = 'N/A',
    petIssue = 'N/A',
    slot = 'N/A',
    worker = 'N/A'
  } = appointment || {};

  const body = [
    'New booking confirmed ✅',
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `Address: ${address}`,
    `Areas: ${areas}`,
    `Pet Issue: ${petIssue}`,
    `Date: ${slot}`,
    `Worker: ${worker}`
  ].join('\n');

  try {
    const res = await client.messages.create({
      from: fromNumber,
      to: adminNumber,
      body
    });
    logger.info('Admin notified via WhatsApp', { sid: res.sid });
    return { success: true, sid: res.sid };
  } catch (error) {
    logger.error('Failed to notify admin via WhatsApp', { error: error.message });
    return { success: false, error: error.message };
  }
}

module.exports = notifyAdmin;


