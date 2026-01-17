# A/B Test Failure Monitoring Service

An automated monitoring service that detects A/B test failures across multiple client websites. The system uses browser automation to check for error cookies, logs failures to a database, and provides a unified admin dashboard for managing clients and viewing all detected failures.

## 🎯 Features

- **Multi-Client Management**: Manage multiple clients and their monitored URLs from a single dashboard
- **Automated Browser Testing**: Daily automated checks across multiple browsers and devices (Chrome, Firefox, Safari - desktop and mobile)
- **Error Detection**: Reads error data from cookies placed by client A/B test code
- **Screenshot Capture**: Automatically captures screenshots when errors are detected
- **Advanced Filtering**: Filter failures by client, date, error type, test ID, resolution status, and browser
- **Analytics Dashboard**: View trends, breakdowns by browser/client/error type, and identify problematic areas
- **Resolution Tracking**: Update failure status, add notes, and track resolution progress
- **Manual Triggering**: Trigger monitoring runs on-demand in addition to scheduled cron jobs

## 🏗️ Architecture

### Backend (Node.js + Express + TypeScript)
- RESTful API with JWT authentication
- MySQL database for data persistence
- Playwright for browser automation
- Node-cron for scheduled monitoring
- Winston for logging

### Frontend (Next.js 14 + React + TypeScript)
- Server-side rendering with App Router
- React Query for data fetching and caching
- Tailwind CSS for styling
- Recharts for analytics visualizations

## 📋 Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ab-logger
```

### 2. Database Setup

Create MySQL database and user:

```sql
CREATE DATABASE ab_test_monitor;
CREATE USER 'ab_logger'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON ab_test_monitor.* TO 'ab_logger'@'localhost';
FLUSH PRIVILEGES;
```

Run the schema:

```bash
mysql -u ab_logger -p ab_test_monitor < database/schema.sql
```

(Optional) Seed with sample data:

```bash
mysql -u ab_logger -p ab_test_monitor < database/seeds.sql
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Create environment file
cp .env.example .env

# Edit .env with your database credentials and JWT secret
nano .env
```

**Important**: Generate a secure JWT secret:

```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

Update `backend/.env`:
```env
JWT_SECRET=<your-generated-secret>
DB_PASSWORD=your-mysql-password
```

### 4. Create Admin User

Start the backend temporarily to create an admin user:

```bash
npm run dev
```

In another terminal, create admin user:

```bash
curl -X POST http://localhost:5000/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "your-secure-password"
  }'
```

**Note**: For production, remove or disable the `/api/auth/create-admin` endpoint after creating your admin user.

### 5. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Edit if your backend URL is different
nano .env.local
```

### 6. Run the Application

**Start Backend** (from `backend/` directory):

```bash
npm run dev
```

Backend will run on [http://localhost:5000](http://localhost:5000)

**Start Frontend** (from `frontend/` directory):

```bash
npm run dev
```

Frontend will run on [http://localhost:3000](http://localhost:3000)

### 7. Login

Navigate to [http://localhost:3000](http://localhost:3000) and login with your admin credentials.

## 📖 How It Works

### For Clients: Integrating Error Tracking

Clients need to add error tracking code to their A/B tests that writes errors to a cookie when detected:

```javascript
// Example: A/B Test Error Tracking
function trackABTestError(testId, variant, errorType, errorMessage) {
  const errorData = {
    test_id: testId,
    variant: variant,
    error_type: errorType,
    error_message: errorMessage,
    browser: navigator.userAgent,
    timestamp: new Date().toISOString()
  };

  // Write error to cookie
  document.cookie = `ab_test_error=${encodeURIComponent(JSON.stringify(errorData))}; path=/; max-age=86400`;
}

// Usage in A/B test code
try {
  // A/B test variant code
  if (variant === 'b') {
    document.querySelector('.cta-button').addEventListener('click', handleClick);
  }
} catch (error) {
  trackABTestError('homepage_hero_test', 'variant_b', 'js_error', error.message);
}
```

### Cookie Format

The monitoring service looks for a cookie named `ab_test_error` with this JSON structure:

```json
{
  "test_id": "homepage_hero_test",
  "variant": "variant_b",
  "error_type": "js_error",
  "error_message": "Cannot read property 'click' of null",
  "browser": "Chrome 120",
  "timestamp": "2026-01-17T10:30:00Z"
}
```

### Monitoring Process

1. **Daily Automated Runs**: The system runs at 2:00 AM daily (configurable)
2. **URL Collection**: Fetches all active URLs with active tests
3. **Browser Checks**: For each URL, tests across all active browser configurations
4. **Cookie Detection**: Navigates to URL, waits for page load, and checks for error cookie
5. **Failure Recording**: If error found, extracts data, captures screenshot, and logs to database
6. **Manual Triggers**: Admins can trigger runs on-demand from the dashboard

## 🎛️ Admin Dashboard Guide

### Dashboard (`/dashboard`)
- Overview statistics
- Recent failure trends
- Quick navigation to all sections

### Clients (`/clients`)
- View all clients with statistics
- Add/edit/delete clients
- Click on client to manage their URLs
- Toggle active status

### Client Detail (`/clients/[id]`)
- View client information
- Manage URLs for the client
- Add/edit/delete URLs
- Toggle URL active status and test status

### Failures (`/failures`)
- View all failures across all clients
- Advanced filtering (client, date range, error type, test ID, status, browser)
- Bulk status updates
- Click on failure for details

### Failure Detail (`/failures/[id]`)
- Full error information
- Screenshot viewer
- Update resolution status
- Add resolution notes
- View related failures

### Analytics (`/analytics`)
- Overview statistics
- Failure trends over time
- Browser breakdown
- Client breakdown
- Error type distribution
- Top error messages
- Most problematic clients/URLs

### Monitoring (`/monitoring`)
- Trigger manual monitoring runs
- View run history
- See detailed checks for each run
- Monitor run status in real-time

### Browsers (`/browsers`)
- View browser configurations
- Add/edit/delete browser configs
- Toggle active status
- Manage viewport sizes and user agents

## 🔧 Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Backend server port | `5000` |
| `JWT_SECRET` | Secret key for JWT tokens | **Required** |
| `JWT_EXPIRES_IN` | JWT token expiration | `24h` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | **Required** |
| `DB_NAME` | MySQL database name | `ab_test_monitor` |
| `CRON_SCHEDULE` | Cron schedule for monitoring | `0 2 * * *` (2 AM daily) |
| `BROWSER_TIMEOUT` | Page load timeout (ms) | `30000` |
| `SCREENSHOT_DIR` | Screenshot storage path | `./screenshots` |
| `MAX_CONCURRENT_CHECKS` | Concurrent browser checks | `5` |
| `COOKIE_NAME` | Error cookie name | `ab_test_error` |
| `PAGE_SIZE` | Default pagination size | `50` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5000/api` |

