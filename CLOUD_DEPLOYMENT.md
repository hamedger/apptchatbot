# Cloud Deployment Guide

This guide covers deploying the Arlington WhatsApp Bot to cloud platforms like Render with GitHub integration.

## 🚀 **Quick Deploy to Render**

### **Option 1: One-Click Deploy (Recommended)**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/yourusername/arlington-whatsapp-bot)

1. Click the button above
2. Connect your GitHub account
3. Select the repository
4. Fill in environment variables
5. Click "Deploy"

### **Option 2: Manual Deploy**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service

## 🔧 **Render Configuration**

### **Service Settings**

```yaml
# Service Configuration
Name: arlington-whatsapp-bot
Environment: Node
Region: Choose closest to your users
Branch: main
Root Directory: (leave empty)
Build Command: npm run render-build
Start Command: node index.js
```

### **Environment Variables**

Set these in your Render service dashboard:

```env
# Required
NODE_ENV=production
PORT=10000
JWT_SECRET=your_super_secure_jwt_secret_here
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBER=whatsapp:+12489075504

# Optional (with defaults)
FRONTEND_ORIGIN=https://your-app-name.onrender.com
DATABASE_PATH=/opt/render/project/src/data/appointments.db
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=1000
```

### **Advanced Settings**

- **Health Check Path**: `/healthz`
- **Auto-Deploy**: Enabled
- **Pull Request Previews**: Enabled (optional)
- **Instance Type**: Starter (free) or higher for production

## 📱 **Twilio Webhook Configuration**

### **1. Get Your Render URL**

After deployment, your app will be available at:
```
https://your-app-name.onrender.com
```

### **2. Configure Twilio Webhook**

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to WhatsApp → Sandbox
3. Set webhook URL to:
   ```
   https://your-app-name.onrender.com/whatsapp
   ```
4. Set HTTP method to `POST`

### **3. Test Webhook**

Send a message to your Twilio WhatsApp number to test the connection.

## 🔐 **Admin Dashboard Access**

### **1. Default Admin Account**

The system automatically creates a default admin user:
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ IMPORTANT**: Change this password immediately after first login!

### **2. Access Admin Dashboard**

Visit: `https://your-app-name.onrender.com`

### **3. Change Default Password**

1. Login with default credentials
2. Go to Profile → Change Password
3. Set a strong password

## 📊 **GitHub Integration**

### **1. Repository Setup**

```bash
# Clone your repository
git clone https://github.com/yourusername/arlington-whatsapp-bot.git
cd arlington-whatsapp-bot

# Add remote origin
git remote add origin https://github.com/yourusername/arlington-whatsapp-bot.git

# Push to GitHub
git add .
git commit -m "Initial commit"
git push -u origin main
```

### **2. GitHub Secrets (for CI/CD)**

Go to your repository → Settings → Secrets and variables → Actions

Add these secrets:
- `RENDER_SERVICE_ID`: Your Render service ID
- `RENDER_API_KEY`: Your Render API key

### **3. Automated Deployment**

Every push to `main` branch will:
1. Run tests
2. Run linting
3. Build frontend
4. Deploy to Render (if tests pass)

## 🗄️ **Database & Storage**

### **1. SQLite Database**

- **Location**: `/opt/render/project/src/data/appointments.db`
- **Persistence**: Data persists between deployments
- **Backup**: Automatic backups on Render

### **2. Data Migration**

Existing JSON data is automatically migrated to SQLite on first run.

### **3. Database Management**

```bash
# Access database (if you have shell access)
sqlite3 /opt/render/project/src/data/appointments.db

# Backup data
sqlite3 /opt/render/project/src/data/appointments.db ".backup backup.db"
```

## 📈 **Monitoring & Health Checks**

### **1. Health Check Endpoint**

```
GET https://your-app-name.onrender.com/healthz
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

### **2. Render Monitoring**

- **Logs**: Available in Render dashboard
- **Metrics**: CPU, memory, response time
- **Alerts**: Automatic alerts for failures

### **3. Custom Monitoring**

```bash
# Check application status
curl -f https://your-app-name.onrender.com/healthz

# Monitor response time
curl -w "@curl-format.txt" -o /dev/null -s https://your-app-name.onrender.com/healthz
```

## 🔄 **Deployment Workflow**

### **1. Development Workflow**

```bash
# Make changes locally
git add .
git commit -m "Feature: add new appointment type"
git push origin develop

# Create pull request
# Tests run automatically
# Merge to main when ready
```

### **2. Production Deployment**

```bash
# Merge to main branch
git checkout main
git merge develop
git push origin main

# Render automatically deploys
# Health checks run
# Service becomes available
```

### **3. Rollback (if needed)**

1. Go to Render dashboard
2. Navigate to Deploys
3. Click "Rollback" on previous deployment

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Build Failures**
   ```bash
   # Check build logs in Render dashboard
   # Verify package.json scripts
   # Check Node.js version compatibility
   ```

2. **Environment Variables**
   ```bash
   # Verify all required variables are set
   # Check for typos in variable names
   # Ensure JWT_SECRET is set
   ```

3. **Database Issues**
   ```bash
   # Check database path permissions
   # Verify disk space
   # Check SQLite file integrity
   ```

4. **Twilio Webhook Failures**
   ```bash
   # Verify webhook URL is correct
   # Check HTTPS requirement
   # Verify webhook method is POST
   ```

### **Debug Commands**

```bash
# Check application logs
curl https://your-app-name.onrender.com/healthz

# Test webhook endpoint
curl -X POST https://your-app-name.onrender.com/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=hi&From=whatsapp:+1234567890"

# Check environment
curl https://your-app-name.onrender.com/api/auth/verify
```

## 🔒 **Security Best Practices**

### **1. Environment Variables**

- ✅ Use strong, random JWT secrets
- ✅ Never commit `.env` files
- ✅ Rotate Twilio credentials regularly
- ✅ Use different secrets per environment

### **2. Access Control**

- ✅ Change default admin password
- ✅ Use strong passwords
- ✅ Limit admin access
- ✅ Monitor login attempts

### **3. API Security**

- ✅ Rate limiting enabled
- ✅ CORS properly configured
- ✅ Input validation active
- ✅ HTTPS enforced

## 📋 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Repository pushed to GitHub
- [ ] Environment variables configured
- [ ] Twilio webhook URL updated
- [ ] Tests passing locally
- [ ] Frontend builds successfully

### **Post-Deployment**
- [ ] Health check endpoint responding
- [ ] Twilio webhook receiving messages
- [ ] Admin dashboard accessible
- [ ] Database migration completed
- [ ] Logs being generated

### **Ongoing Maintenance**
- [ ] Monitor Render dashboard
- [ ] Check health endpoint regularly
- [ ] Review application logs
- [ ] Update dependencies
- [ ] Backup important data

## 🆘 **Support Resources**

- **Render Documentation**: [docs.render.com](https://docs.render.com/)
- **GitHub Actions**: [docs.github.com/en/actions](https://docs.github.com/en/actions)
- **Twilio WhatsApp**: [twilio.com/whatsapp](https://www.twilio.com/whatsapp)
- **Application Logs**: Available in Render dashboard

---

**Next Steps**: 
1. Push your code to GitHub
2. Deploy to Render using the one-click deploy
3. Configure Twilio webhook
4. Test the WhatsApp bot
5. Access admin dashboard and change default password

Your WhatsApp appointment bot will be live and accessible worldwide! 🌍
