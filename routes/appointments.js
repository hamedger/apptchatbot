// routes/appointments.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const moment = require('moment');

// Use the same data file as the WhatsApp bot
const APPOINTMENTS_PATH = path.join(__dirname, '..', 'data', 'appointments.json');

async function readAppointments() {
  try {
    const raw = await fs.readFile(APPOINTMENTS_PATH, 'utf-8');
    const appointments = JSON.parse(raw || '[]');
    return appointments;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeAppointments(appointments) {
  await fs.writeFile(APPOINTMENTS_PATH, JSON.stringify(appointments, null, 2), 'utf-8');
}

// GET /api/appointments - list all appointments
router.get('/', async (req, res) => {
  try {
    const appointments = await readAppointments();
    
    // Transform WhatsApp bot data to frontend format
    const transformedAppointments = appointments.map(appt => {
      // Parse the slot to get date and time
      const slotMatch = appt.slot.match(/(\w+)\s+(\d{1,2}(:\d{2})?\s*(am|pm))/i);
      let startTime, endTime;
      
      if (slotMatch) {
        const day = slotMatch[1];
        const time = slotMatch[2];
        
        // Convert to next occurrence of that day
        const now = moment();
        let targetDate = moment().day(day);
        if (targetDate.isBefore(now)) {
          targetDate.add(1, 'week');
        }
        
        // Parse time and set to target date
        const timeStr = time.replace(/\s+/g, '');
        const parsedTime = moment(timeStr, ['h:mma', 'h:mm a', 'ha', 'h a'], true);
        
        if (parsedTime.isValid()) {
          targetDate.hour(parsedTime.hour());
          targetDate.minute(parsedTime.minute());
          startTime = targetDate.toISOString();
          endTime = targetDate.add(2, 'hours').toISOString(); // 2-hour slot
        }
      }
      
      return {
        id: appt.user || `appt_${Date.now()}`,
        startTime: startTime || new Date().toISOString(),
        endTime: endTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        title: `Appointment - ${appt.worker || 'Unassigned'}`,
        metadata: {
          name: appt.name || 'Unknown',
          phone: appt.phone || 'Unknown',
          email: appt.email || 'Unknown',
          address: appt.address || 'Unknown',
          areas: appt.areas || 'Unknown',
          petIssue: appt.petIssue || 'Unknown',
          slot: appt.slot || 'Unknown',
          worker: appt.worker || 'Unassigned',
          user: appt.user || 'Unknown'
        }
      };
    });
    
    return res.json(transformedAppointments);
  } catch (err) {
    console.error('Error reading appointments:', err);
    return res.status(500).json({ error: 'Failed to read appointments' });
  }
});

// POST /api/appointments - create new appointment (for admin use)
router.post('/', async (req, res) => {
  try {
    const { startTime, endTime, title, metadata } = req.body;
    
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime required' });
    }
    
    const appointments = await readAppointments();
    const newAppointment = {
      user: `admin_${Date.now()}`,
      slot: `${moment(startTime).format('dddd h:mma')}`,
      worker: metadata?.worker || 'Unassigned',
      name: metadata?.name || 'Admin Created',
      phone: metadata?.phone || 'N/A',
      email: metadata?.email || 'N/A',
      address: metadata?.address || 'N/A',
      areas: metadata?.areas || 'N/A',
      petIssue: metadata?.petIssue || 'N/A'
    };
    
    appointments.push(newAppointment);
    await writeAppointments(appointments);
    
    return res.status(201).json(newAppointment);
  } catch (err) {
    console.error('Error creating appointment:', err);
    return res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// DELETE /api/appointments/:id - delete appointment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const appointments = await readAppointments();
    
    const filteredAppointments = appointments.filter(appt => appt.user !== id);
    
    if (filteredAppointments.length === appointments.length) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    await writeAppointments(filteredAppointments);
    return res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    return res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

module.exports = router;
