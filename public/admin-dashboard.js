// Admin Dashboard JavaScript
console.log('Admin dashboard script loaded');

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard page loaded');
    
    // Check if user is authenticated
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        console.log('No auth token found, redirecting to login');
        window.location.href = '/admin';
        return;
    }
    
    console.log('User authenticated, loading dashboard');
    
    // Initialize event listeners with a small delay to ensure DOM is ready
    setTimeout(() => {
        initializeEventListeners();
    }, 100);
    
    loadDashboardData();
    loadUserInfo();
});

// Load user information
function loadUserInfo() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            document.getElementById('username').textContent = user.username || 'Admin';
        } catch (error) {
            console.error('Error parsing user info:', error);
        }
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        console.log('Loading dashboard data...');
        
        const [appointmentsResponse, statsResponse] = await Promise.all([
            fetch('/api/appointments', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            }),
            fetch('/api/appointments/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            })
        ]);
        
        if (appointmentsResponse.ok) {
            const appointments = await appointmentsResponse.json();
            
            // Store appointments globally for edit function access
            window.currentAppointments = appointments;
            
            displayAppointments(appointments);
        } else {
            console.error('Failed to load appointments:', appointmentsResponse.status);
            if (appointmentsResponse.status === 401) {
                // Token expired, redirect to login
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.location.href = '/admin';
                return;
            }
        }
        
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            displayStats(stats);
        } else {
            console.error('Failed to load stats:', statsResponse.status);
        }
        
        // Load WhatsApp messages
        loadWhatsAppMessages();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('appointmentsTable').innerHTML = 
            '<div class="no-data">❌ Error loading data. Please try again.</div>';
    }
}

// Display appointments in table
function displayAppointments(appointments) {
    const tableContainer = document.getElementById('appointmentsTable');
    
    if (!appointments || appointments.length === 0) {
        tableContainer.innerHTML = '<div class="no-data">📭 No appointments found</div>';
        return;
    }
    
    console.log('Displaying appointments:', appointments.length);
    
    const table = `
        <table class="appointments-table">
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Areas</th>
                    <th>Pet Issue</th>
                    <th>Date & Time</th>
                    <th>Worker</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${appointments.map(app => `
                    <tr>
                        <td>${escapeHtml(app.customer_name || app.name || 'N/A')}</td>
                        <td>${escapeHtml(app.phone || app.phone_number || 'N/A')}</td>
                        <td>${escapeHtml(app.email || 'N/A')}</td>
                        <td>${escapeHtml(app.address || 'N/A')}</td>
                        <td>${escapeHtml(app.areas || 'N/A')}</td>
                        <td>${escapeHtml(app.pet_issue || app.petIssue || 'N/A')}</td>
                        <td>${formatDateTime(app.appointment_date || app.slot)}</td>
                        <td>${escapeHtml(app.worker || 'Unassigned')}</td>
                        <td>
                            <span class="status-badge status-${getStatusClass(app.status)}">
                                ${escapeHtml(app.status || 'Pending')}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-edit" data-appointment-id="${app.id}">✏️ Edit</button>
                                <button class="btn-delete" data-appointment-id="${app.id}">🗑️ Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    tableContainer.innerHTML = table;
    
    // Add event delegation for dynamically generated buttons
    addTableEventListeners();
}

// Display statistics
function displayStats(stats) {
    console.log('Displaying stats:', stats);
    
    document.getElementById('totalAppointments').textContent = stats.total || 0;
    document.getElementById('todayAppointments').textContent = stats.today || 0;
    document.getElementById('pendingAppointments').textContent = stats.pending || 0;
    document.getElementById('confirmedAppointments').textContent = stats.confirmed || 0;
}

// Format date and time
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString();
    } catch (e) {
        return dateString;
    }
}

// Get status class for styling
function getStatusClass(status) {
    if (!status) return 'pending';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('confirm')) return 'confirmed';
    if (lowerStatus.includes('cancel')) return 'cancelled';
    return 'pending';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Refresh appointments
window.refreshAppointments = function() {
    console.log('Refreshing appointments...');
    loadDashboardData();
};