## 📁 Project Structure

```
ab-logger/
├── backend/              # Node.js backend
│   ├── src/
│   │   ├── config/       # Database and environment config
│   │   ├── middleware/   # Express middleware (auth, errors)
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── jobs/         # Cron jobs
│   │   ├── types/        # TypeScript types
│   │   ├── utils/        # Utility functions
│   │   └── server.ts     # Express app entry point
│   ├── screenshots/      # Captured screenshots
│   ├── logs/             # Application logs
│   └── package.json
├── frontend/             # Next.js frontend
│   ├── app/              # Next.js 14 app router pages
│   ├── components/       # React components
│   ├── lib/              # API client and utilities
│   ├── types/            # TypeScript types
│   └── package.json
├── database/
│   ├── schema.sql        # Database schema
│   └── seeds.sql         # Sample data
└── README.md
```

## 🔒 Security Considerations

1. **Change Default Credentials**: Always change the default admin password
2. **Secure JWT Secret**: Use a strong, random JWT secret in production
3. **Environment Variables**: Never commit `.env` files to version control
4. **CORS Configuration**: Set `CORS_ORIGIN` to your production frontend URL
5. **Rate Limiting**: The API has rate limiting enabled (100 requests per 15 minutes per IP)
6. **HTTPS**: Use HTTPS in production for both frontend and backend
7. **Database Security**: Use strong database passwords and restrict access
8. **Disable Admin Creation**: Remove or disable `/api/auth/create-admin` in production

## 🐛 Troubleshooting

### Backend won't start
- Check MySQL is running: `mysql -u root -p`
- Verify database exists: `SHOW DATABASES;`
- Check `.env` file has correct credentials
- Check port 5000 is not in use

### Frontend can't connect to backend
- Verify backend is running on correct port
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- Check CORS settings in backend

### Playwright browsers not working
- Install browsers: `cd backend && npx playwright install`
- Install system dependencies (Linux): `npx playwright install-deps`

### Monitoring runs fail
- Check screenshot directory exists and is writable
- Verify URLs are accessible
- Check browser timeout setting (increase if needed)
- Review logs in `backend/logs/`

### Database errors
- Verify schema is up to date
- Check foreign key constraints
- Review error logs for specific SQL errors

## 📊 Database Schema

The application uses 8 main tables:
- `admin_users` - Admin user accounts
- `clients` - Client organizations
- `monitored_urls` - URLs to monitor
- `browser_configurations` - Browser test configurations
- `monitoring_runs` - Monitoring execution history
- `url_checks` - Individual URL check results
- `detected_failures` - A/B test failures detected
- `failure_screenshots` - Screenshot file references

See [database/schema.sql](database/schema.sql) for full schema.

## 🚢 Production Deployment

### Backend

1. Build TypeScript:
```bash
cd backend
npm run build
```

2. Set environment to production:
```env
NODE_ENV=production
```

3. Use a process manager (PM2):
```bash
npm install -g pm2
pm2 start dist/server.js --name ab-logger-backend
pm2 save
pm2 startup
```

### Frontend

1. Build Next.js:
```bash
cd frontend
npm run build
```

2. Start production server:
```bash
npm start
```

Or deploy to Vercel/Netlify for easy hosting.

### Recommended Production Setup
- Use a reverse proxy (nginx) for SSL/TLS
- Set up database backups
- Monitor logs with a service like DataDog or LogRocket
- Use environment-specific configs
- Set up alerts for monitoring failures

## 🤝 Contributing

This is a custom internal tool. For feature requests or bug reports, contact the development team.

## 📝 License

MIT License - See LICENSE file for details

## 💡 Tips

- **Test Locally First**: Add a test client and URL to verify the system works before using with real clients
- **Adjust Cron Schedule**: Modify `CRON_SCHEDULE` to run at optimal times for your timezone
- **Browser Configs**: Start with desktop Chrome and add more browsers as needed
- **Monitor Logs**: Check `backend/logs/` regularly for any issues
- **Screenshot Cleanup**: Implement periodic cleanup of old screenshots to save disk space
- **Performance**: Adjust `MAX_CONCURRENT_CHECKS` based on your server resources

## 📧 Support

For help or questions, contact your system administrator.

---

**Built with ❤️ for better A/B testing**
