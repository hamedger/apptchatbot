// routes/appointments.js
const express = require('express');
const router = express.Router();
const moment = require('moment');
const database = require('../services/database');
const logger = require('../services/logger');

// GET /api/appointments - list all appointments
router.get('/', async (req, res) => {
  try {
    const appointments = await database.query(`
      SELECT * FROM appointments 
      ORDER BY appointment_date DESC 
      LIMIT 100
    `);
    
    // Transform database data to frontend format
    const transformedAppointments = appointments.map(appt => ({
      id: appt.id,
      customer_name: appt.customer_name || appt.name || 'Unknown',
      phone: appt.phone || appt.phone_number || 'Unknown',
      email: appt.email || 'Unknown',
      address: appt.address || 'Unknown',
      areas: appt.areas || 'Unknown',
      pet_issue: appt.pet_issue || appt.petIssue || 'Unknown',
      appointment_date: appt.appointment_date || appt.slot || new Date().toISOString(),
      service: appt.service || 'Steam Cleaning',
      status: appt.status || 'Pending',
      worker: appt.worker || 'Unassigned',
      notes: appt.notes || '',
      created_at: appt.created_at || new Date().toISOString()
    }));
    
    logger.info(`Retrieved ${transformedAppointments.length} appointments`);
    return res.json(transformedAppointments);
  } catch (err) {
    logger.error('Error reading appointments:', err);
    return res.status(500).json({ error: 'Failed to read appointments' });
  }
});

// GET /api/appointments/stats - get appointment statistics
router.get('/stats', async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    
    const [totalResult, todayResult, pendingResult, confirmedResult] = await Promise.all([
      database.get('SELECT COUNT(*) as count FROM appointments'),
      database.get('SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_date) = ?', [today]),
      database.get('SELECT COUNT(*) as count FROM appointments WHERE status = ? OR status IS NULL', ['Pending']),
      database.get('SELECT COUNT(*) as count FROM appointments WHERE status = ?', ['Confirmed'])
    ]);
    
    const stats = {
      total: totalResult?.count || 0,
      today: todayResult?.count || 0,
      pending: pendingResult?.count || 0,
      confirmed: confirmedResult?.count || 0
    };
    
    logger.info('Retrieved appointment statistics:', stats);
    return res.json(stats);
  } catch (err) {
    logger.error('Error reading appointment stats:', err);
    return res.status(500).json({ error: 'Failed to read appointment statistics' });
  }
});

// POST /api/appointments - create new appointment (for admin use)
router.post('/', async (req, res) => {
  try {
    const { 
      customer_name, 
      phone, 
      email, 
      address, 
      areas, 
      pet_issue, 
      appointment_date, 
      service, 
      worker, 
      notes 
    } = req.body;
    
    if (!customer_name || !phone || !appointment_date) {
      return res.status(400).json({ 
        error: 'customer_name, phone, and appointment_date are required' 
      });
    }
    
    const result = await database.run(`
      INSERT INTO appointments (
        customer_name, phone, email, address, areas, pet_issue, 
        appointment_date, service, worker, notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      customer_name, phone, email || '', address || '', areas || '', 
      pet_issue || '', appointment_date, service || 'Steam Cleaning', 
      worker || 'Unassigned', notes || '', 'Pending'
    ]);
    
    const newAppointment = {
      id: result.lastID,
      customer_name,
      phone,
      email,
      address,
      areas,
      pet_issue,
      appointment_date,
      service,
      worker,
      notes,
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    
    logger.info('Created new appointment:', newAppointment);
    return res.status(201).json(newAppointment);
  } catch (err) {
    logger.error('Error creating appointment:', err);
    return res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PUT /api/appointments/:id - update appointment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (['customer_name', 'phone', 'email', 'address', 'areas', 'pet_issue', 
           'appointment_date', 'service', 'worker', 'notes', 'status'].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(id);
    
    const result = await database.run(`
      UPDATE appointments 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, values);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    logger.info(`Updated appointment ${id}`);
    return res.json({ message: 'Appointment updated successfully' });
  } catch (err) {
    logger.error('Error updating appointment:', err);
    return res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// DELETE /api/appointments/:id - delete appointment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await database.run('DELETE FROM appointments WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    logger.info(`Deleted appointment ${id}`);
    return res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    logger.error('Error deleting appointment:', err);
    return res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

module.exports = router;
