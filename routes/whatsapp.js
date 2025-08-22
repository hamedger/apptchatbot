const express = require('express');
const router = express.Router();
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const scheduler = require('../services/scheduler');
const session = require('../services/session');
const notifyAdmin = require('../services/notifyAdmin');

/**
 * WhatsApp Bot with Interactive Buttons
 * 
 * Features:
 * - Interactive button responses for main menu
 * - Quick reply buttons for common options
 * - Yes/No buttons for pet issue question
 * - Time slot selection via interactive list
 * - Address quick replies for common areas
 * - Room configuration quick replies
 * - Back to menu and start over functionality
 * 
 * Button IDs:
 * - book_appointment, monthly_specials, free_quote, customer_reviews
 * - pet_issue_yes, pet_issue_no
 * - address_arlington, address_alexandria, address_fairfax
 * - areas_small, areas_medium, areas_large
 * - slot_0, slot_1, slot_2, etc.
 * - back_to_menu, start_over
 */

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
      
      // Simple text-based menu
      twiml.message(
        `👋 Welcome to Arlington Steamers Carpet Cleaning!\n\n` +
        `Name: ${details.name}\n\n` +
        `How can we help you today?\n` +
        `1️⃣ Book Appointment\n` +
        `2️⃣ View Monthly Specials\n` +
        `3️⃣ Request Free Quote\n` +
        `4️⃣ Customer Reviews\n\n` +
        `👉 Reply with a number (1-4).`
      );
      twiml.media('https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=256,fit=crop,q=95/YD06RG7wOPS5XbLz/img_8016-YbNq0nwyrWCzKj3z.png');
      return res.type('text/xml').send(twiml.toString());
    }

    // 2. Book appointment (option 1) - Handle button responses
    if (incomingMsg === '1' || incomingMsg.toLowerCase().includes('book') || incomingMsg === 'book_appointment') {
      session.updateSession(from, 'step', 'phone');
      twiml.message("📞 Please enter your phone number:");
      return res.type('text/xml').send(twiml.toString());
    }

    if (userState.step === 'phone') {
      session.updateSession(from, 'phone', incomingMsg);
      session.updateSession(from, 'step', 'address');
      
      // Temporarily use simple text message instead of interactive buttons
      twiml.message("🏠 Please enter your address (# street, city)\nExample: 1234 Wayne Drive, San Francisco");
      return res.type('text/xml').send(twiml.toString());
    }

    if (userState.step === 'address') {
      let address = incomingMsg;
      
      // Handle address quick replies
      if (incomingMsg === 'address_arlington') {
        address = 'Arlington, VA';
      } else if (incomingMsg === 'address_alexandria') {
        address = 'Alexandria, VA';
      } else if (incomingMsg === 'address_fairfax') {
        address = 'Fairfax, VA';
      }
      
      session.updateSession(from, 'address', address);
      session.updateSession(from, 'step', 'email');
      
      twiml.message("📧 Please enter your email:");
      return res.type('text/xml').send(twiml.toString());
    }

    if (userState.step === 'email') {
      session.updateSession(from, 'email', incomingMsg);
      session.updateSession(from, 'step', 'areas');
      
      // Temporarily use simple text message instead of interactive buttons
      twiml.message("🧼 How many rooms, stairs, or hallways to clean?\nExample: 5 rooms, 2 stairs, 1 hallway");
      return res.type('text/xml').send(twiml.toString());
    }

    if (userState.step === 'areas') {
      let areas = incomingMsg;
      
      // Handle areas quick replies
      if (incomingMsg === 'areas_small') {
        areas = '2-3 rooms, 1 hallway';
      } else if (incomingMsg === 'areas_medium') {
        areas = '4-6 rooms, 1-2 hallways, 1 stair';
      } else if (incomingMsg === 'areas_large') {
        areas = '7+ rooms, 2+ hallways, 2+ stairs';
      }
      
      session.updateSession(from, 'areas', areas);
      session.updateSession(from, 'step', 'petIssue');
      
      // Temporarily use simple text message instead of interactive buttons
      twiml.message("🐶 Any pet urine issue? (Yes/No)");
      return res.type('text/xml').send(twiml.toString());
    }

    if (userState.step === 'petIssue') {
      console.log('🔍 Processing petIssue step:', { from, incomingMsg, currentStep: userState.step });
      session.updateSession(from, 'petIssue', incomingMsg);
      session.updateSession(from, 'step', 'slot');
      console.log('🔍 Updated step to slot, new session:', session.getSession(from));
      
      // Show weekly availability overview first
      const weeklyData = scheduler.getWeeklyAvailability();
      
      // Simple text-based weekly availability
      let availabilityText = `📅 Great! Thank you.\n\n📅 Here's our availability for this week:\n\n`;
      weeklyData.forEach((day, index) => {
        availabilityText += `${index + 1}. ${day.day} (${day.date})\n`;
        availabilityText += `   🌅 Morning: 8AM-12PM | ☀️ Afternoon: 12PM-4PM | 🌆 Evening: 4PM-6PM\n\n`;
      });
      availabilityText += `👉 Reply with the day number (1-${weeklyData.length}) to select a day.`;
      
      twiml.message(availabilityText);
      return res.type('text/xml').send(twiml.toString());
    }

    // Handle day selection
    if (userState.step === 'slot' && !isNaN(incomingMsg) && parseInt(incomingMsg) > 0) {
      const dayIndex = parseInt(incomingMsg) - 1; // Convert 1-based to 0-based
      const weeklyData = scheduler.getWeeklyAvailability();
      const selectedDay = weeklyData[dayIndex];
      
      if (selectedDay) {
        // Store selected day in session
        session.updateSession(from, 'selectedDay', selectedDay.day);
        session.updateSession(from, 'step', 'timeSelection');
        
        // Show time slots for the selected day in text format
        let timeSlotsText = `📅 ${selectedDay.day} (${selectedDay.date})\n\n⏰ Available time slots:\n\n`;
        
        timeSlotsText += `🌅 Morning (8AM - 12PM):\n`;
        selectedDay.morning.forEach((time, index) => {
          timeSlotsText += `   ${index + 1}. ${time}\n`;
        });
        
        timeSlotsText += `\n☀️ Afternoon (12PM - 4PM):\n`;
        selectedDay.afternoon.forEach((time, index) => {
          timeSlotsText += `   ${index + 1}. ${time}\n`;
        });
        
        timeSlotsText += `\n🌆 Evening (4PM - 6PM):\n`;
        selectedDay.evening.forEach((time, index) => {
          timeSlotsText += `   ${index + 1}. ${time}\n`;
        });
        
        timeSlotsText += `\n👉 Reply with your preferred time (e.g., "9:00 AM" or "2:30 PM")`;
        
        twiml.message(timeSlotsText);
        return res.type('text/xml').send(twiml.toString());
      }
    }

    // Handle time slot selection from day view
    if (userState.step === 'timeSelection') {
      // Parse the time input (e.g., "9:00 AM", "2:30 PM")
      const timeInput = incomingMsg.trim();
      
      // Auto-book the selected slot
      const selectedDay = session.getSession(from).selectedDay;
      const selectedSlot = `${selectedDay} ${timeInput}`;
      
      const result = await scheduler.bookSlot(`Book ${selectedSlot}`, from);
      
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
          
          // Notify admin
          try {
            await notifyAdmin({
              ...details,
              slot: result.slot,
              worker: result.worker
            });
            console.log('✅ Admin notification sent');
          } catch (error) {
            console.error('❌ Failed to notify admin:', error);
          }
          
          // Clear session
          session.clearSession(from);
          
          const msg = twiml.message(
            `🎉 *Appointment Confirmed!*\n\n` +
            `📅 Date & Time: ${result.slot}\n` +
            `👷 Worker: ${result.worker}\n` +
            `👤 Name: ${details.name}\n` +
            `📞 Phone: ${details.phone}\n` +
            `🏠 Address: ${details.address}\n` +
            `📧 Email: ${details.email}\n` +
            `🧼 Areas: ${details.areas}\n` +
            `🐶 Pet Issue: ${details.petIssue}\n\n` +
            `✅ Your appointment has been booked successfully!\n\n` +
            `We'll send you a confirmation shortly. Thank you for choosing Arlington Steamers! 🧼✨`
          );
          
          return res.type('text/xml').send(twiml.toString());
          
        } catch (error) {
          console.error('Error saving appointment to database:', error);
          twiml.message("❌ Sorry, there was an error booking your appointment. Please try again or contact support.");
          return res.type('text/xml').send(twiml.toString());
        }
      } else {
        twiml.message(`❌ Sorry, that slot is no longer available. Please try another time.`);
        return res.type('text/xml').send(twiml.toString());
      }
    }

    // Handle back to days request
    if (userState.step === 'timeSelection' && incomingMsg.toLowerCase().includes('back') || incomingMsg.toLowerCase().includes('different')) {
      session.updateSession(from, 'step', 'slot');
      const weeklyData = scheduler.getWeeklyAvailability();
      
      // Simple text-based weekly availability
      let availabilityText = `📅 Here's our availability for this week:\n\n`;
      weeklyData.forEach((day, index) => {
        availabilityText += `${index + 1}. ${day.day} (${day.date})\n`;
        availabilityText += `   🌅 Morning: 8AM-12PM | ☀️ Afternoon: 12PM-4PM | 🌆 Evening: 4PM-6PM\n\n`;
      });
      availabilityText += `👉 Reply with the day number (1-${weeklyData.length}) to select a day.`;
      
      twiml.message(availabilityText);
      return res.type('text/xml').send(twiml.toString());
    }

    // 3. Handle final booking (legacy text input)
    console.log('🔍 Checking booking condition:', { step: userState.step, message: incomingMsg, startsWithBook: incomingMsg.toLowerCase().startsWith('book') });
    if (userState.step === 'slot' && incomingMsg.toLowerCase().startsWith('book')) {
      const result = await scheduler.bookSlot(incomingMsg, from);
      
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
          console.log('✅ Admin notification sent');
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

    // 4. Handle menu options (text responses)
    if (incomingMsg === 'monthly_specials' || incomingMsg === '2') {
      twiml.message(
        `🧼 Our Monthly Specials:\n` +
        `https://www.arlingtonsteamers.com/price-list-and-monthly-specials\n\n` +
        `👉 Reply with 1 to book an appointment, or say 'hi' to start over.`
      );
      return res.type('text/xml').send(twiml.toString());
    }
    
    if (incomingMsg === 'free_quote' || incomingMsg === '3') {
      twiml.message(
        `🖼️ Request Free Quote:\n` +
        `https://www.arlingtonsteamers.com/free-quote\n\n` +
        `👉 Reply with 1 to book an appointment, or say 'hi' to start over.`
      );
      return res.type('text/xml').send(twiml.toString());
    }
    
    if (incomingMsg === 'customer_reviews' || incomingMsg === '4') {
      twiml.message(
        `⭐ Customer Reviews:\n` +
        `• "Absolutely amazing job!" – Sarah\n` +
        `• "Super clean and fast service." – James\n` +
        `• "Will book again!" – Steve\n\n` +
        `👉 Reply with 1 to book an appointment, or say 'hi' to start over.`
      );
      return res.type('text/xml').send(twiml.toString());
    }
    
    // Handle back to menu request
    if (incomingMsg === 'back_to_menu' || incomingMsg.toLowerCase().includes('menu')) {
      const details = session.getSession(from);
      
      // Simple text-based menu
      twiml.message(
        `👋 Welcome back to Arlington Steamers Carpet Cleaning!\n\n` +
        `Name: ${details.name}\n\n` +
        `How can we help you today?\n` +
        `1️⃣ Book Appointment\n` +
        `2️⃣ View Monthly Specials\n` +
        `3️⃣ Request Free Quote\n` +
        `4️⃣ Customer Reviews\n\n` +
        `👉 Reply with a number (1-4).`
      );
      return res.type('text/xml').send(twiml.toString());
    }
    
    // Handle start over request
    if (incomingMsg === 'start_over' || incomingMsg.toLowerCase().includes('start over')) {
      // Clear session and start fresh
      session.clearSession(from);
      session.updateSession(from, 'step', 'name');
      
      twiml.message("👋 Hello! Welcome to Arlington Steamers Carpet Cleaning.\nWhat is your *name*?");
      twiml.media('https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=256,fit=crop,q=95/YD06RG7wOPS5XbLz/img_8016-YbNq0rWCzKj3z.png');
      return res.type('text/xml').send(twiml.toString());
    }

    // 5. Handle thanks
    if (incomingMsg.toLowerCase().includes('thanks') || incomingMsg.toLowerCase().includes('thank you')) {
      twiml.message('You\'re very welcome! It\'s my pleasure helping you set up the appointment.');
      return res.type('text/xml').send(twiml.toString());
    }

    // 6. Default fallback - show menu again
    console.log('🔍 Fallback condition:', { step: userState.step, stepNotStart: userState.step !== 'start' });
    if (userState.step !== 'start') {
      session.updateSession(from, 'step', 'menu');
      const details = session.getSession(from);
      twiml.message(
        `👋 Welcome back to Arlington Steamers!\n\n` +
        `Name: ${details.name}\n\n` +
        `How can we help you today?\n` +
        `1️⃣ Book Appointment\n` +
        `2️⃣ View Monthly Specials\n` +
        `3️⃣ Request Free Quote\n` +
        `4️⃣ Customer Reviews\n\n` +
        `👉 Reply with a number (1-4).`
      );
      twiml.media('https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=256,fit=crop,q=95/YD06RG7wOPS5XbLz/img_8016-YbNq0nwyrWCzKj3z.png');
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
  