// Edit appointment
window.editAppointment = function(id) {
    console.log('Edit appointment called with ID:', id);
    
    // Find the appointment data
    const appointment = window.currentAppointments.find(app => app.id === id);
    console.log('Found appointment:', appointment);
    
    if (!appointment) {
        alert('Appointment not found!');
        return;
    }
    
    // Check if modal elements exist
    const modal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    
    if (!modal) {
        console.error('Edit modal not found!');
        alert('Edit modal not found. Please refresh the page.');
        return;
    }
    
    if (!editForm) {
        console.error('Edit form not found!');
        alert('Edit form not found. Please refresh the page.');
        return;
    }
    
    console.log('Modal and form found, proceeding...');
    
    // Parse the date and time from the slot
    const slot = appointment.appointment_date || appointment.slot;
    let date = new Date();
    let time = '10:00';
    
    if (slot) {
        // Try to parse the slot format (e.g., "Monday 10:00am", "Tuesday 2:00pm")
        const timeMatch = slot.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
        if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const period = timeMatch[3].toLowerCase();
            
            // Convert to 24-hour format
            if (period === 'pm' && hour !== 12) hour += 12;
            if (period === 'am' && hour === 12) hour = 0;
            
            time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        }
        
        // Set date to next occurrence of the day mentioned
        const dayMatch = slot.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
        if (dayMatch) {
            const dayName = dayMatch[1].toLowerCase();
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDay = days.indexOf(dayName);
            const currentDay = date.getDay();
            const daysToAdd = (targetDay - currentDay + 7) % 7;
            date.setDate(date.getDate() + daysToAdd);
        }
    }
    
    console.log('Setting form values...');
    
    // Populate the form
    document.getElementById('editCustomerName').value = appointment.customer_name || appointment.name || '';
    document.getElementById('editPhone').value = appointment.phone || '';
    document.getElementById('editEmail').value = appointment.email || '';
    document.getElementById('editWorker').value = appointment.worker || 'Alice';
    document.getElementById('editDate').value = date.toISOString().split('T')[0];
    document.getElementById('editTime').value = time;
    document.getElementById('editAddress').value = appointment.address || '';
    document.getElementById('editAreas').value = appointment.areas || '';
    document.getElementById('editPetIssue').value = appointment.pet_issue || appointment.petIssue || 'No';
    document.getElementById('editStatus').value = appointment.status || 'Pending';
    
    // Store the appointment ID for the form submission
    document.getElementById('editForm').dataset.appointmentId = id;
    
    // Show the modal
    console.log('Showing modal...');
    document.getElementById('editModal').style.display = 'block';
    console.log('Modal should now be visible');
}

// Close edit modal
window.closeEditModal = function() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.reset();
    }
}

// Handle form submission
async function handleEditSubmit(event) {
    event.preventDefault();
    
    const appointmentId = event.target.dataset.appointmentId;
    if (!appointmentId) {
        alert('No appointment ID found!');
        return;
    }
    
    try {
        // Get form data
        const formData = {
            name: document.getElementById('editCustomerName').value,
            phone: document.getElementById('editPhone').value,
            email: document.getElementById('editEmail').value,
            worker: document.getElementById('editWorker').value,
            slot: `${document.getElementById('editDate').value} ${document.getElementById('editTime').value}`,
            address: document.getElementById('editAddress').value,
            areas: document.getElementById('editAreas').value,
            petIssue: document.getElementById('editPetIssue').value,
            status: document.getElementById('editStatus').value
        };
        
        console.log('Updating appointment:', appointmentId, formData);
        
        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            console.log('Appointment updated successfully');
            alert('Appointment updated successfully!');
            closeEditModal();
            loadDashboardData(); // Refresh the table
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update appointment');
        }
        
    } catch (error) {
        console.error('Error updating appointment:', error);
        alert(`Error updating appointment: ${error.message}`);
    }
}

