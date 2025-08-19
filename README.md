# Arlington Steamers WhatsApp Appointment Bot

A production-ready WhatsApp chatbot for booking carpet cleaning appointments with an admin dashboard to manage bookings. Deployed on cloud platforms with automated CI/CD.

## 🚀 **Quick Deploy to Render**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/yourusername/arlington-whatsapp-bot)

**One-click deployment to Render with automatic HTTPS, scaling, and monitoring!**

## ✨ **Features**

- **WhatsApp Integration**: Users can book appointments via WhatsApp
- **Automated Booking Flow**: Guided conversation to collect appointment details
- **Admin Dashboard**: React-based calendar view of all appointments
- **Real-time Notifications**: Admin gets notified of new bookings
- **Cloud-Ready**: Optimized for Render, Railway, and other cloud platforms
- **CI/CD Pipeline**: Automated testing and deployment via GitHub Actions
- **Production Security**: JWT authentication, rate limiting, input validation
- **Database Migration**: Automatic migration from JSON to SQLite
- **Health Monitoring**: Built-in health checks and logging

## 🏗️ **Architecture**

- **Backend**: Node.js + Express with production optimizations
- **WhatsApp**: Twilio WhatsApp API integration
- **Frontend**: React + React Big Calendar
- **Database**: SQLite with automatic migration
- **Authentication**: JWT-based with bcrypt password hashing
- **Deployment**: Cloud-optimized with Docker support
- **Monitoring**: Winston logging, health checks, metrics

## 🚀 **Deployment Options**

### **Option 1: Render (Recommended - Free Tier)**

1. Click the "Deploy to Render" button above
2. Connect your GitHub account
3. Configure environment variables
4. Deploy automatically

### **Option 2: Manual Cloud Deployment**

1. Push code to GitHub
2. Set up environment variables
3. Deploy to your preferred cloud platform
4. Configure Twilio webhook

## 📋 **Prerequisites**

- GitHub account
- Twilio account with WhatsApp Sandbox
- Cloud platform account (Render, Railway, Heroku, etc.)

## 🔧 **Environment Configuration**

### **Required Variables**

```env
NODE_ENV=production
PORT=10000
JWT_SECRET=your_super_secure_jwt_secret_here
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBER=whatsapp:+12489075504
```

### **Optional Variables**

```env
FRONTEND_ORIGIN=https://your-app-name.onrender.com
DATABASE_PATH=/opt/render/project/src/data/appointments.db
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=1000
```

## 📱 **WhatsApp Bot Flow**

1. User sends "hi" or "hello"
2. Bot asks for name
3. Shows main menu with options
4. User selects "Book Appointment"
5. Bot collects: phone, address, email, areas, pet issues
6. User selects time slot (e.g., "Book 10am Monday")
7. Confirmation sent to user and admin

## 🎯 **API Endpoints**

- `POST /whatsapp` - WhatsApp webhook
- `GET /api/appointments` - List all appointments
- `POST /api/appointments` - Create new appointment
- `DELETE /api/appointments/:id` - Delete appointment
- `GET /api/auth/*` - Authentication endpoints
- `GET /healthz` - Health check

## 🔐 **Admin Access**

### **Default Credentials**
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ IMPORTANT**: Change this password immediately after deployment!

### **Admin Features**
- View all appointments in calendar
- Create/edit/delete appointments
- User management
- System monitoring

## 📊 **Data Structure**

### **Appointment Object**
```json
{
  "id": "unique_id",
  "user": "whatsapp:+1234567890",
  "slot": "Monday 10:00am",
  "worker": "Alice",
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "address": "123 Main St, City",
  "areas": "3 rooms, 1 hallway",
  "petIssue": "No",
  "status": "confirmed",
  "created_at": "2024-01-01T10:00:00.000Z"
}
```

## 🔒 **Security Features**

- JWT authentication with secure tokens
- bcrypt password hashing
- Rate limiting and request throttling
- Input validation and sanitization
- CORS configuration
- Security headers (Helmet.js)
- Environment variable validation

## 📈 **Monitoring & Health**

### **Health Check**
```
GET /healthz
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

### **Logging**
- Structured logging with Winston
- File rotation and compression
- Error tracking and alerting
- Request/response logging

## 🔄 **CI/CD Pipeline**

### **GitHub Actions**
- Automated testing on pull requests
- Linting and code quality checks
- Frontend build verification
- Automatic deployment to production

### **Deployment Workflow**
1. Push code to `develop` branch
2. Create pull request to `main`
3. Automated tests run
4. Merge triggers deployment
5. Health checks verify deployment

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Build Failures**
   - Check build logs in cloud dashboard
   - Verify package.json scripts
   - Check Node.js version compatibility

2. **Environment Variables**
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure JWT_SECRET is set

3. **Twilio Webhook Failures**
   - Verify webhook URL is correct
   - Check HTTPS requirement
   - Verify webhook method is POST

### **Debug Commands**

```bash
# Check application status
curl https://your-app-name.onrender.com/healthz

# Test webhook endpoint
curl -X POST https://your-app-name.onrender.com/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=hi&From=whatsapp:+1234567890"
```

## 📚 **Documentation**

- **[Cloud Deployment Guide](CLOUD_DEPLOYMENT.md)** - Detailed cloud deployment instructions
- **[Production Guide](PRODUCTION.md)** - Production best practices and security
- **[API Documentation](API.md)** - Complete API reference

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the ISC License.

## 🆘 **Support**

- **Documentation**: Check the guides above
- **Issues**: [GitHub Issues](https://github.com/yourusername/arlington-whatsapp-bot/issues)
- **Twilio Support**: [Twilio Help Center](https://support.twilio.com/)

---

## 🎉 **Ready to Deploy?**

Your WhatsApp appointment chatbot is production-ready with:
- ✅ Cloud deployment configuration
- ✅ Automated CI/CD pipeline
- ✅ Production security features
- ✅ Monitoring and health checks
- ✅ Database migration tools
- ✅ Comprehensive documentation

**Deploy now and start accepting appointments worldwide!** 🌍📱
