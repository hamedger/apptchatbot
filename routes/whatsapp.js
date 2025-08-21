const express = require('express');
const router = express.Router();
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const scheduler = require('../services/scheduler');
const session = require('../services/session');
const notifyAdmin = require('../services/notifyAdmin');

//router starts here 
router.post('/', async (req, res) => {
  try {
    const incomingRaw = req.body.Body || '';
    const incomingMsg = incomingRaw.trim();
    const from = req.body.From; // Example: 'whatsapp:+1234567890'
    const twiml = new MessagingResponse();  

    if (!from) {
      console.error('❌ No sender information received');
      return res.status(400).send('Missing sender information');
    }

    let userState = session.getSession(from) || { step: 'start' };

    console.log(`📥 Incoming from ${from}: "${incomingRaw}"`);
    console.log(`🔄 User step: ${userState.step}`);
    console.log(`🔍 Session key: "${from}", Session data:`, userState);
    console.log(`🔍 Raw session data for key "${from}":`, session.getAllSessions());
    
    // 0. Reset flow if user says hi or hello
    if (incomingMsg.toLowerCase().includes('hi') || incomingMsg.toLowerCase().includes('hello')) {
      session.updateSession(from, 'step', 'name');
      const msg = twiml.message("👋 Hello! Welcome to Arlington Steamers Carpet Cleaning.\nWhat is your *name*?");
      msg.media('https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=256,fit=crop,q=95/YD06RG7wOPS5XbLz/img_8016-YbNq0nwyrWCzKj3z.png');
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 1. Save name and show menu
    if (userState.step === 'name') {
      session.updateSession(from, 'name', incomingMsg);
      session.updateSession(from, 'step', 'menu');
      
      const details = session.getSession(from);
      const msg = twiml.message(
        `👋 Welcome to Arlington Steamers Carpet Cleaning!\n\n` +
        `Name: ${details.name}\n\n` +
        `How can we help you today?\n` +
        `1️⃣ Book Appointment\n` +
        `2️⃣ View Monthly Specials\n` +
        `3️⃣ Request Free Quote\n` +
        `4️⃣ Customer Reviews\n\n` +
        `👉 Reply with a number (1-4).`
      );
      msg.media('https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=256,fit=crop,q=95/YD06RG7wOPS5XbLz/img_8016-YbNq0nwyrWCzKj3z.png');
      return res.type('text/xml').send(twiml.toString());
    }

    // 2. Book appointment (option 1)
    if (incomingMsg === '1' || incomingMsg.toLowerCase().includes('book')) {
      session.updateSession(from, 'step', 'phone');
      twiml.message("📞 Please enter your phone number:");
      return res.type('text/xml').send(twiml.toString());
    }

    if (userState.step === 'phone') {
      session.updateSession(from, 'phone', incomingMsg);
      session.updateSession(from, 'step', 'address');
      twiml.message("🏠 Please enter your address (# street, city)\nExample: 1234 Wayne Drive, San Francisco");
      return res.type('text/xml').send(twiml.toString());
    }

    if (userState.step === 'address') {
      session.updateSession(from, 'address', incomingMsg);
      session.updateSession(from, 'step', 'email');
      twiml.message("📧 Please enter your email:");
      return res.type('text/xml').send(twiml.toString());
    }

    if (userState.step === 'email') {
      session.updateSession(from, 'email', incomingMsg);
      session.updateSession(from, 'step', 'areas');
      twiml.message("🧼 How many rooms, stairs, or hallways to clean?\nExample: 5 rooms, 2 stairs, 1 hallway");
      return res.type('text/xml').send(twiml.toString());
    }

    if (userState.step === 'areas') {
      session.updateSession(from, 'areas', incomingMsg);
      session.updateSession(from, 'step', 'petIssue');
      twiml.message("🐶 Any *pet urine issue*? (Yes/No)");
      return res.type('text/xml').send(twiml.toString());
    }

    if (userState.step === 'petIssue') {
      console.log('🔍 Processing petIssue step:', { from, incomingMsg, currentStep: userState.step });
      session.updateSession(from, 'petIssue', incomingMsg);
      session.updateSession(from, 'step', 'slot');
      console.log('🔍 Updated step to slot, new session:', session.getSession(from));
      
      const slots = scheduler.getAvailableSlots();
      twiml.message(
        `📅 Great! Thank you.\n\n` +
        `📅 Please enter your preferred *time and day*:\n\n` +
        `Available slots:\n${slots.slice(0, 3).join('\n')}\n\n` +
        `Format: "Book 10am Monday" or "Book 2:30pm Tuesday"`
      );
      return res.type('text/xml').send(twiml.toString());
    }

    // 3. Handle final booking
    console.log('🔍 Checking booking condition:', { step: userState.step, message: incomingMsg, startsWithBook: incomingMsg.toLowerCase().startsWith('book') });
    if (userState.step === 'slot' && incomingMsg.toLowerCase().startsWith('book')) {
      const result = scheduler.bookSlot(incomingMsg, from);
      
      if (result.success) {
        const details = session.getSession(from);
        
        // Add slot and worker to session for admin notification
        session.updateSession(from, 'slot', result.slot);
        session.updateSession(from, 'worker', result.worker);
        
        // Save appointment to database
        try {
          const database = require('../services/database');
          const appointmentId = `appt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          await database.run(`
            INSERT INTO appointments (
              id, user, slot, worker, name, phone, email, address, areas, petIssue, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `, [
            appointmentId,
            from,
            result.slot,
            result.worker,
            details.name,
            details.phone,
            details.email,
            details.address,
            details.areas,
            details.petIssue,
            'confirmed'
          ]);
          
          console.log('✅ Appointment saved to database:', appointmentId);
        } catch (error) {
          console.error('❌ Failed to save appointment to database:', error);
        }
        
        const msg = twiml.message(
          `✅ *Booking Confirmed!*\n\n` +
          `📅 Date: ${result.slot}\n` +
          `👷 Worker: ${result.worker}\n\n` +
          `📌 Summary:\n` +
          `• Name: ${details.name}\n` +
          `• Phone: ${details.phone}\n` +
          `• Email: ${details.email}\n` +
          `• Address: ${details.address}\n` +
          `• Areas: ${details.areas}\n` +
          `• Pet Issue: ${details.petIssue}\n\n` +
          `We'll contact you to confirm your appointment. Thank you!`
        );

        // Notify admin
        try {
          await notifyAdmin({
            ...details,
            slot: result.slot,
            worker: result.worker
          });
        } catch (error) {
          console.error('Failed to notify admin:', error);
        }

        session.clearSession(from);
        return res.type('text/xml').send(twiml.toString());
      } else {
        const slots = scheduler.getAvailableSlots();
        twiml.message(
          `❌ ${result.message}\n\n` +
          `📅 Available time slots:\n` +
          `${slots.slice(0, 3).join('\n')}\n\n` +
          `📲 Reply with your preferred time (e.g., "Book 10am Monday")`
        );
        return res.type('text/xml').send(twiml.toString());
      }
    }

    // 4. Handle thanks
    if (incomingMsg.toLowerCase().includes('thanks') || incomingMsg.toLowerCase().includes('thank you')) {
      twiml.message('You\'re very welcome! It\'s my pleasure helping you set up the appointment.');
      return res.type('text/xml').send(twiml.toString());
    }

    // 5. Specials, Quote, Reviews
    if (incomingMsg === '2') {
      twiml.message(`🧼 Our Monthly Specials:\nhttps://www.arlingtonsteamers.com/price-list-and-monthly-specials`);
      return res.type('text/xml').send(twiml.toString());
    }

    if (incomingMsg === '3') {
      twiml.message(`🖼️ Request Free Quote:\nhttps://www.arlingtonsteamers.com/free-quote`);
      return res.type('text/xml').send(twiml.toString());
    }

    if (incomingMsg === '4') {
      twiml.message(`⭐ Customer Reviews:\n• "Absolutely amazing job!" – Sarah\n• "Super clean and fast service." – James\n• "Will book again!" – Steve`);
      return res.type('text/xml').send(twiml.toString());
    }

    // 6. Default fallback - show menu again
    console.log('🔍 Fallback condition:', { step: userState.step, stepNotStart: userState.step !== 'start' });
    if (userState.step !== 'start') {
      session.updateSession(from, 'step', 'menu');
      const details = session.getSession(from);
      const msg = twiml.message(
        `👋 Welcome back to Arlington Steamers!\n\n` +
        `Name: ${details.name}\n\n` +
        `How can we help you today?\n` +
        `1️⃣ Book Appointment\n` +
        `2️⃣ View Monthly Specials\n` +
        `3️⃣ Request Free Quote\n` +
        `4️⃣ Customer Reviews\n\n` +
        `👉 Reply with a number (1-4).`
      );
      msg.media('https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=256,fit=crop,q=95/YD06RG7wOPS5XbLz/img_8016-YbNq0nwyrWCzKj3z.png');
      return res.type('text/xml').send(twiml.toString());
    }

    // If we get here, something went wrong
    twiml.message("I'm sorry, I didn't understand that. Please say 'hi' to start over.");
    return res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error('❌ Error in WhatsApp webhook:', error);
    const twiml = new MessagingResponse();
    twiml.message("I'm sorry, something went wrong. Please try again or contact support.");
    return res.type('text/xml').send(twiml.toString());
  }
});

router.get('/', (req, res) => {
  res.send('WhatsApp webhook is working');
});

module.exports = router;
  
