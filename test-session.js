// test-session.js
const session = require('./services/session');

async function testSession() {
  try {
    console.log('Testing session service...');
    
    // Test creating a session
    const user = 'whatsapp:+1234567890';
    console.log('Creating session for:', user);
    
    const sessionData = await session.getSession(user);
    console.log('Session created:', sessionData);
    
    // Test updating session
    console.log('Updating session...');
    await session.updateSession(user, 'name', 'John');
    await session.updateSession(user, 'step', 'phone');
    
    const updatedSession = await session.getSession(user);
    console.log('Updated session:', updatedSession);
    
    // Test getting all sessions
    const allSessions = session.getAllSessions();
    console.log('All sessions:', allSessions);
    
    console.log('Session service test completed successfully!');
  } catch (error) {
    console.error('Session service test failed:', error);
  }
}

testSession();
