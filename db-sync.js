const fs = require("fs");
const path = require("path");

try {
  require("dotenv").config();
} catch {
  // dotenv is optional at runtime if environment variables are already set.
}

let mysql;
try {
  mysql = require("mysql2/promise");
} catch (error) {
  console.error("db-sync failed: mysql2 is not installed in this project.");
  console.error("Run `npm install` first, then try `npm run db:sync` again.");
  process.exitCode = 1;
  process.exit(1);
}

const rootDir = __dirname;
const schemaPath = path.join(rootDir, "database", "schema.sql");
const seedPath = path.join(rootDir, "database", "seed.sql");

const config = {
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "sentinel",
  multipleStatements: true,
  charset: "utf8mb4",
};

function readSql(filePath) {
  return fs.readFileSync(filePath, "utf8").trim();
}

async function main() {
  const rootConnection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
  });

  await rootConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.database}\`
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;`
  );
  await rootConnection.end();

  const connection = await mysql.createConnection(config);

  const tableDrops = [
    "audit_logs",
    "verification_requests",
    "case_suspects",
    "evidence_chain_of_custody",
    "evidence",
    "case_history",
    "cameras",
    "suspects",
    "cases",
    "officers",
  ];

  await connection.query("SET FOREIGN_KEY_CHECKS = 0;");
  for (const table of tableDrops) {
    await connection.query(`DROP TABLE IF EXISTS \`${table}\`;`);
  }
  await connection.query("SET FOREIGN_KEY_CHECKS = 1;");

  await connection.query(readSql(schemaPath));
  await connection.query(readSql(seedPath));

  await connection.end();

  console.log(`Sentinel database synced into MySQL database "${config.database}".`);
}

main().catch((error) => {
  console.error("db-sync failed:");
  if (error && (error.code === "ER_ACCESS_DENIED_ERROR" || /Access denied/i.test(error.message || ""))) {
    console.error("MySQL rejected the credentials from your .env file.");
    console.error("Set MYSQL_USER and MYSQL_PASSWORD to a MySQL account that can create databases and tables.");
    console.error(`Target database: ${config.database} on ${config.host}:${config.port}`);
    return;
  }
  console.error(error.message || error);
  process.exitCode = 1;
});
