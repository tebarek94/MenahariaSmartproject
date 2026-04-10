import mysql from "mysql2";

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "menahariya_smart",
  connectTimeout: 10000,
});

db.connect((err) => {
  if (err) {
    console.error("=================================");
    console.error("DATABASE CONNECTION FAILED:");
    console.error("=================================");
    console.error("Error:", err.message);
    console.error("Code:", err.code);
    console.error("=================================");
    console.error("TROUBLESHOOTING STEPS:");
    console.error("1. Make sure MySQL is installed and running");
    console.error("2. Check if the database 'menahariya_smart' exists");
    console.error("3. Verify your MySQL credentials in .env file");
    console.error("4. On Windows, check if MySQL service is running");
    console.error("=================================");
    console.error("To start MySQL on Windows:");
    console.error("  net start mysql80  (or mysql57, depending on version)");
    console.error("  Or use XAMPP/WAMP control panel");
    console.error("=================================");
    console.error("To create database:");
    console.error("  CREATE DATABASE menahariya_smart;");
    console.error("=================================");
    console.error("Server will continue running but database operations will fail");
    console.error("=================================");
  } else {
    console.log("MySQL Connected successfully to database: menahariya_smart");
  }
});

// Handle connection errors
db.on('error', (err) => {
  console.error('Database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was closed. Attempting to reconnect...');
    // Attempt to reconnect
    db.connect((err) => {
      if (err) {
        console.error('Reconnection failed:', err);
      } else {
        console.log('Database reconnected successfully');
      }
    });
  }
});

/** Promise wrapper for CRUD modules (callbacks remain on default export). */
export function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db || db.state === 'disconnected') {
      reject(new Error('Database connection is not established. Please check MySQL server.'));
      return;
    }
    
    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('Query error:', err);
        console.error('SQL:', sql);
        console.error('Params:', params);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

export default db;
