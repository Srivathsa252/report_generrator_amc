# Production Database Setup Guide

## Prerequisites

1. PostgreSQL 14+ installed and running
2. Node.js 18+ installed
3. Environment variables configured

## Step 1: Database Setup

### Option A: Local PostgreSQL Installation

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql -f scripts/setup-database.sql
```

### Option B: Cloud Database (Recommended for Production)

#### AWS RDS PostgreSQL
```bash
# Create RDS instance with:
# - Engine: PostgreSQL 14+
# - Instance class: db.t3.micro (minimum)
# - Storage: 20GB minimum
# - Multi-AZ: Yes (for production)
# - Backup retention: 7 days minimum
```

#### Google Cloud SQL
```bash
# Create Cloud SQL instance with:
# - Database version: PostgreSQL 14
# - Machine type: db-f1-micro (minimum)
# - Storage: 10GB minimum
# - Automated backups: Enabled
```

#### Azure Database for PostgreSQL
```bash
# Create Azure Database with:
# - Version: PostgreSQL 14
# - Compute tier: Basic (minimum)
# - Storage: 5GB minimum
# - Backup retention: 7 days minimum
```

## Step 2: Environment Configuration

Create production `.env` file:

```env
# Production Database URL
DATABASE_URL="postgresql://username:password@your-db-host:5432/report_gen?sslmode=require&connection_limit=20&pool_timeout=20"

# Application Configuration
NODE_ENV="production"
PORT=3000

# Security (Generate strong secrets)
JWT_SECRET="your-super-secure-jwt-secret-min-32-chars"
ENCRYPTION_KEY="your-32-character-encryption-key-here"

# SSL Configuration (if using custom certificates)
DB_SSL_CERT_PATH="/path/to/client-cert.pem"
DB_SSL_KEY_PATH="/path/to/client-key.pem"
DB_SSL_CA_PATH="/path/to/ca-cert.pem"
```

## Step 3: SSL Configuration

### For Cloud Databases
Most cloud providers automatically handle SSL. Ensure your connection string includes `sslmode=require`.

### For Self-Hosted PostgreSQL
```bash
# Generate SSL certificates
sudo openssl req -new -x509 -days 365 -nodes -text -out server.crt -keyout server.key -subj "/CN=your-domain.com"

# Configure PostgreSQL
echo "ssl = on" >> /etc/postgresql/14/main/postgresql.conf
echo "ssl_cert_file = '/path/to/server.crt'" >> /etc/postgresql/14/main/postgresql.conf
echo "ssl_key_file = '/path/to/server.key'" >> /etc/postgresql/14/main/postgresql.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Step 4: Database Migration

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

## Step 5: Performance Optimization

### Database Configuration
```sql
-- Optimize for production workload
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Reload configuration
SELECT pg_reload_conf();
```

### Connection Pooling
Consider using PgBouncer for connection pooling:

```bash
# Install PgBouncer
sudo apt install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
report_gen = host=localhost port=5432 dbname=report_gen

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

## Step 6: Backup Strategy

### Automated Backups
```bash
#!/bin/bash
# backup-script.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/amc-db"
DB_NAME="report_gen"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U amc_app_user -d $DB_NAME -f $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### Schedule with cron
```bash
# Add to crontab (daily at 2 AM)
0 2 * * * /path/to/backup-script.sh
```

## Step 7: Monitoring

### Database Monitoring
```sql
-- Create monitoring views
CREATE VIEW db_stats AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables;

-- Monitor slow queries
CREATE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;
```

### Application Health Check
```typescript
// Add to your application
app.get('/health/db', async (req, res) => {
  try {
    const health = await checkDatabaseHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});
```

## Step 8: Security Checklist

- [ ] Database user has minimal required privileges
- [ ] SSL/TLS encryption enabled
- [ ] Regular security updates applied
- [ ] Audit logging enabled
- [ ] Strong passwords used
- [ ] Network access restricted (firewall rules)
- [ ] Regular backups tested
- [ ] Monitoring and alerting configured

## Step 9: Deployment

### Using Docker (Recommended)
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build
RUN npm run db:generate

EXPOSE 3000
CMD ["npm", "start"]
```

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "amc-app" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check firewall rules
   - Verify connection string
   - Ensure database is running

2. **SSL Connection Failed**
   - Verify SSL certificates
   - Check sslmode parameter
   - Ensure SSL is enabled on database

3. **Migration Errors**
   - Check database permissions
   - Verify schema exists
   - Review migration logs

4. **Performance Issues**
   - Monitor slow queries
   - Check connection pool settings
   - Review database configuration

### Useful Commands

```bash
# Check database connections
SELECT * FROM pg_stat_activity WHERE datname = 'report_gen';

# Check database size
SELECT pg_size_pretty(pg_database_size('report_gen'));

# Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Vacuum and analyze
VACUUM ANALYZE;
```