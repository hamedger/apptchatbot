const moment = require('moment');
const database = require('./database');

const workers = ['Alice', 'Bob', 'Charlie'];

function getAvailableSlots() {
  // Generate available slots for the next 7 days
  const slots = [];
  const startDate = moment().startOf('day');
  
  for (let i = 0; i < 7; i++) {
    const currentDate = startDate.clone().add(i, 'days');
    const dayName = currentDate.format('dddd');
    
    // Skip weekends for now (can be made configurable)
    if (dayName === 'Saturday' || dayName === 'Sunday') continue;
    
    // Generate time slots from 8am to 6pm
    for (let hour = 8; hour <= 18; hour++) {
      const timeSlot = moment(currentDate).hour(hour).minute(0);
      const formattedTime = timeSlot.format('h:mmA');
      const slot = `${dayName} ${formattedTime}`;
      slots.push(slot);
    }
  }
  
  return slots;
}

async function bookSlot(message, user) {
  try {
    // Parse the booking message
    const slotMatch = message.match(/(\d{1,2}(:\d{2})?\s*(am|pm))\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);

    if (!slotMatch) {
      return { 
        success: false, 
        message: 'Invalid format. Please use format: "Book 10am Monday" or "Book 2:30pm Tuesday"' 
      };
    }

    // Extract and validate time and day
    const timeStr = slotMatch[1].trim();
    const period = slotMatch[3].toLowerCase();
    const day = slotMatch[4].toLowerCase();

    // Validate time format
    const timeRegex = /^(\d{1,2})(:(\d{2}))?\s*(am|pm)$/i;
    const timeMatch = timeStr.match(timeRegex);
    
    if (!timeMatch) {
      return { 
        success: false, 
        message: 'Invalid time format. Please use format: "10am" or "2:30pm"' 
      };
    }

    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
    
    // Convert to 24-hour format
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    
    // Validate business hours (8am - 6pm)
    if (hour < 8 || hour > 18) {
      return { 
        success: false, 
        message: 'Business hours are 8am - 6pm. Please choose a time within these hours.' 
      };
    }

    // Capitalize first letter of day
    const dayFormatted = day.charAt(0).toUpperCase() + day.slice(1);
    
    // Format time consistently
    const timeFormatted = `${hour}:${minute.toString().padStart(2, '0')}${period}`;
    
    const slot = `${dayFormatted} ${timeFormatted}`; // e.g., "Monday 10:00am"

    // Check if slot already booked in database
    const existing = await database.get(`
      SELECT COUNT(*) as count FROM appointments WHERE slot = ?
    `, [slot]);
    
    if (existing.count > 0) {
      return { 
        success: false, 
        message: `Slot ${slot} is already booked. Please try another time.` 
      };
    }

    // Assign worker round-robin
    const workerCount = await database.get(`
      SELECT COUNT(*) as count FROM appointments
    `);
    const worker = workers[workerCount.count % workers.length];

    return { success: true, slot, worker };
    
  } catch (error) {
    console.error('Error in bookSlot:', error);
    return { 
      success: false, 
      message: 'An error occurred while booking. Please try again.' 
    };
  }
}

module.exports = {
  getAvailableSlots,
  bookSlot
};

