import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

const AdminCalendar = () => {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('📦 Loading appointments...');

  useEffect(() => {
    fetch('/api/appointments')
      .then(res => res.json())
      .then(data => {
        const formatted = data.map(appt => ({
          title: `${appt.name} - ${appt.worker}`,
          start: new Date(appt.startTime),
          end: new Date(appt.endTime),
          allDay: false,
        }));
        setEvents(formatted);
        setStatus(`✅ Loaded ${formatted.length} appointments`);
      })
      .catch(err => {
        console.error(err);
        setStatus('❌ Failed to load appointments');
      });
  }, []);

  return (
    <div style={{ height: '80vh', padding: '20px' }}>
      <h2 className="text-xl font-bold mb-2">📅 Booking Calendar</h2>
      <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>{status}</p>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView="week"
        views={['month', 'week', 'day']}
        style={{ height: 600 }}
      />
    </div>
  );
};

export default AdminCalendar;
