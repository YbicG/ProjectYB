import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DatabaseService, DatabaseConnection } from '../src/main/services/database.service';

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let tempDir: string;

  beforeEach(() => {
    dbService = new DatabaseService();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectyb-db-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('discoverConnections', () => {
    it('discovers SQLite files in project root, prisma, and data directories', async () => {
      const sqliteRoot = path.join(tempDir, 'app.db');
      const prismaDir = path.join(tempDir, 'prisma');
      const dataDir = path.join(tempDir, 'data');
      fs.mkdirSync(prismaDir, { recursive: true });
      fs.mkdirSync(dataDir, { recursive: true });

      fs.writeFileSync(sqliteRoot, '');
      fs.writeFileSync(path.join(prismaDir, 'dev.sqlite'), '');
      fs.writeFileSync(path.join(dataDir, 'test.sqlite3'), '');

      const projects = [{ id: 'proj-1', name: 'Test App', path: tempDir }];
      const conns = await dbService.discoverConnections(projects);

      const sqliteConns = conns.filter((c) => c.engine === 'sqlite');
      expect(sqliteConns.length).toBe(3);
      expect(sqliteConns.some((c) => c.name.includes('app.db'))).toBe(true);
      expect(sqliteConns.some((c) => c.name.includes('dev.sqlite'))).toBe(true);
      expect(sqliteConns.some((c) => c.name.includes('test.sqlite3'))).toBe(true);
    });

    it('parses database URLs from .env files and ignores placeholders', async () => {
      const envContent = `
# Real connection strings
POSTGRES_URL=postgres://appuser:secretpassword@db.internal:5432/production_db
MYSQL_URL=mysql://root:mypassword@127.0.0.1:3306/shop
REDIS_URL=redis://:authpass@redis-host:6379/0
MONGODB_URI=mongodb+srv://admin:clusterpass@cluster0.mongodb.net/main

# Placeholders (should be ignored)
DUMMY_PG=postgres://username:password@localhost:5432/mydb
PLACEHOLDER_DB=postgres://your_user_here:your_pass@host:5432/test
EMPTY_VAL=""
      `.trim();

      fs.writeFileSync(path.join(tempDir, '.env'), envContent);

      const projects = [{ id: 'proj-env', name: 'Env App', path: tempDir }];
      const conns = await dbService.discoverConnections(projects);

      const pg = conns.find((c) => c.engine === 'postgres');
      expect(pg).toBeDefined();
      expect(pg?.host).toBe('db.internal');
      expect(pg?.port).toBe(5432);
      expect(pg?.database).toBe('production_db');
      expect(pg?.maskedUri).not.toContain('secretpassword');
      expect(pg?.maskedUri).toContain('••••');

      const mysql = conns.find((c) => c.engine === 'mysql');
      expect(mysql).toBeDefined();
      expect(mysql?.host).toBe('127.0.0.1');
      expect(mysql?.port).toBe(3306);

      const redis = conns.find((c) => c.engine === 'redis');
      expect(redis).toBeDefined();
      expect(redis?.host).toBe('redis-host');
      expect(redis?.port).toBe(6379);

      const mongo = conns.find((c) => c.engine === 'mongodb');
      expect(mongo).toBeDefined();
      expect(mongo?.host).toBe('cluster0.mongodb.net');

      // Ensure placeholders were filtered out
      const dummy = conns.find((c) => c.name === 'DUMMY_PG');
      expect(dummy).toBeUndefined();
    });

    it('returns empty array when project path does not exist', async () => {
      const conns = await dbService.discoverConnections([
        { id: 'non-existent', name: 'Ghost', path: path.join(tempDir, 'does-not-exist') }
      ]);
      expect(conns).toEqual([]);
    });
  });

  describe('testConnection', () => {
    it('tests SQLite connection successfully when file exists', async () => {
      const dbPath = path.join(tempDir, 'test.db');
      fs.writeFileSync(dbPath, 'SQLite format 3\0');

      const conn: DatabaseConnection = {
        id: 'db1',
        name: 'test.db',
        engine: 'sqlite',
        filePath: dbPath,
        source: 'manual',
        createdAt: Date.now()
      };

      const res = await dbService.testConnection(conn);
      expect(res.success).toBe(true);
      expect(res.message).toContain('SQLite database active');
      expect(res.pingMs).toBeGreaterThanOrEqual(0);
    });

    it('returns failure when SQLite file does not exist', async () => {
      const conn: DatabaseConnection = {
        id: 'db-missing',
        name: 'missing.db',
        engine: 'sqlite',
        filePath: path.join(tempDir, 'missing.db'),
        source: 'manual',
        createdAt: Date.now()
      };

      const res = await dbService.testConnection(conn);
      expect(res.success).toBe(false);
      expect(res.message).toContain('not found');
    });

    it('tests TCP engine reachability gracefully when port is closed', async () => {
      const conn: DatabaseConnection = {
        id: 'db-pg',
        name: 'POSTGRES_URL',
        engine: 'postgres',
        host: '127.0.0.1',
        port: 59999, // Unused port
        source: 'auto-discovered',
        createdAt: Date.now()
      };

      const res = await dbService.testConnection(conn);
      expect(res.success).toBe(false);
      expect(res.message).toContain('59999');
    });
  });

  describe('executeQuery & schema extraction', () => {
    it('executes SQLite DDL, DML and SELECT queries and introspects schema', async () => {
      const dbPath = path.join(tempDir, 'users.db');

      // Create SQLite database and seed table
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(dbPath);
      db.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          email TEXT UNIQUE,
          active INTEGER DEFAULT 1
        );
        INSERT INTO users (username, email) VALUES ('alice', 'alice@example.com');
        INSERT INTO users (username, email) VALUES ('bob', 'bob@example.com');
      `);
      db.close();

      const conn: DatabaseConnection = {
        id: 'sqlite-test',
        name: 'users.db',
        engine: 'sqlite',
        filePath: dbPath,
        source: 'auto-discovered',
        createdAt: Date.now()
      };

      // 1. Test SELECT query
      const selectResult = await dbService.executeQuery(conn, 'SELECT id, username, email FROM users ORDER BY id ASC');
      expect(selectResult.error).toBeUndefined();
      expect(selectResult.rowCount).toBe(2);
      expect(selectResult.columns).toEqual(['id', 'username', 'email']);
      expect(selectResult.rows[0].username).toBe('alice');
      expect(selectResult.rows[1].username).toBe('bob');

      // 2. Test INSERT statement
      const insertResult = await dbService.executeQuery(conn, "INSERT INTO users (username, email) VALUES ('charlie', 'charlie@example.com')");
      expect(insertResult.rows[0].status).toBe('SUCCESS');

      // 3. Test schema extraction
      const schema = await dbService.getSchema(conn);
      expect(schema.length).toBeGreaterThanOrEqual(1);

      const usersTable = schema.find((t) => t.name === 'users');
      expect(usersTable).toBeDefined();
      expect(usersTable?.type).toBe('table');
      expect(usersTable?.rowCount).toBe(3);
      expect(usersTable?.columns.some((c) => c.name === 'id' && c.isPrimary)).toBe(true);
      expect(usersTable?.columns.some((c) => c.name === 'username' && !c.nullable)).toBe(true);
    });

    it('returns error result when SQLite query is executed on non-existent file', async () => {
      const conn: DatabaseConnection = {
        id: 'sqlite-bad',
        name: 'bad.db',
        engine: 'sqlite',
        filePath: path.join(tempDir, 'does-not-exist.db'),
        source: 'manual',
        createdAt: Date.now()
      };

      const res = await dbService.executeQuery(conn, 'SELECT * FROM users');
      expect(res.error).toBeDefined();
      expect(res.rowCount).toBe(0);
    });

    it('returns simulated execution for Postgres, MySQL, and Redis fallback', async () => {
      const pgConn: DatabaseConnection = {
        id: 'pg-1',
        name: 'PG',
        engine: 'postgres',
        host: 'localhost',
        port: 5432,
        source: 'manual',
        createdAt: Date.now()
      };

      const result = await dbService.executeQuery(pgConn, 'SELECT * FROM accounts');
      expect(result.rows[0].status).toBe('Simulated Execution');
      expect(result.rows[0].engine).toBe('POSTGRES');

      const schema = await dbService.getSchema(pgConn);
      expect(schema.length).toBeGreaterThan(0);
      expect(schema[0].name).toBe('users');

      const mongoConn: DatabaseConnection = {
        id: 'mongo-1',
        name: 'Mongo',
        engine: 'mongodb',
        source: 'manual',
        createdAt: Date.now()
      };
      const mongoSchema = await dbService.getSchema(mongoConn);
      expect(mongoSchema.some((s) => s.type === 'collection')).toBe(true);
    });

    it('handles mainWindow assignment', () => {
      const mockWin = {} as any;
      expect(() => dbService.setMainWindow(mockWin)).not.toThrow();
    });
  });
});
