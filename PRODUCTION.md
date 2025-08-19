# Production Deployment Guide

This document provides comprehensive instructions for deploying the Arlington WhatsApp Bot to production environments.

## 🚀 **Production Features Implemented**

### **Security & Authentication**
- ✅ JWT-based authentication with bcrypt password hashing
- ✅ Role-based access control (Admin/User)
- ✅ Rate limiting and request throttling
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ Helmet.js security headers
- ✅ Environment variable validation

### **Database & Storage**
- ✅ SQLite database with automatic migration from JSON
- ✅ Persistent session storage
- ✅ Data backup and recovery
- ✅ Connection pooling and error handling

### **Monitoring & Logging**
- ✅ Winston structured logging with file rotation
- ✅ Health check endpoints
- ✅ Performance monitoring
- ✅ Error tracking and alerting
- ✅ Request/response logging

### **Deployment & DevOps**
- ✅ Docker containerization
- ✅ Docker Compose orchestration
- ✅ PM2 process management
- ✅ Automated deployment scripts
- ✅ Health checks and auto-restart
- ✅ Graceful shutdown handling

## 🔧 **Pre-Production Setup**

### **1. Environment Configuration**

Create a production `.env` file:

```bash
# Copy example file
cp env.example .env

# Edit with production values
nano .env
```

**Required Production Variables:**
```env
NODE_ENV=production
JWT_SECRET=your_super_secure_jwt_secret_here
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBER=whatsapp:+12489075504
FRONTEND_ORIGIN=https://yourdomain.com
```

**Security Best Practices:**
- Use a strong, random JWT secret (32+ characters)
- Never commit `.env` files to version control
- Use different credentials for each environment
- Regularly rotate secrets and API keys

### **2. SSL Certificate Setup**

For production, you need SSL certificates:

```bash
# Using Let's Encrypt (free)
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com

# Or purchase from a certificate authority
# Place certificates in ./ssl/ directory
```

### **3. Database Setup**

The application automatically creates and migrates the SQLite database:

```bash
# Database will be created at: ./data/appointments.db
# Existing JSON data will be automatically migrated
```

## 🐳 **Docker Deployment (Recommended)**

### **1. Build and Deploy**

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### **2. Production Docker Commands**

```bash
# Update and redeploy
docker-compose pull
docker-compose up -d --build

# Scale application
docker-compose up -d --scale app=3

# Backup data
docker-compose exec app tar -czf /app/backup.tar.gz /app/data

# Monitor resources
docker stats
```

### **3. Docker Production Checklist**

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Configure SSL certificates
- [ ] Set strong passwords for Redis and databases
- [ ] Configure log rotation
- [ ] Set resource limits
- [ ] Enable health checks

## 📊 **PM2 Deployment (Alternative)**

### **1. Install PM2**

```bash
npm install -g pm2
```

### **2. Deploy with PM2**

```bash
# Start in production mode
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### **3. PM2 Management**

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs arlington-whatsapp-bot

# Restart application
pm2 restart arlington-whatsapp-bot

# Update application
pm2 reload arlington-whatsapp-bot
```

## 🔒 **Security Hardening**

### **1. Firewall Configuration**

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# iptables (CentOS/RHEL)
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

### **2. System Security**

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install security tools
sudo apt install fail2ban ufw unattended-upgrades

# Configure automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

### **3. Application Security**

- [ ] Change default admin password (`admin123`)
- [ ] Use strong, unique passwords
- [ ] Enable two-factor authentication (if available)
- [ ] Regular security audits
- [ ] Monitor access logs

## 📈 **Monitoring & Alerting**

### **1. Health Checks**

```bash
# Application health
curl https://yourdomain.com/healthz

# Docker health
docker-compose ps

# PM2 health
pm2 status
```

### **2. Log Monitoring**

```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# View access logs
tail -f logs/access.log
```

### **3. Performance Monitoring**

```bash
# System resources
htop
iotop
nethogs

# Application metrics
curl https://yourdomain.com/metrics
```

## 🚨 **Incident Response**

### **1. Service Outage**

```bash
# Check service status
docker-compose ps
pm2 status

# Restart services
docker-compose restart
pm2 restart all

# Check logs for errors
docker-compose logs --tail=100
pm2 logs --lines=100
```

### **2. Data Recovery**

```bash
# Restore from backup
cp -r backups/TIMESTAMP/data ./
cp backups/TIMESTAMP/.env ./

# Restart services
docker-compose restart
pm2 restart all
```

### **3. Security Incident**

```bash
# Stop services immediately
docker-compose down
pm2 stop all

# Investigate logs
grep -i "error\|warning\|unauthorized" logs/*.log

# Check for suspicious activity
grep -i "login\|auth" logs/app.log
```

## 🔄 **Backup & Recovery**

### **1. Automated Backups**

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup data
cp -r ./data "$BACKUP_DIR/"
cp .env "$BACKUP_DIR/"

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

# Keep only last 7 days of backups
find ./backups -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /path/to/your/app/backup.sh" | crontab -
```

### **2. Database Backup**

```bash
# SQLite backup
sqlite3 data/appointments.db ".backup 'backups/db_$(date +%Y%m%d_%H%M%S).db'"

# Export to SQL
sqlite3 data/appointments.db ".dump" > "backups/dump_$(date +%Y%m%d_%H%M%S).sql"
```

## 📋 **Production Checklist**

### **Pre-Deployment**
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database credentials set
- [ ] Firewall configured
- [ ] Monitoring tools installed
- [ ] Backup strategy implemented

### **Post-Deployment**
- [ ] Health checks passing
- [ ] Logs being generated
- [ ] Monitoring alerts configured
- [ ] Backup jobs running
- [ ] Security scans completed
- [ ] Performance benchmarks met

### **Ongoing Maintenance**
- [ ] Regular security updates
- [ ] Log rotation working
- [ ] Backup verification
- [ ] Performance monitoring
- [ ] User access reviews
- [ ] Incident response testing

## 🆘 **Support & Troubleshooting**

### **Common Issues**

1. **Service won't start**
   - Check environment variables
   - Verify port availability
   - Check log files

2. **Database connection errors**
   - Verify database file permissions
   - Check disk space
   - Validate database path

3. **Authentication failures**
   - Verify JWT secret
   - Check user credentials
   - Validate token expiration

### **Getting Help**

- Check logs: `logs/app.log`, `logs/error.log`
- Review this documentation
- Check GitHub issues
- Contact support team

## 📚 **Additional Resources**

- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practices-security.html)

---

**Remember**: Production environments require ongoing attention and maintenance. Regular monitoring, updates, and security reviews are essential for maintaining a secure and reliable service.
