const moment = require('moment');
const fs = require('fs');

const workers = ['Firdaya', 'Arnold', 'Samir'];

function getAvailableSlots() {
  const start = moment().hour(8).minute(0);
  const end = moment().hour(17).minute(0);
  let slots = [];

  while (start < end) {
    slots.push(start.format('YYYY-MM-DD HH:mm'));
    start.add(1, 'hour');
  }

  const booked = getAppointments().map(a => a.slot);
  return slots.filter(s => !booked.includes(s));
}

function assignWorker(slot) {
  const appointments = getAppointments().filter(a => a.slot === slot);
  const usedWorkers = appointments.map(a => a.worker);
  return workers.find(w => !usedWorkers.includes(w)) || workers[0];
}

function getAppointments() {
  const db = JSON.parse(fs.readFileSync('./db.json'));
  return db.appointments;
}

module.exports = { getAvailableSlots, assignWorker };
