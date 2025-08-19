const moment = require('moment');
const fs = require('fs');
const path = require('path');

const workers = ['Alice', 'Bob', 'Charlie'];
const appointmentsPath = path.join(__dirname, '../data/appointments.json');

function bookSlot(message, user) {
  try {
    // Read appointments inside function
    const appointments = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'));

    // Improved slot parsing with better regex
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

    // Check if slot already booked
    const existing = appointments.find(a => 
      a.slot.toLowerCase() === slot.toLowerCase()
    );
    
    if (existing) {
      return { 
        success: false, 
        message: `Slot ${slot} is already booked. Please try another time.` 
      };
    }

    // Assign worker round-robin
    const worker = workers[appointments.length % workers.length];

    // Add new appointment
    const newAppointment = { 
      user, 
      slot, 
      worker,
      timestamp: new Date().toISOString()
    };
    
    appointments.push(newAppointment);

    // Save back to file
    fs.writeFileSync(appointmentsPath, JSON.stringify(appointments, null, 2));

    return { success: true, slot, worker };
    
  } catch (error) {
    console.error('Error in bookSlot:', error);
    return { 
      success: false, 
      message: 'An error occurred while booking. Please try again.' 
    };
  }
}

function getAvailableSlots() {
  try {
    const appointments = JSON.parse(fs.readFileSync(appointmentsPath, 'utf8'));

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const times = ['8:00am', '9:00am', '10:00am', '11:00am', '12:00pm', '1:00pm', '2:00pm', '3:00pm', '4:00pm', '5:00pm', '6:00pm'];

    const availability = [];

    for (const day of days) {
      const slots = times.map(time => {
        const slot = `${day} ${time}`;
        const isBooked = appointments.some(a => 
          a.slot.toLowerCase() === slot.toLowerCase()
        );
        return ` - ${time} ${isBooked ? '❌' : '✅'}`;
      });

      availability.push(`🗓 ${day}:\n${slots.join('\n')}`);
    }

    return availability; // Array of formatted strings per day
  } catch (error) {
    console.error('Error in getAvailableSlots:', error);
    return ['❌ Unable to load available slots'];
  }
}

function isBookingRequest(message) {
  // Improved check to see if message contains "book" and time/day indicators
  return /book/i.test(message) && /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(message);
}

module.exports = { bookSlot, getAvailableSlots, isBookingRequest };

