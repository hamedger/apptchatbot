// test-setup.js - Test script to verify our fixes
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Arlington WhatsApp Bot Setup...\n');

// Test 1: Check if required files exist
console.log('📁 Checking required files...');
const requiredFiles = [
  'package.json',
  'index.js',
  'routes/whatsapp.js',
  'routes/appointments.js',
  'services/scheduler.js',
  'services/session.js',
  'services/notifyAdmin.js',
  'data/appointments.json',
  'src/package.json',
  'src/AdminCalendar.jsx'
];

let missingFiles = [];
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
});

// Test 2: Check package.json dependencies
console.log('\n📦 Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['express', 'twilio', 'cors', 'dotenv', 'helmet', 'moment', 'morgan'];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep} - ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep} - MISSING`);
    }
  });
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

// Test 3: Check data directory structure
console.log('\n🗂️ Checking data directory...');
const dataDir = 'data';
if (fs.existsSync(dataDir)) {
  console.log('✅ data/ directory exists');
  const files = fs.readdirSync(dataDir);
  console.log(`   Files: ${files.join(', ')}`);
} else {
  console.log('❌ data/ directory missing');
}

// Test 4: Check environment file
console.log('\n🔐 Checking environment configuration...');
if (fs.existsSync('.env')) {
  console.log('✅ .env file exists');
} else if (fs.existsSync('env.example')) {
  console.log('⚠️  .env file missing, but env.example exists');
  console.log('   Please copy env.example to .env and fill in your Twilio credentials');
} else {
  console.log('❌ No environment configuration found');
}

// Test 5: Validate JSON files
console.log('\n🔍 Validating JSON files...');
try {
  const appointments = JSON.parse(fs.readFileSync('data/appointments.json', 'utf8'));
  console.log(`✅ appointments.json - ${appointments.length} appointments`);
} catch (error) {
  console.log('❌ appointments.json - Invalid JSON or missing');
}

// Summary
console.log('\n📊 Summary:');
if (missingFiles.length === 0) {
  console.log('🎉 All required files are present!');
} else {
  console.log(`⚠️  ${missingFiles.length} files are missing`);
}

console.log('\n🚀 Next steps:');
console.log('1. Copy env.example to .env and fill in your Twilio credentials');
console.log('2. Run: npm run dev (to start backend)');
console.log('3. Run: npm run frontend (to start frontend)');
console.log('4. Test WhatsApp webhook with Twilio');
console.log('5. Check admin dashboard at http://localhost:3001');

console.log('\n✨ Setup test completed!');
