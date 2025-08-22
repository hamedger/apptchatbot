const express = require('express');
const router = express.Router();
const MessagingResponse = require('twilio').twiml.MessagingResponse;

/**
 * Minimal Test WhatsApp Route
 * This will help us isolate what's causing the 500 error
 */

router.post('/', async (req, res) => {
  try {
    console.log('🔍 Test route called');
    
    const incomingRaw = req.body.Body || '';
    const incomingMsg = incomingRaw.trim();
    const from = req.body.From;
    
    console.log('📥 Incoming:', { from, message: incomingMsg });
    
    const twiml = new MessagingResponse();
    
    if (incomingMsg.toLowerCase().includes('hi') || incomingMsg.toLowerCase().includes('hello')) {
      console.log('✅ Hi message handled');
      twiml.message("👋 Hello! This is a test. What is your name?");
      return res.type('text/xml').send(twiml.toString());
    }
    
    if (incomingMsg) {
      console.log('✅ Name message handled');
      twiml.message(`Nice to meet you, ${incomingMsg}! This is working.`);
      return res.type('text/xml').send(twiml.toString());
    }
    
    // Default response
    twiml.message("Please say 'hi' to start");
    return res.type('text/xml').send(twiml.toString());
    
  } catch (error) {
    console.error('❌ Error in test route:', error);
    const twiml = new MessagingResponse();
    twiml.message("Test route error: " + error.message);
    return res.type('text/xml').send(twiml.toString());
  }
});

router.get('/', (req, res) => {
  res.send('WhatsApp test route is working');
});

module.exports = router;
