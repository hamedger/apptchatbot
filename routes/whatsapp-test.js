const express = require('express');
const router = express.Router();
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const session = require('../services/session');
const scheduler = require('../services/scheduler');
const notifyAdmin = require('../services/notifyAdmin');

/**
 * Enhanced WhatsApp Bot - Fast, Smart, & Reliable
 * Features: Quick responses, time slot booking, admin notifications
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
    
    // 1. Start conversation - FAST & CLEAR
    if (incomingMsg.toLowerCase().includes('hi') || incomingMsg.toLowerCase().includes('hello')) {
      await session.updateSession(from, 'step', 'name');
      twiml.message("👋 Welcome to Arlington Steamers!\n\n📝 What's your name?");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 2. Handle name - QUICK & FRIENDLY
    if (userState.step === 'name') {
      await session.updateSession(from, 'name', incomingMsg);
      await session.updateSession(from, 'step', 'phone');
      twiml.message(`👍 Hi ${incomingMsg}! 📱 What's your phone number?`);
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 3. Handle phone - FAST & CLEAR
    if (userState.step === 'phone') {
      await session.updateSession(from, 'phone', incomingMsg);
      await session.updateSession(from, 'step', 'address');
      twiml.message("🏠 What's your address? (Street, City, State)");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 4. Handle address - QUICK & HELPFUL
    if (userState.step === 'address') {
      await session.updateSession(from, 'address', incomingMsg);
      await session.updateSession(from, 'step', 'email');
      twiml.message("📧 What's your email address?");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 5. Handle email - FAST & SIMPLE
    if (userState.step === 'email') {
      await session.updateSession(from, 'email', incomingMsg);
      await session.updateSession(from, 'step', 'rooms');
      twiml.message("🏠 How many rooms need cleaning? (e.g., 3 bedrooms, 2 bathrooms, 1 living room)");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 6. Handle rooms - QUICK & CLEAR
    if (userState.step === 'rooms') {
      await session.updateSession(from, 'rooms', incomingMsg);
      await session.updateSession(from, 'step', 'hallways');
      twiml.message("🚪 How many hallways need cleaning? (e.g., 2 hallways, 1 entryway)");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 7. Handle hallways - FAST & HELPFUL
    if (userState.step === 'hallways') {
      await session.updateSession(from, 'hallways', incomingMsg);
      await session.updateSession(from, 'step', 'stairways');
      twiml.message("🪜 How many stairways need cleaning? (e.g., 1 staircase, 0 if none)");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 8. Handle stairways - QUICK & TO THE POINT
    if (userState.step === 'stairways') {
      await session.updateSession(from, 'stairways', incomingMsg);
      await session.updateSession(from, 'step', 'petIssue');
      twiml.message("🐶 Any pet urine issues? (Yes/No)");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 9. Handle pet issue - FAST & TO THE POINT
    if (userState.step === 'petIssue') {
      await session.updateSession(from, 'petIssue', incomingMsg);
      await session.updateSession(from, 'step', 'timeSlots');
      
      // Show weekly availability with time slots
      const weeklyData = scheduler.getWeeklyAvailability();
      
      let timeSlotsText = `📅 Great! Here's our availability this week:\n\n`;
      weeklyData.forEach((day, index) => {
        timeSlotsText += `${index + 1}. ${day.day} (${day.date})\n`;
        timeSlotsText += `   🌅 8AM-12PM | ☀️ 12PM-4PM | 🌆 4PM-6PM\n\n`;
      });
      timeSlotsText += `👉 Reply with day number (1-${weeklyData.length}) to see time slots.`;
      
      twiml.message(timeSlotsText);
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 10. Handle day selection - SMART & CLEAR
    if (userState.step === 'timeSlots' && !isNaN(incomingMsg) && parseInt(incomingMsg) > 0) {
      const dayIndex = parseInt(incomingMsg) - 1;
      const weeklyData = scheduler.getWeeklyAvailability();
      const selectedDay = weeklyData[dayIndex];
      
      if (selectedDay) {
        await session.updateSession(from, 'selectedDay', selectedDay.day);
        await session.updateSession(from, 'step', 'timeSelection');
        
        let timeSlotsText = `⏰ ${selectedDay.day} (${selectedDay.date}) - Available times:\n\n`;
        
        timeSlotsText += `🌅 Morning (8AM-12PM):\n`;
        selectedDay.morning.forEach((time, index) => {
          timeSlotsText += `   ${index + 1}. ${time}\n`;
        });
        
        timeSlotsText += `\n☀️ Afternoon (12PM-4PM):\n`;
        selectedDay.afternoon.forEach((time, index) => {
          timeSlotsText += `   ${index + 1}. ${time}\n`;
        });
        
        timeSlotsText += `\n🌆 Evening (4PM-6PM):\n`;
        selectedDay.evening.forEach((time, index) => {
          timeSlotsText += `   ${index + 1}. ${time}\n`;
        });
        
        timeSlotsText += `\n👉 Reply with your preferred time (e.g., "9:00 AM", "2:30 PM", or "1pm")`;
        
        twiml.message(timeSlotsText);
        return res.type('text/xml').send(twiml.toString());
      }
    }
    
    // 11. Handle time selection - SMART BOOKING
    if (userState.step === 'timeSelection') {
      const timeInput = incomingMsg.trim();
      const selectedDay = (await session.getSession(from)).selectedDay;
      
      // Convert time input to the format scheduler expects (e.g., "9:00 AM" -> "9am")
      let formattedTime = timeInput;
      
      // Handle various time formats and convert to simple format
      if (timeInput.match(/^\d{1,2}:\d{2}\s*(am|pm)$/i)) {
        // Format: "9:00 AM" -> "9am"
        const timeMatch = timeInput.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          const minute = parseInt(timeMatch[2]);
          const period = timeMatch[3].toLowerCase();
          
          if (minute === 0) {
            formattedTime = `${hour}${period}`; // "9am"
          } else {
            formattedTime = `${hour}:${minute.toString().padStart(2, '0')}${period}`; // "9:30am"
          }
        }
      } else if (timeInput.match(/^\d{1,2}\s*(am|pm)$/i)) {
        // Format: "9 AM" -> "9am"
        const timeMatch = timeInput.match(/^(\d{1,2})\s*(am|pm)$/i);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          const period = timeMatch[2].toLowerCase();
          formattedTime = `${hour}${period}`; // "9am"
        }
      }
      
      // Create the booking message in the format scheduler expects
      const bookingMessage = `Book ${formattedTime} ${selectedDay}`;
      console.log('Booking message:', bookingMessage);
      
      // Try to book the selected slot
      const result = await scheduler.bookSlot(bookingMessage, from);
      
      if (result.success) {
        const details = await session.getSession(from);
        
        // Save appointment to database with actual time slot
        try {
          const database = require('../services/database');
          const appointmentId = `appt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          await database.run(`
            INSERT INTO appointments (
              id, user, slot, worker, name, phone, email, address, rooms, hallways, stairways, petIssue, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `, [
            appointmentId,
            from,
            result.slot,
            result.worker,
            details.name,
            details.phone,
            details.email,
            details.address,
            details.rooms,
            details.hallways,
            details.stairways,
            details.petIssue,
            'confirmed'
          ]);
          
          console.log('✅ Appointment saved to database:', appointmentId);
          
          // FIXED: Send admin notification via WhatsApp
          try {
            await notifyAdmin({
              name: details.name,
              phone: details.phone,
              email: details.email,
              address: details.address,
              rooms: details.rooms,
              hallways: details.hallways,
              stairways: details.stairways,
              petIssue: details.petIssue,
              slot: result.slot,
              worker: result.worker
            });
            console.log('✅ Admin notification sent via WhatsApp');
          } catch (error) {
            console.error('❌ Failed to notify admin:', error);
          }
          
          // Clear session
          await session.clearSession(from);
          
          // SUCCESS MESSAGE - CLEAR & EXCITING
          const msg = twiml.message(
            `🎉 *APPOINTMENT CONFIRMED!*\n\n` +
            `📅 Date & Time: ${result.slot}\n` +
            `👷 Worker: ${result.worker}\n\n` +
            `✅ Your carpet cleaning is booked!\n\n` +
            `📞 We'll call to confirm details.\n` +
            `Thank you for choosing Arlington Steamers! 🧼✨`
          );
          
          return res.type('text/xml').send(twiml.toString());
          
        } catch (error) {
          console.error('Error saving appointment:', error);
          twiml.message("❌ Sorry, there was an error. Please try again or call us directly.");
          return res.type('text/xml').send(twiml.toString());
        }
      } else {
        // Slot not available - show alternatives
        twiml.message(`❌ ${result.message}\n\n💡 Try another time or day. Say 'RESTART' to choose a different day.`);
        return res.type('text/xml').send(twiml.toString());
      }
    }
    
    // 12. Handle special commands - FAST & HELPFUL
    if (incomingMsg.toLowerCase().includes('menu') || incomingMsg.toLowerCase().includes('help')) {
      const details = await session.getSession(from);
      if (details.name) {
        twiml.message(
          `👋 Hi ${details.name}!\n\n` +
          `📍 Current step: ${userState.step}\n\n` +
          `💡 Say 'RESTART' to start over`
        );
      } else {
        twiml.message("👋 Say 'hi' to book your appointment!");
      }
      return res.type('text/xml').send(twiml.toString());
    }
    
    if (incomingMsg.toLowerCase().includes('restart') || incomingMsg.toLowerCase().includes('start over')) {
      await session.clearSession(from);
      await session.updateSession(from, 'step', 'name');
      twiml.message("🔄 Starting fresh...\n\n📝 What's your name?");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 13. Default fallback - HELPFUL & CLEAR
    if (userState.step === 'start') {
      twiml.message("👋 Say 'hi' to book your carpet cleaning appointment!");
    } else {
      twiml.message("❓ I didn't understand that. Continue with your current step or say 'RESTART' to start over.");
    }
    
    return res.type('text/xml').send(twiml.toString());
    
  } catch (error) {
    console.error('❌ Error in WhatsApp bot:', error);
    const twiml = new MessagingResponse();
    twiml.message("😔 Something went wrong. Please say 'hi' to start over.");
    return res.type('text/xml').send(twiml.toString());
  }
});

router.get('/', (req, res) => {
  res.send('WhatsApp bot is working - Fast, Smart & Reliable! 🚀');
});

module.exports = router;
