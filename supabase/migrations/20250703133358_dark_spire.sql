-- PostgreSQL Database Setup Script for AMC Market Fee Management
-- Run this script as a PostgreSQL superuser to set up the database

-- Create database
CREATE DATABASE report_gen
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Connect to the new database
\c report_gen;

-- Create application user with limited privileges
CREATE USER amc_app_user WITH PASSWORD 'secure_password_change_in_production';

-- Grant necessary privileges
GRANT CONNECT ON DATABASE report_gen TO amc_app_user;
GRANT USAGE ON SCHEMA public TO amc_app_user;
GRANT CREATE ON SCHEMA public TO amc_app_user;

-- Grant privileges on all tables (current and future)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO amc_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO amc_app_user;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- Create custom functions for audit logging
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to generate financial year
CREATE OR REPLACE FUNCTION get_financial_year(input_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
    year_start INTEGER;
    year_end INTEGER;
BEGIN
    IF EXTRACT(MONTH FROM input_date) >= 4 THEN
        year_start := EXTRACT(YEAR FROM input_date);
        year_end := year_start + 1;
    ELSE
        year_end := EXTRACT(YEAR FROM input_date);
        year_start := year_end - 1;
    END IF;
    
    RETURN year_start || '-' || RIGHT(year_end::TEXT, 2);
END;
$$ LANGUAGE plpgsql;

-- Create function for soft delete
CREATE OR REPLACE FUNCTION soft_delete_record(table_name TEXT, record_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    sql_query TEXT;
BEGIN
    sql_query := format('UPDATE %I SET deleted_at = CURRENT_TIMESTAMP, is_active = false WHERE id = $1', table_name);
    EXECUTE sql_query USING record_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Performance optimization settings
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Security settings
ALTER SYSTEM SET log_statement = 'mod'; -- Log all modifications
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Reload configuration
SELECT pg_reload_conf();

-- Create backup role
CREATE ROLE backup_role;
GRANT USAGE ON SCHEMA public TO backup_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_role;

-- Create read-only role for reporting
CREATE ROLE readonly_role;
GRANT USAGE ON SCHEMA public TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_role;

COMMENT ON DATABASE report_gen IS 'AMC Market Fee Management System Database';
COMMENT ON ROLE amc_app_user IS 'Application user for AMC Market Fee Management System';
COMMENT ON ROLE backup_role IS 'Role for database backup operations';
COMMENT ON ROLE readonly_role IS 'Read-only role for reporting and analytics';