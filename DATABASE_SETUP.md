# Database Setup Guide - Step by Step

This guide will walk you through setting up the MySQL database for the A/B Test Monitoring Service.

## Prerequisites

- MySQL 8.0+ installed and running
- MySQL command-line client or MySQL Workbench
- Administrator access to MySQL

## Step-by-Step Instructions

### Step 1: Check MySQL is Running

**Windows:**
```powershell
# Check if MySQL service is running
Get-Service MySQL*

# Or start MySQL service if it's not running
Start-Service MySQL80  # Adjust name based on your MySQL version
```

**Linux/Mac:**
```bash
# Check status
sudo systemctl status mysql

# Start if not running
sudo systemctl start mysql
```

### Step 2: Login to MySQL

Open your terminal/command prompt and login to MySQL as root:

```bash
mysql -u root -p
```

You'll be prompted for your MySQL root password. Enter it and press Enter.

You should see the MySQL prompt:
```
mysql>
```

### Step 3: Create Database

At the MySQL prompt, run these commands:

```sql
-- Create the database
CREATE DATABASE ab_test_monitor;

-- Verify it was created
SHOW DATABASES;
```

You should see `ab_test_monitor` in the list.

### Step 4: Create Database User (Optional but Recommended)

Create a dedicated user for the application:

```sql
-- Create user (change 'your_password' to a strong password)
CREATE USER 'ab_logger'@'localhost' IDENTIFIED BY 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON ab_test_monitor.* TO 'ab_logger'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify user was created
SELECT user, host FROM mysql.user WHERE user = 'ab_logger';
```

**Remember this password!** You'll need it for your `.env` file.

### Step 5: Exit MySQL

```sql
EXIT;
```

### Step 6: Run the Schema Script

Now you're back in your regular terminal. Navigate to your project directory:

```bash
cd "c:\Users\abhishek singh\OneDrive\Documents\PersonalProjects\ab-logger"
```

Run the schema script to create all tables:

**Option A: Using the dedicated user (recommended)**
```bash
mysql -u ab_logger -p ab_test_monitor < database/schema.sql
```

**Option B: Using root user**
```bash
mysql -u root -p ab_test_monitor < database/schema.sql
```

When prompted, enter the password for the user you're using.

**You should see no output if successful!** (No news is good news)

### Step 7: Verify Tables Were Created

Login to MySQL again:

```bash
mysql -u ab_logger -p ab_test_monitor
# Or
mysql -u root -p ab_test_monitor
```

At the MySQL prompt:

```sql
-- Show all tables
SHOW TABLES;
```

You should see 8 tables:
```
+----------------------------+
| Tables_in_ab_test_monitor  |
+----------------------------+
| admin_users                |
| browser_configurations     |
| clients                    |
| detected_failures          |
| failure_screenshots        |
| monitored_urls             |
| monitoring_runs            |
| url_checks                 |
+----------------------------+
8 rows in set (0.00 sec)
```

### Step 8: (Optional) Load Sample Data

If you want to test with sample data, run the seeds script:

```sql
EXIT;
```

Then in your terminal:

```bash
mysql -u ab_logger -p ab_test_monitor < database/seeds.sql
# Or
mysql -u root -p ab_test_monitor < database/seeds.sql
```

### Step 9: Verify Sample Data (If You Loaded Seeds)

Login again:

```bash
mysql -u ab_logger -p ab_test_monitor
```

Check the data:

```sql
-- Check clients
SELECT * FROM clients;

-- Check browser configs
SELECT * FROM browser_configurations;

-- Check admin user (password is 'admin123')
SELECT username, email FROM admin_users;

-- Exit
EXIT;
```

### Step 10: Configure Backend .env File

Now configure your backend to connect to the database:

```bash
cd backend
cp .env.example .env
```

Edit the `.env` file with your favorite text editor and update these values:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=ab_logger          # Or 'root' if you didn't create a dedicated user
DB_PASSWORD=your_password  # The password you set in Step 4
DB_NAME=ab_test_monitor

