const express = require('express');
const router = express.Router();
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const scheduler = require('../services/scheduler');
const session = require('../services/session');
const notifyAdmin = require('../services/notifyAdmin');

/**
 * Simplified WhatsApp Bot - Text-Based Only
 * 
 * Features:
 * - Simple text-based conversation flow
 * - No interactive buttons or lists
 * - Proper async session handling
 * - Clean, reliable booking process
 */

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

    // Get user session with proper async handling
    let userState = await session.getSession(from) || { step: 'start' };

    console.log(`📥 Incoming from ${from}: "${incomingRaw}"`);
    console.log(`🔄 User step: ${userState.step}`);
    console.log(`🔍 Session data:`, userState);
    
    // 0. Reset flow if user says hi or hello
    if (incomingMsg.toLowerCase().includes('hi') || incomingMsg.toLowerCase().includes('hello')) {
      await session.updateSession(from, 'step', 'name');
      const msg = twiml.message("👋 Hello! Welcome to Arlington Steamers Carpet Cleaning.\nWhat is your *name*?");
      msg.media('https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=256,fit=crop,q=95/YD06RG7wOPS5XbLz/img_8016-YbNq0nwyrWCzKj3z.png');
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 1. Save name and show menu
    if (userState.step === 'name') {
      await session.updateSession(from, 'name', incomingMsg);
      await session.updateSession(from, 'step', 'menu');
      
      const details = await session.getSession(from);
      
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

    // 2. Book appointment (option 1)
    if (incomingMsg === '1' || incomingMsg.toLowerCase().includes('book') || incomingMsg === 'book_appointment') {
      await session.updateSession(from, 'step', 'phone');
      twiml.message("📞 Please enter your phone number:");
      return res.type('text/xml').send(twiml.toString());
    }

    // 3. Handle phone number
    if (userState.step === 'phone') {
      await session.updateSession(from, 'phone', incomingMsg);
      await session.updateSession(from, 'step', 'address');
      
      twiml.message("🏠 Please enter your address (# street, city)\nExample: 1234 Wayne Drive, Arlington, VA");
      return res.type('text/xml').send(twiml.toString());
    }

    // 4. Handle address
    if (userState.step === 'address') {
      let address = incomingMsg;
      
      // Handle common area shortcuts
      if (incomingMsg.toLowerCase().includes('arlington')) {
        address = 'Arlington, VA';
      } else if (incomingMsg.toLowerCase().includes('alexandria')) {
        address = 'Alexandria, VA';
      } else if (incomingMsg.toLowerCase().includes('fairfax')) {
        address = 'Fairfax, VA';
      }
      
      await session.updateSession(from, 'address', address);
      await session.updateSession(from, 'step', 'email');
      
      twiml.message("📧 Please enter your email:");
      return res.type('text/xml').send(twiml.toString());
    }

    // 5. Handle email
    if (userState.step === 'email') {
      await session.updateSession(from, 'email', incomingMsg);
      await session.updateSession(from, 'step', 'areas');
      
      twiml.message("🧼 How many rooms, stairs, or hallways to clean?\nExample: 5 rooms, 2 stairs, 1 hallway");
      return res.type('text/xml').send(twiml.toString());
    }

    // 6. Handle areas
    if (userState.step === 'areas') {
      let areas = incomingMsg;
      
      // Handle common configurations
      if (incomingMsg.toLowerCase().includes('small') || incomingMsg.includes('2-3')) {
        areas = '2-3 rooms, 1 hallway';
      } else if (incomingMsg.toLowerCase().includes('medium') || incomingMsg.includes('4-6')) {
        areas = '4-6 rooms, 1-2 hallways, 1 stair';
      } else if (incomingMsg.toLowerCase().includes('large') || incomingMsg.includes('7+')) {
        areas = '7+ rooms, 2+ hallways, 2+ stairs';
      }
      
      await session.updateSession(from, 'areas', areas);
      await session.updateSession(from, 'step', 'petIssue');
      
      twiml.message("🐶 Any pet urine issue? (Yes/No)");
      return res.type('text/xml').send(twiml.toString());
    }

    // 7. Handle pet issue
    if (userState.step === 'petIssue') {
      console.log('🔍 Processing petIssue step:', { from, incomingMsg, currentStep: userState.step });
      await session.updateSession(from, 'petIssue', incomingMsg);
      await session.updateSession(from, 'step', 'slot');
      console.log('🔍 Updated step to slot');
      
      // Show weekly availability overview
      const weeklyData = scheduler.getWeeklyAvailability();
      
      let availabilityText = `📅 Great! Thank you.\n\n📅 Here's our availability for this week:\n\n`;
      weeklyData.forEach((day, index) => {
        availabilityText += `${index + 1}. ${day.day} (${day.date})\n`;
        availabilityText += `   🌅 Morning: 8AM-12PM | ☀️ Afternoon: 12PM-4PM | 🌆 Evening: 4PM-6PM\n\n`;
      });
      availabilityText += `👉 Reply with the day number (1-${weeklyData.length}) to select a day.`;
      
      twiml.message(availabilityText);
      return res.type('text/xml').send(twiml.toString());
    }

    // 8. Handle day selection
    if (userState.step === 'slot' && !isNaN(incomingMsg) && parseInt(incomingMsg) > 0) {
      const dayIndex = parseInt(incomingMsg) - 1; // Convert 1-based to 0-based
      const weeklyData = scheduler.getWeeklyAvailability();
      const selectedDay = weeklyData[dayIndex];
      
      if (selectedDay) {
        // Store selected day in session
        await session.updateSession(from, 'selectedDay', selectedDay.day);
        await session.updateSession(from, 'step', 'timeSelection');
        
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

    // 9. Handle time slot selection
    if (userState.step === 'timeSelection') {
      // Parse the time input (e.g., "9:00 AM", "2:30 PM")
      const timeInput = incomingMsg.trim();
      
      // Auto-book the selected slot
      const selectedDay = (await session.getSession(from)).selectedDay;
      const selectedSlot = `${selectedDay} ${timeInput}`;
      
      const result = await scheduler.bookSlot(`Book ${selectedSlot}`, from);
      
      if (result.success) {
        const details = await session.getSession(from);
        
        // Add slot and worker to session for admin notification
        await session.updateSession(from, 'slot', result.slot);
        await session.updateSession(from, 'worker', result.worker);
        
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
          await session.clearSession(from);
          
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

    // 10. Handle menu options (text responses)
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
    
    // 11. Handle special commands
    if (incomingMsg.toLowerCase().includes('menu') || incomingMsg === 'back_to_menu') {
      const details = await session.getSession(from);
      
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
    
    if (incomingMsg.toLowerCase().includes('start over') || incomingMsg === 'start_over') {
      // Clear session and start fresh
      await session.clearSession(from);
      await session.updateSession(from, 'step', 'name');
      
      twiml.message("👋 Hello! Welcome to Arlington Steamers Carpet Cleaning.\nWhat is your *name*?");
      twiml.media('https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=256,fit=crop,q=95/YD06RG7wOPS5XbLz/img_8016-YbNq0rWCzKj3z.png');
      return res.type('text/xml').send(twiml.toString());
    }

    // 12. Handle thanks
    if (incomingMsg.toLowerCase().includes('thanks') || incomingMsg.toLowerCase().includes('thank you')) {
      twiml.message('You\'re very welcome! It\'s my pleasure helping you set up the appointment.');
      return res.type('text/xml').send(twiml.toString());
    }

    // 13. Default fallback - show menu again
    console.log('🔍 Fallback condition:', { step: userState.step, stepNotStart: userState.step !== 'start' });
    if (userState.step !== 'start') {
      await session.updateSession(from, 'step', 'menu');
      const details = await session.getSession(from);
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
