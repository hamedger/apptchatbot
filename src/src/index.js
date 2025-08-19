import React from 'react';
import { createRoot } from 'react-dom/client';
import AdminCalendar from './AdminCalendar';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<AdminCalendar />);