# Also set a JWT secret (generate a random string)
JWT_SECRET=your-super-secret-key-min-32-characters-long
```

**To generate a secure JWT secret:**

**Linux/Mac:**
```bash
openssl rand -base64 32
```

**Windows PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**Or just use a random string:**
```
JWT_SECRET=a8f5f167f44f4964e6c998dee827110c3e7e5c0b5d4c3a2e1f0d9c8b7a6f5e4d
```

## Troubleshooting

### Error: "Access denied for user"

**Problem:** Wrong password or user doesn't exist

**Solution:**
```sql
-- Reset user password
ALTER USER 'ab_logger'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

### Error: "Unknown database 'ab_test_monitor'"

**Problem:** Database wasn't created

**Solution:**
```bash
mysql -u root -p -e "CREATE DATABASE ab_test_monitor;"
```

### Error: "Can't connect to MySQL server"

**Problem:** MySQL service is not running

**Solution:**
- Windows: Start the MySQL service from Services app
- Linux: `sudo systemctl start mysql`
- Mac: `mysql.server start`

### Error: "Table already exists"

**Problem:** Tables already exist from a previous run

**Solution:**
```sql
-- Drop all tables and start fresh
DROP DATABASE ab_test_monitor;
CREATE DATABASE ab_test_monitor;
EXIT;

-- Then run schema script again
mysql -u ab_logger -p ab_test_monitor < database/schema.sql
```

### Error: "File not found" when running schema.sql

**Problem:** Not in the correct directory

**Solution:**
```bash
# Make sure you're in the project root
cd "c:\Users\abhishek singh\OneDrive\Documents\PersonalProjects\ab-logger"

# Verify the file exists
ls database/schema.sql  # Linux/Mac
dir database\schema.sql  # Windows
```

### Error: Foreign key constraint fails

**Problem:** Tables are being created in wrong order

**Solution:** The schema.sql file has tables in the correct order. Make sure you're running the entire file, not individual statements.

## Alternative: Using MySQL Workbench (GUI Method)

If you prefer a graphical interface:

### 1. Open MySQL Workbench

### 2. Connect to MySQL Server
- Click on your local connection (usually "Local instance 3306")
- Enter root password

### 3. Create Database
- Click the "Create Schema" icon (cylinder with plus sign)
- Name: `ab_test_monitor`
- Click "Apply" → "Apply" → "Finish"

### 4. Run Schema Script
- File → Open SQL Script
- Navigate to: `ab-logger/database/schema.sql`
- Click "Open"
- Click the lightning bolt icon (Execute)
- You should see "8 statements executed successfully"

### 5. (Optional) Run Seeds Script
- File → Open SQL Script
- Navigate to: `ab-logger/database/seeds.sql`
- Click "Open"
- Make sure `ab_test_monitor` is selected in the schema dropdown
- Click the lightning bolt icon
- You should see success messages

### 6. Verify
- Expand the `ab_test_monitor` schema in the left sidebar
- Expand "Tables"
- You should see all 8 tables

## Quick Reference Commands

```bash
# Login to MySQL
mysql -u root -p

# Create database
mysql -u root -p -e "CREATE DATABASE ab_test_monitor;"

# Run schema
mysql -u ab_logger -p ab_test_monitor < database/schema.sql

# Run seeds
mysql -u ab_logger -p ab_test_monitor < database/seeds.sql

# Check tables
mysql -u ab_logger -p ab_test_monitor -e "SHOW TABLES;"

# Check sample data
mysql -u ab_logger -p ab_test_monitor -e "SELECT * FROM clients;"
```

## Summary Checklist

- [ ] MySQL is running
- [ ] Logged into MySQL successfully
- [ ] Created `ab_test_monitor` database
- [ ] Created `ab_logger` user (or using root)
- [ ] Ran `schema.sql` successfully
- [ ] Verified 8 tables exist
- [ ] (Optional) Ran `seeds.sql` for sample data
- [ ] Configured `backend/.env` with database credentials
- [ ] Configured `JWT_SECRET` in `.env`

## Next Steps

After database setup is complete:

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

3. Start the backend:
   ```bash
   npm run dev
   ```

4. Create admin user (see SETUP.md)

---

**Need help?** Check the troubleshooting section above or review the full SETUP.md guide.