// Delete appointment
window.deleteAppointment = async function(id) {
    console.log('Delete appointment called with ID:', id);
    
    if (!confirm('Are you sure you want to delete this appointment?')) {
        console.log('Delete cancelled by user');
        return;
    }
    
    try {
        console.log('Deleting appointment:', id);
        
        const response = await fetch(`/api/appointments/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            console.log('Appointment deleted successfully');
            alert('Appointment deleted successfully!');
            loadDashboardData(); // Refresh the table
        } else {
            console.error('Failed to delete appointment:', response.status);
            alert('Failed to delete appointment. Please try again.');
        }
    } catch (error) {
            console.error('Error deleting appointment:', error);
            alert('Error deleting appointment. Please try again.');
    }
}

// Logout function
window.logout = function() {
    console.log('Logging out...');
    
    // Clear stored data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Redirect to login page
    window.location.href = '/admin';
}

console.log('Dashboard functions loaded');

// Log all globally available functions
console.log('Global functions available:', {
    refreshAppointments: typeof window.refreshAppointments,
    editAppointment: typeof window.editAppointment,
    deleteAppointment: typeof window.deleteAppointment,
    closeEditModal: typeof window.closeEditModal,
    logout: typeof window.logout,
    loadWhatsAppMessages: typeof window.loadWhatsAppMessages,
    viewWhatsAppConversation: typeof window.viewWhatsAppConversation,
    closeWhatsAppModal: typeof window.closeWhatsAppModal
});

// Initialize event listeners
function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // Check if all required elements exist
    const editForm = document.getElementById('editForm');
    const modal = document.getElementById('editModal');
    const editCustomerName = document.getElementById('editCustomerName');
    const editPhone = document.getElementById('editPhone');
    
    console.log('Elements found:', {
        editForm: !!editForm,
        modal: !!modal,
        editCustomerName: !!editCustomerName,
        editPhone: !!editPhone
    });
    
    // Add form submission handler
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
        console.log('Edit form event listener added');
    } else {
        console.warn('Edit form not found');
    }
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeEditModal();
            }
        });
        console.log('Modal click event listener added');
    } else {
        console.warn('Edit modal not found');
    }
    
    // Add event listeners for static buttons
    addStaticButtonListeners();
    
    // Test if modal can be shown
    if (modal) {
        console.log('Modal initial display style:', modal.style.display);
        console.log('Modal computed display style:', window.getComputedStyle(modal).display);
    }
}

// WhatsApp Messages Functions
window.loadWhatsAppMessages = async function() {
    try {
        console.log('Loading WhatsApp messages...');
        
        // For now, we'll create sample data since we don't have a WhatsApp messages API yet
        const sampleMessages = [
            {
                id: 'whatsapp:+1234567890',
                name: 'John Doe',
                phone: '+1234567890',
                lastMessage: 'Hi, I need carpet cleaning',
                timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                status: 'Active',
                messages: [
                    { type: 'user', text: 'Hi, I need carpet cleaning', time: new Date(Date.now() - 3600000) },
                    { type: 'bot', text: 'Hello! Welcome to Arlington Steamers. What is your name?', time: new Date(Date.now() - 3500000) },
                    { type: 'user', text: 'John Doe', time: new Date(Date.now() - 3400000) }
                ]
            },
            {
                id: 'whatsapp:+1987654321',
                name: 'Jane Smith',
                phone: '+1987654321',
                lastMessage: 'What are your rates?',
                timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
                status: 'Active',
                messages: [
                    { type: 'user', text: 'What are your rates?', time: new Date(Date.now() - 7200000) },
                    { type: 'bot', text: 'Our rates start at $99 for basic cleaning. Would you like a quote?', time: new Date(Date.now() - 7100000) }
                ]
            }
        ];
        
        // Store WhatsApp users globally for conversation access
        window.currentWhatsAppUsers = sampleMessages;
        
        displayWhatsAppMessages(sampleMessages);
        
    } catch (error) {
        console.error('Error loading WhatsApp messages:', error);
        document.getElementById('whatsappMessagesTable').innerHTML = 
            '<div class="no-data">❌ Error loading WhatsApp messages. Please try again.</div>';
    }
}

window.displayWhatsAppMessages = function(messages) {
    const tableContainer = document.getElementById('whatsappMessagesTable');
    
    if (!messages || messages.length === 0) {
        tableContainer.innerHTML = '<div class="no-data">📭 No WhatsApp messages found</div>';
        return;
    }
    
    console.log('Displaying WhatsApp messages:', messages.length);
    
    const messagesHtml = messages.map(msg => `
        <div class="whatsapp-message" onclick="viewWhatsAppConversation('${msg.id}')">
            <div class="whatsapp-message-header">
                <div class="whatsapp-user-info">
                    <h4 class="whatsapp-user-name">${escapeHtml(msg.name)}</h4>
                    <p class="whatsapp-user-phone">${escapeHtml(msg.phone)}</p>
                </div>
                <div class="whatsapp-timestamp">${formatDateTime(msg.timestamp)}</div>
            </div>
            <p class="whatsapp-message-preview">${escapeHtml(msg.lastMessage)}</p>
        </div>
    `).join('');
    
    tableContainer.innerHTML = messagesHtml;
}

window.viewWhatsAppConversation = function(userId) {
    console.log('Viewing WhatsApp conversation for:', userId);
    
    // Find the user's messages
    const user = window.currentWhatsAppUsers ? window.currentWhatsAppUsers.find(u => u.id === userId) : null;
    
    if (!user) {
        alert('User not found!');
        return;
    }
    
    // Populate the modal
    document.getElementById('whatsappUserName').textContent = user.name;
    document.getElementById('whatsappUserPhone').textContent = user.phone;
    document.getElementById('whatsappUserStatus').textContent = `Status: ${user.status}`;
    
    // Display messages
    const messagesContainer = document.getElementById('conversationMessages');
    const messagesHtml = user.messages.map(msg => `
        <div class="message-bubble ${msg.type}">
            <div>${escapeHtml(msg.text)}</div>
            <div class="message-time">${formatTime(msg.time)}</div>
        </div>
    `).join('');
    
    messagesContainer.innerHTML = messagesHtml;
    
    // Show the modal
    document.getElementById('whatsappModal').style.display = 'block';
};

window.closeWhatsAppModal = function() {
    document.getElementById('whatsappModal').style.display = 'none';
};

window.viewAllWhatsAppMessages = function() {
    console.log('Viewing all WhatsApp messages');
    // This could open a full messages view or refresh the current list
    loadWhatsAppMessages();
};

window.sendWhatsAppMessage = function() {
    console.log('Send WhatsApp message functionality');
    // This would integrate with Twilio to send actual WhatsApp messages
    alert('WhatsApp message sending functionality coming soon! This will integrate with Twilio to send actual messages.');
};

window.formatTime = function(date) {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return 'N/A';
    }
};

// Add event delegation for table buttons
function addTableEventListeners() {
    const tableContainer = document.getElementById('appointmentsTable');
    if (!tableContainer) return;
    
    // Use event delegation for edit and delete buttons
    tableContainer.addEventListener('click', function(event) {
        const target = event.target;
        
        // Handle edit button clicks
        if (target.classList.contains('btn-edit')) {
            const appointmentId = target.dataset.appointmentId;
            if (appointmentId) {
                editAppointment(appointmentId);
            }
        }
        
        // Handle delete button clicks
        if (target.classList.contains('btn-delete')) {
            const appointmentId = target.dataset.appointmentId;
            if (appointmentId) {
                deleteAppointment(appointmentId);
            }
        }
    });
    
    console.log('Table event listeners added');
}

// Add event listeners for static buttons
function addStaticButtonListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshAppointments);
        console.log('Refresh button listener added');
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
        console.log('Logout button listener added');
    }
    
    // Close modal button
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeEditModal);
        console.log('Close modal button listener added');
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeEditModal);
        console.log('Cancel button listener added');
    }
    
    // WhatsApp buttons
    const refreshWhatsAppBtn = document.getElementById('refreshWhatsAppBtn');
    if (refreshWhatsAppBtn) {
        refreshWhatsAppBtn.addEventListener('click', loadWhatsAppMessages);
        console.log('Refresh WhatsApp button listener added');
    }
    
    const viewAllMessagesBtn = document.getElementById('viewAllMessagesBtn');
    if (viewAllMessagesBtn) {
        viewAllMessagesBtn.addEventListener('click', viewAllWhatsAppMessages);
        console.log('View All WhatsApp button listener added');
    }
    
    // WhatsApp modal buttons
    const closeWhatsAppModalBtn = document.getElementById('closeWhatsAppModalBtn');
    if (closeWhatsAppModalBtn) {
        closeWhatsAppModalBtn.addEventListener('click', closeWhatsAppModal);
        console.log('Close WhatsApp modal button listener added');
    }
    
    const closeConversationBtn = document.getElementById('closeConversationBtn');
    if (closeConversationBtn) {
        closeConversationBtn.addEventListener('click', closeWhatsAppModal);
        console.log('Close conversation button listener added');
    }
    
    const sendWhatsAppBtn = document.getElementById('sendWhatsAppBtn');
    if (sendWhatsAppBtn) {
        sendWhatsAppBtn.addEventListener('click', sendWhatsAppMessage);
        console.log('Send WhatsApp button listener added');
    }
}
