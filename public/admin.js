console.log('Admin script loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');
    
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submitted');
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            console.log('Username:', username);
            console.log('Password length:', password.length);
            
            // Show loading message
            document.getElementById('msg').innerHTML = '<div class="message">Logging in...</div>';
            
            // Make API call
            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(response => {
                console.log('Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data);
                
                if (data.token) {
                    document.getElementById('msg').innerHTML = '<div class="message success">✅ Login successful!</div>';
                    console.log('Login successful!');
                    
                    // Store token
                    localStorage.setItem('authToken', data.token);
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = '/admin-dashboard';
                    }, 1000);
                } else {
                    document.getElementById('msg').innerHTML = '<div class="message error">❌ Login failed: ' + (data.message || 'Unknown error') + '</div>';
                    console.log('Login failed:', data);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('msg').innerHTML = '<div class="message error">❌ Network error: ' + error.message + '</div>';
            });
        });
        
        console.log('Event listener attached');
    } else {
        console.error('Login form not found');
    }
});
