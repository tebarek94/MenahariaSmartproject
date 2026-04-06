import mysql from "mysql2";

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "menahariya_smart",
});

db.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err);
  } else {
    console.log("MySQL Connected");
  }
});

/** Promise wrapper for CRUD modules (callbacks remain on default export). */
export function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

export default db;
