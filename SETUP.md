# Quick Setup Guide

Follow these steps to get the A/B Test Monitoring Service up and running.

## Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] MySQL 8.0+ installed and running
- [ ] Git installed

## Setup Steps

### 1. Database Setup (5 minutes)

```bash
# Login to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE ab_test_monitor;
CREATE USER 'ab_logger'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON ab_test_monitor.* TO 'ab_logger'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Run schema
mysql -u ab_logger -p ab_test_monitor < database/schema.sql

# (Optional) Load sample data
mysql -u ab_logger -p ab_test_monitor < database/seeds.sql
```

### 2. Backend Setup (5 minutes)

```bash
cd backend

# Install dependencies
npm install

# Install Playwright browsers (takes a few minutes)
npx playwright install

# Create environment file
cp .env.example .env

# Edit .env file with your settings
# Required: DB_PASSWORD, JWT_SECRET
```

**Generate JWT Secret:**

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**Update `backend/.env`:**
```env
JWT_SECRET=<paste-generated-secret-here>
DB_PASSWORD=your-secure-password
```

### 3. Create Admin User (2 minutes)

```bash
# Start backend (from backend/ directory)
npm run dev

# In another terminal, create admin user
curl -X POST http://localhost:5000/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "ChangeThisPassword123!"
  }'

# You should see: {"admin_id":1,"message":"Admin user created successfully"}
```

> ⚠️ **Important**: Save your admin credentials! You'll need them to login.

### 4. Frontend Setup (3 minutes)

```bash
# Open new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# No need to edit if backend is on default port 5000
```

### 5. Start Application (1 minute)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 6. Access Application

1. Open browser: [http://localhost:3000](http://localhost:3000)
2. Login with your admin credentials
3. You're ready to go! 🎉

## Quick Test

To verify everything works:

1. **Add a test client:**
   - Go to Clients
   - Click "Add New Client"
   - Fill in: Name: "Test Client", Company: "Test Inc"
   - Save

2. **Add a test URL:**
   - Click on the Test Client card
   - Click "Add URL"
   - Fill in: URL: "https://example.com", Label: "Homepage"
   - Save

3. **Check browser configs:**
   - Go to Browsers
   - You should see 5 default configurations
   - All should be active

4. **Trigger manual monitoring:**
   - Go to Monitoring
   - Click "Trigger Monitoring Run"
   - Confirm
   - Wait for completion (may take 1-2 minutes)
   - Check run results

5. **View dashboard:**
   - Go to Dashboard
   - You should see statistics and charts

If all these steps work, your system is properly configured!

## Troubleshooting

### "Cannot connect to database"
- Check MySQL is running: `sudo systemctl status mysql` (Linux) or check services (Windows)
- Verify credentials in `backend/.env`
- Check database exists: `mysql -u ab_logger -p -e "SHOW DATABASES;"`

### "Port 5000 already in use"
- Change PORT in `backend/.env` to another port (e.g., 5001)
- Update `NEXT_PUBLIC_API_URL` in `frontend/.env.local` accordingly

### "Playwright browsers not found"
- Run: `cd backend && npx playwright install`
- On Linux, may need: `npx playwright install-deps`

### "Frontend can't connect to backend"
- Verify backend is running on http://localhost:5000
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Check browser console for CORS errors

### "Login fails"
- Verify admin user was created successfully
- Check credentials match what you used in the create-admin call
- Check backend logs in `backend/logs/error.log`

## Next Steps

After setup is complete:

1. **Secure your installation:**
   - Change admin password from dashboard (future feature)
   - Remove or comment out `/api/auth/create-admin` route in production

2. **Add real clients:**
   - Navigate to Clients
   - Add your actual client organizations

3. **Configure monitoring:**
   - Adjust cron schedule in `backend/.env` if needed
   - Add/remove browser configurations as needed

4. **Integrate with client websites:**
   - Provide clients with error tracking code (see README.md)
   - Test with a sample page that writes the error cookie

## Default Credentials (if using seed data)

- **Username:** admin
- **Password:** admin123

> ⚠️ **Security Warning**: Change this password immediately in production!

## Production Deployment

For production setup, see the "Production Deployment" section in README.md.

## Need Help?

- Check the full README.md for detailed documentation
- Review backend/logs/ for error messages
- Verify all environment variables are set correctly

---

**Estimated total setup time: 15-20 minutes**
