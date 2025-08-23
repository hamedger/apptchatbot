const express = require('express');
const router = express.Router();
const MessagingResponse = require('twilio').twiml.MessagingResponse;

/**
 * Ultra-Fast WhatsApp Bot - Simple & Responsive
 * No complex services, immediate responses
 */

router.post('/', async (req, res) => {
  try {
    console.log('🔍 WhatsApp bot called - FAST MODE');
    
    const incomingRaw = req.body.Body || '';
    const incomingMsg = incomingRaw.trim();
    const from = req.body.From;
    
    console.log('📥 Incoming:', { from, message: incomingMsg });
    
    const twiml = new MessagingResponse();
    
    // 1. Start conversation - IMMEDIATE RESPONSE
    if (incomingMsg.toLowerCase().includes('hi') || incomingMsg.toLowerCase().includes('hello')) {
      console.log('✅ Hi detected, sending welcome message');
      twiml.message("👋 Welcome to Arlington Steamers!\n\n📝 What's your name?");
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 2. Handle name - FAST RESPONSE
    if (incomingMsg.length > 0 && !incomingMsg.toLowerCase().includes('hi') && !incomingMsg.toLowerCase().includes('hello')) {
      console.log('✅ Name received:', incomingMsg);
      twiml.message(`👍 Hi ${incomingMsg}! 📱 What's your phone number?`);
      return res.type('text/xml').send(twiml.toString());
    }
    
    // 3. Default response - ALWAYS RESPOND
    console.log('✅ Sending default response');
    twiml.message("👋 Say 'hi' to start booking your carpet cleaning appointment!");
    return res.type('text/xml').send(twiml.toString());
    
  } catch (error) {
    console.error('❌ Error in WhatsApp bot:', error);
    const twiml = new MessagingResponse();
    twiml.message("😔 Something went wrong. Please say 'hi' to start over.");
    return res.type('text/xml').send(twiml.toString());
  }
});

router.get('/', (req, res) => {
  res.send('WhatsApp bot is working - ULTRA FAST MODE! 🚀');
});

module.exports = router;
