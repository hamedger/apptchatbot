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
                    <th>Date & Time</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${appointments.map(app => `
                    <tr>
                        <td>${escapeHtml(app.customer_name || app.name || 'N/A')}</td>
                        <td>${escapeHtml(app.phone || app.phone_number || 'N/A')}</td>
                        <td>${formatDateTime(app.appointment_date || app.slot)}</td>
                        <td>${escapeHtml(app.service || 'Steam Cleaning')}</td>
                        <td>
                            <span class="status-badge status-${getStatusClass(app.status)}">
                                ${escapeHtml(app.status || 'Pending')}
                            </span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-edit" onclick="editAppointment('${app.id}')">Edit</button>
                                <button class="btn-delete" onclick="deleteAppointment('${app.id}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    tableContainer.innerHTML = table;
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
function refreshAppointments() {
    console.log('Refreshing appointments...');
    loadDashboardData();
}

// Edit appointment (placeholder)
function editAppointment(id) {
    console.log('Edit appointment:', id);
    alert(`Edit appointment ${id} - Feature coming soon!`);
}

// Delete appointment
async function deleteAppointment(id) {
    if (!confirm('Are you sure you want to delete this appointment?')) {
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
function logout() {
    console.log('Logging out...');
    
    // Clear stored data
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Redirect to login page
    window.location.href = '/admin';
}

console.log('Dashboard functions loaded');
