# MySQL Setup Guide for Menahariya Smart

## Quick Setup Options

### Option 1: XAMPP (Recommended for Windows)
1. Download XAMPP from https://www.apachefriends.org/
2. Install XAMPP
3. Start XAMPP Control Panel
4. Start MySQL and Apache services
5. Open phpMyAdmin (http://localhost/phpmyadmin)
6. Create database: `menahariya_smart`

### Option 2: MySQL Community Server
1. Download MySQL from https://dev.mysql.com/downloads/mysql/
2. Install MySQL with default settings
3. Set root password during installation
4. Start MySQL service:
   ```cmd
   net start mysql80
   ```
5. Create database:
   ```sql
   CREATE DATABASE menahariya_smart;
   ```

### Option 3: Docker (Advanced)
```bash
docker run --name menahariya-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=menahariya_smart -p 3306:3306 -d mysql:8.0
```

## Database Migration

After MySQL is running, execute the migration:

```bash
# Navigate to backend directory
cd backend

# Run basic database setup (if you have existing schema)
mysql -u root -p menahariya_smart < database/basic_schema.sql

# Run Chapa payment migration
mysql -u root -p menahariya_smart < database/migrations/001_add_chapa_payment_support.sql
```

## Environment Configuration

Update your `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=menahariya_smart

# Chapa Payment Configuration
CHAPA_SECRET_KEY=CHASECK_TEST-your-secret-key-here
CHAPA_WEBHOOK_SECRET=your-webhook-secret-here
CHAPA_BASE_URL=https://api.chapa.co
CHAPA_TEST_MODE=true

# Application URLs
API_BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

## Testing the Connection

1. Restart the server after MySQL setup
2. Check console for "MySQL Connected successfully" message
3. Test login endpoint with valid credentials

## Common Issues

### "Access denied for user 'root'@'localhost'"
- Reset MySQL root password
- Check if user exists and has correct privileges

### "Can't connect to MySQL server"
- Verify MySQL service is running
- Check port 3306 is not blocked
- Verify host and port in connection string

### "Database doesn't exist"
- Create the database manually
- Check spelling in .env file

## Quick Test

Create a simple test user in the database:

```sql
USE menahariya_smart;

INSERT INTO users (full_name, phone, email, password_hash, role_id, status) 
VALUES ('Test User', '0912345678', 'test@example.com', '$2b$10$example_hash', 3, 'active');

INSERT INTO roles (name, description) VALUES ('passenger', 'Regular passenger user');
```

Then test login with:
- Phone: 0912345678
- Password: password123

## Next Steps

1. Install and start MySQL using one of the options above
2. Create the database
3. Run the migration scripts
4. Update .env file with database credentials
5. Restart the server
6. Test the login endpoint
