const express = require('express');
const router = express.Router();
const { MessagingResponse } = require('twilio').twiml;
const scheduler = require('../services/scheduler');




router.post('/', async (req, res) => {
  const incomingMsg = req.body.Body?.toLowerCase() || '';
  const from = req.body.From;

  //START changes for twilio, after response 1 is not working, changing to msg.body
  const twiml = new MessagingResponse();
  twiml.message(response);
 //END changes for twilio, after response 1 is not working, changing to msg.body
  console.log('📥 Incoming message:', incomingMsg);

  let response = '';
  
  if (incomingMsg.includes('hi') || incomingMsg.includes('hello')) {
    response =
      `👋 Welcome to Arlington Steamers Carpet Cleaning!\n\n` +
      `How can we help you today?\n` +
      `1️⃣ Book Appointment\n` +
      `2️⃣ View Monthly Specials\n` +
      `3️⃣ Request Free Quote\n` +
      `4️⃣ Customer Reviews\n\n` +
      `👉 Reply with a number (1-4).`;

// Step 2: Book appointment via keyword
  } else if (incomingMsg.includes('book') || incomingMsg === '1') {
    const slots = scheduler.getAvailableSlots();
    response =
      `📅 Available time slots:\n` +
      `${slots.join('\n')}\n\n` +
      `📲 Reply with your preferred time (e.g., "Book 10am Monday")`;

  // Step 3: Cleaning products
  } else if (incomingMsg === '2') {
    response =
      `🧼 Our Monthly Specials:\n` +
     'https://www.arlingtonsteamers.com/price-list-and-monthly-specials';
  // Step 4: Request Free Quote
  } else if (incomingMsg === '3') {
    response =
      `🖼️ Request Free Quote:\n` +
      `https://www.arlingtonsteamers.com/free-quote`;

  // Step 5: Customer Reviews
  } else if (incomingMsg === '4') {
    response =
      `⭐ Customer Reviews:\n` +
      `• "Absolutely amazing job!" – Sarah\n` +
      `• "Super clean and fast service." – James\n` +
      `• "Will book again!" – Steve`;

  // Step 6: Try to book based on freeform input
  } else {
    const bookingInfo = scheduler.bookSlot(incomingMsg, from);
    response = bookingInfo.success
      ? `✅ Appointment booked for ${bookingInfo.slot} with ${bookingInfo.worker}`
      : bookingInfo.message;
  }
  twiml.message(response);
  res.set('Content-Type', 'text/xml');
  res.send(`<Response><Message>${response}</Message></Response>`);
});

module.exports = router;
