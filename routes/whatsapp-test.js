const express = require('express');
const router = express.Router();
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const session = require('../services/session');

/**
 * Simple & Reliable WhatsApp Bot
 * Basic appointment booking without complex features
 */

router.post('/', async (req, res) => {
  try {
    console.log('🔍 WhatsApp bot called');
    
    const incomingRaw = req.body.Body || '';
    const incomingMsg = incomingRaw.trim();
    const from = req.body.From;
    
    console.log('📥 Incoming:', { from, message: incomingMsg });
    
    const twiml = new MessagingResponse();
    
    // Get or create user session
    let userState = await session.getSession(from) || { step: 'start' };
    console.log('🔄 User step:', userState.step);
    
    // 1. Start conversation
    if (incomingMsg.toLowerCase().includes('hi') || incomingMsg.toLowerCase().includes('hello')) {
      await session.updateSession(from, 'step', 'name');
      twiml.message("👋 Hello! Welcome to Arlington Steamers Carpet Cleaning.\n\nWhat is your *name*?");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 2. Handle name
    if (userState.step === 'name') {
      await session.updateSession(from, 'name', incomingMsg);
      await session.updateSession(from, 'step', 'phone');
      twiml.message(`Nice to meet you, ${incomingMsg}! 📞 Please enter your phone number:`);
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 3. Handle phone
    if (userState.step === 'phone') {
      await session.updateSession(from, 'phone', incomingMsg);
      await session.updateSession(from, 'step', 'address');
      twiml.message("🏠 Please enter your address (street, city, state):");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 4. Handle address
    if (userState.step === 'address') {
      await session.updateSession(from, 'address', incomingMsg);
      await session.updateSession(from, 'step', 'email');
      twiml.message("📧 Please enter your email address:");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 5. Handle email
    if (userState.step === 'email') {
      await session.updateSession(from, 'email', incomingMsg);
      await session.updateSession(from, 'step', 'areas');
      twiml.message("🧼 How many rooms/areas need cleaning?\nExample: 3 bedrooms, 2 bathrooms, 1 living room");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 6. Handle areas
    if (userState.step === 'areas') {
      await session.updateSession(from, 'areas', incomingMsg);
      await session.updateSession(from, 'step', 'petIssue');
      twiml.message("🐶 Any pet urine issues? (Yes/No)");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 7. Handle pet issue
    if (userState.step === 'petIssue') {
      await session.updateSession(from, 'petIssue', incomingMsg);
      await session.updateSession(from, 'step', 'confirmation');
      
      const details = await session.getSession(from);
      
      const summary = `📋 *Appointment Summary*\n\n` +
        `👤 Name: ${details.name}\n` +
        `📞 Phone: ${details.phone}\n` +
        `🏠 Address: ${details.address}\n` +
        `📧 Email: ${details.email}\n` +
        `🧼 Areas: ${details.areas}\n` +
        `🐶 Pet Issues: ${details.petIssue}\n\n` +
        `✅ Reply 'CONFIRM' to book this appointment, or 'RESTART' to start over.`;
      
      twiml.message(summary);
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 8. Handle confirmation
    if (userState.step === 'confirmation') {
      if (incomingMsg.toLowerCase().includes('confirm')) {
        const details = await session.getSession(from);
        
        // Save to database
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
            'To be scheduled',
            'To be assigned',
            details.name,
            details.phone,
            details.email,
            details.address,
            details.areas,
            details.petIssue,
            'pending'
          ]);
          
          console.log('✅ Appointment saved to database:', appointmentId);
          
          // Clear session
          await session.clearSession(from);
          
          twiml.message(
            `🎉 *Appointment Request Received!*\n\n` +
            `Your appointment request has been submitted successfully.\n\n` +
            `📞 We'll contact you within 24 hours to schedule your appointment.\n\n` +
            `Thank you for choosing Arlington Steamers! 🧼✨`
          );
          
          return res.type('text/xml').send(twiml.toString());
          
        } catch (error) {
          console.error('Error saving appointment:', error);
          twiml.message("❌ Sorry, there was an error saving your appointment. Please try again or contact us directly.");
          return res.type('text/xml').send(twiml.toString());
        }
      } else if (incomingMsg.toLowerCase().includes('restart')) {
        await session.clearSession(from);
        await session.updateSession(from, 'step', 'name');
        twiml.message("🔄 Starting over...\n\nWhat is your *name*?");
        return res.type('text/xml').send(twiml.toString());
      } else {
        twiml.message("Please reply 'CONFIRM' to book the appointment or 'RESTART' to start over.");
        return res.type('text/xml').send(twiml.toString());
      }
    }
    
    // 9. Handle special commands
    if (incomingMsg.toLowerCase().includes('menu') || incomingMsg.toLowerCase().includes('help')) {
      const details = await session.getSession(from);
      if (details.name) {
        twiml.message(
          `👋 Welcome back, ${details.name}!\n\n` +
          `Current step: ${userState.step}\n\n` +
          `Say 'RESTART' to start over, or continue with your current step.`
        );
      } else {
        twiml.message("👋 Say 'hi' to start booking an appointment!");
      }
      return res.type('text/xml').send(twiml.toString());
    }
    
    if (incomingMsg.toLowerCase().includes('restart') || incomingMsg.toLowerCase().includes('start over')) {
      await session.clearSession(from);
      await session.updateSession(from, 'step', 'name');
      twiml.message("🔄 Starting fresh...\n\nWhat is your *name*?");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 10. Default fallback
    if (userState.step === 'start') {
      twiml.message("👋 Say 'hi' to start booking your carpet cleaning appointment!");
    } else {
      twiml.message("I didn't understand that. Please continue with your current step or say 'RESTART' to start over.");
    }
    
    return res.type('text/xml').send(twiml.toString());
    
  } catch (error) {
    console.error('❌ Error in WhatsApp bot:', error);
    const twiml = new MessagingResponse();
    twiml.message("I'm sorry, something went wrong. Please say 'hi' to start over.");
    return res.type('text/xml').send(twiml.toString());
  }
});

router.get('/', (req, res) => {
  res.send('WhatsApp bot is working - Simple & Reliable!');
});

module.exports = router;
