# ARAGOG Database Setup

## Prerequisites

1. Install MySQL Server (8.0 or higher recommended)
2. Install Python MySQL connector

## Installation Steps

### 1. Install MySQL Dependencies

```bash
pip install mysqlclient sqlalchemy python-dotenv
```

### 2. Configure MySQL

Create a database user and set permissions:

```sql
CREATE USER 'aragog_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON aragog_db.* TO 'aragog_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Create Database Schema

Run the schema file to create all tables:

```bash
mysql -u root -p < schema.sql
```

Or execute in MySQL:

```bash
mysql -u root -p
source /path/to/schema.sql
```

### 4. Configure Environment Variables

Copy `.env.example` to `.env` in the backend folder:

```bash
cp .env.example .env
```

Update the values in `.env`:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=aragog_db
DB_USER=aragog_user
DB_PASSWORD=your_secure_password
```

### 5. Test Connection

```python
from database import Database

db = Database("mysql://aragog_user:password@localhost:3306/aragog_db")
session = db.get_session()
print("Database connected successfully!")
session.close()
```

## Schema Overview

- **users**: User accounts and profiles
- **chats**: Chat/conversation sessions
- **messages**: Individual messages in chats
- **user_settings**: User preferences and settings
- **conversation_sessions**: Backend conversation context

## Backup & Restore

### Backup
```bash
mysqldump -u root -p aragog_db > aragog_backup.sql
```

### Restore
```bash
mysql -u root -p aragog_db < aragog_backup.sql
```

## Security Notes

- Change the default admin password immediately in production
- Use strong passwords for database users
- Enable SSL/TLS for database connections in production
- Regularly backup your database
