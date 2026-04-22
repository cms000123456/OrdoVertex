import { NodeType } from '../../types';
// @ts-ignore
import { Pool as PostgresPool } from 'pg';
import * as mysql from 'mysql2/promise';
// @ts-ignore
import * as mssql from 'mssql';
import { Database as SQLiteDatabase } from 'sqlite3';
import { open } from 'sqlite';
import { prisma } from '../../prisma';
import { decryptJSON } from '../../utils/encryption';


// Connection pools cache
const postgresPools: Map<string, PostgresPool> = new Map();
const mysqlPools: Map<string, mysql.Pool> = new Map();
const mssqlPools: Map<string, mssql.ConnectionPool> = new Map();

// In-flight creation promises to prevent race conditions
const postgresPoolPromises: Map<string, Promise<PostgresPool>> = new Map();
const mysqlPoolPromises: Map<string, Promise<mysql.Pool>> = new Map();
const mssqlPoolPromises: Map<string, Promise<mssql.ConnectionPool>> = new Map();

async function getPostgresPool(connectionString: string): Promise<PostgresPool> {
  const existing = postgresPools.get(connectionString);
  if (existing) return existing;

  const inFlight = postgresPoolPromises.get(connectionString);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const pool = new PostgresPool({ connectionString });
    postgresPools.set(connectionString, pool);
    return pool;
  })();

  postgresPoolPromises.set(connectionString, promise);
  try {
    const pool = await promise;
    return pool;
  } finally {
    postgresPoolPromises.delete(connectionString);
  }
}

async function getMySQLPool(config: mysql.PoolOptions): Promise<mysql.Pool> {
  const key = JSON.stringify(config);
  const existing = mysqlPools.get(key);
  if (existing) return existing;

  const inFlight = mysqlPoolPromises.get(key);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const pool = mysql.createPool(config);
    mysqlPools.set(key, pool);
    return pool;
  })();

  mysqlPoolPromises.set(key, promise);
  try {
    const pool = await promise;
    return pool;
  } finally {
    mysqlPoolPromises.delete(key);
  }
}

async function getMSSQLPool(config: mssql.config): Promise<mssql.ConnectionPool> {
  const key = JSON.stringify(config);
  const existing = mssqlPools.get(key);
  if (existing) return existing;

  const inFlight = mssqlPoolPromises.get(key);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const pool = new mssql.ConnectionPool(config);
    await pool.connect();
    mssqlPools.set(key, pool);
    return pool;
  })();

  mssqlPoolPromises.set(key, promise);
  try {
    const pool = await promise;
    return pool;
  } finally {
    mssqlPoolPromises.delete(key);
  }
}

async function executePostgres(connectionString: string, query: string, parameters: any[]): Promise<any> {
  const pool = await getPostgresPool(connectionString);
  const result = await pool.query(query, parameters);
  return result.rows;
}

async function executeMySQL(config: mysql.PoolOptions, query: string, parameters: any[]): Promise<any> {
  const pool = await getMySQLPool(config);
  const [rows] = await pool.execute(query, parameters);
  return rows;
}

async function executeMSSQL(config: mssql.config, query: string, parameters: any[]): Promise<any> {
  const pool = await getMSSQLPool(config);
  const request = pool.request();
  
  // Add parameters
  parameters.forEach((param, index) => {
    request.input(`param${index + 1}`, param);
  });
  
  // Replace $1, $2, etc. or ? with @param1, @param2, etc.
  let mssqlQuery = query;
  if (query.includes('$')) {
    mssqlQuery = query.replace(/\$(\d+)/g, (match, num) => `@param${num}`);
  } else if (query.includes('?')) {
    let paramIndex = 0;
    mssqlQuery = query.replace(/\?/g, () => `@param${++paramIndex}`);
  }
  
  const result = await request.query(mssqlQuery);
  return result.recordset || { rowsAffected: result.rowsAffected };
}

async function executeSQLite(filePath: string, query: string, parameters: any[]): Promise<any> {
  const db = await open({
    filename: filePath,
    driver: SQLiteDatabase
  });
  try {
    if (query.trim().toLowerCase().startsWith('select')) {
      const result = await db.all(query, parameters);
      return result;
    } else {
      const result = await db.run(query, parameters);
      return { lastID: result.lastID, changes: result.changes };
    }
  } finally {
    await db.close();
  }
}

export const sqlDatabaseNode: NodeType = {
  name: 'sqlDatabase',
  displayName: 'SQL Database',
  description: 'Execute SQL queries against PostgreSQL, MySQL, MSSQL, or SQLite databases',
  icon: 'fa:database',
  category: 'Actions',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data for query parameters'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Query results'
    }
  ],
  properties: [
    {
      name: 'databaseType',
      displayName: 'Database Type',
      type: 'options',
      options: [
        { name: 'PostgreSQL', value: 'postgres' },
        { name: 'MySQL', value: 'mysql' },
        { name: 'Microsoft SQL Server', value: 'mssql' },
        { name: 'SQLite', value: 'sqlite' }
      ],
      default: 'postgres',
      description: 'Type of database to connect to'
    },
    {
      name: 'useCredential',
      displayName: 'Use Credential',
      type: 'boolean',
      default: false,
      description: 'Use a saved credential instead of manual connection settings'
    },
    {
      name: 'credentialId',
      displayName: 'Credential',
      type: 'resource',
      resourceType: 'credential',
      required: true,
      description: 'Select a saved database credential',
      displayOptions: {
        show: {
          useCredential: [true]
        }
      }
    },
    // MSSQL options
    {
      name: 'mssqlServer',
      displayName: 'Server',
      type: 'string',
      required: true,
      default: 'localhost',
      placeholder: 'localhost or localhost\\SQLEXPRESS',
      description: 'SQL Server address (can include instance name)',
      displayOptions: {
        show: {
          databaseType: ['mssql']
        }
      }
    },
    {
      name: 'mssqlPort',
      displayName: 'Port',
      type: 'number',
      required: false,
      placeholder: '1433',
      description: 'SQL Server port (leave empty for default)',
      displayOptions: {
        show: {
          databaseType: ['mssql']
        }
      }
    },
    {
      name: 'mssqlDatabase',
      displayName: 'Database',
      type: 'string',
      required: true,
      placeholder: 'master',
      description: 'Database name',
      displayOptions: {
        show: {
          databaseType: ['mssql']
        }
      }
    },
    {
      name: 'mssqlUser',
      displayName: 'User',
      type: 'string',
      required: true,
      placeholder: 'sa',
      description: 'SQL Server username',
      displayOptions: {
        show: {
          databaseType: ['mssql']
        }
      }
    },
    {
      name: 'mssqlPassword',
      displayName: 'Password',
      type: 'string',
      required: false,
      placeholder: 'Enter password',
      description: 'SQL Server password',
      displayOptions: {
        show: {
          databaseType: ['mssql']
        }
      }
    },
    {
      name: 'mssqlEncrypt',
      displayName: 'Encrypt Connection',
      type: 'boolean',
      default: true,
      description: 'Enable SSL/TLS encryption',
      displayOptions: {
        show: {
          databaseType: ['mssql']
        }
      }
    },
    {
      name: 'mssqlTrustServerCertificate',
      displayName: 'Trust Server Certificate',
      type: 'boolean',
      default: false,
      description: 'Trust self-signed certificates (disable for production)',
      displayOptions: {
        show: {
          databaseType: ['mssql']
        }
      }
    },
    // PostgreSQL options
    {
      name: 'postgresConnectionString',
      displayName: 'Connection String',
      type: 'string',
      required: true,
      placeholder: 'postgresql://user:password@localhost:5432/database',
      description: 'PostgreSQL connection string',
      displayOptions: {
        show: {
          databaseType: ['postgres']
        }
      }
    },
    // MySQL options
    {
      name: 'mysqlHost',
      displayName: 'Host',
      type: 'string',
      required: true,
      default: 'localhost',
      description: 'MySQL host',
      displayOptions: {
        show: {
          databaseType: ['mysql']
        }
      }
    },
    {
      name: 'mysqlPort',
      displayName: 'Port',
      type: 'number',
      required: true,
      default: 3306,
      description: 'MySQL port',
      displayOptions: {
        show: {
          databaseType: ['mysql']
        }
      }
    },
    {
      name: 'mysqlDatabase',
      displayName: 'Database',
      type: 'string',
      required: true,
      description: 'MySQL database name',
      displayOptions: {
        show: {
          databaseType: ['mysql']
        }
      }
    },
    {
      name: 'mysqlUser',
      displayName: 'User',
      type: 'string',
      required: true,
      description: 'MySQL username',
      displayOptions: {
        show: {
          databaseType: ['mysql']
        }
      }
    },
    {
      name: 'mysqlPassword',
      displayName: 'Password',
      type: 'string',
      required: false,
      placeholder: 'Enter password',
      description: 'MySQL password',
      displayOptions: {
        show: {
          databaseType: ['mysql']
        }
      }
    },
    // SQLite options
    {
      name: 'sqliteFilePath',
      displayName: 'File Path',
      type: 'string',
      required: true,
      default: ':memory:',
      placeholder: '/path/to/database.sqlite',
      description: 'Path to SQLite database file (use :memory: for in-memory)',
      displayOptions: {
        show: {
          databaseType: ['sqlite']
        }
      }
    },
    // Query options
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      options: [
        { name: 'Execute Query', value: 'executeQuery' },
        { name: 'Insert', value: 'insert' },
        { name: 'Update', value: 'update' },
        { name: 'Delete', value: 'delete' },
        { name: 'Select', value: 'select' }
      ],
      default: 'executeQuery',
      description: 'Type of SQL operation to perform'
    },
    {
      name: 'query',
      displayName: 'Query',
      type: 'multiline',
      required: true,
      placeholder: 'SELECT * FROM users WHERE id = $1',
      description: 'SQL query to execute. Use $1, $2, etc. for PostgreSQL/SQLite or ? for MySQL as parameter placeholders',
      displayOptions: {
        show: {
          operation: ['executeQuery']
        }
      }
    },
    {
      name: 'table',
      displayName: 'Table',
      type: 'string',
      required: true,
      placeholder: 'users',
      description: 'Table name',
      displayOptions: {
        show: {
          operation: ['insert', 'update', 'delete', 'select']
        }
      }
    },
    {
      name: 'columns',
      displayName: 'Columns',
      type: 'string',
      required: true,
      placeholder: 'name, email, age',
      description: 'Comma-separated list of columns',
      displayOptions: {
        show: {
          operation: ['insert', 'select']
        }
      }
    },
    {
      name: 'values',
      displayName: 'Values',
      type: 'json',
      required: true,
      default: {},
      placeholder: '{ "name": "John", "email": "john@example.com" }',
      description: 'Values to insert (JSON object)',
      displayOptions: {
        show: {
          operation: ['insert']
        }
      }
    },
    {
      name: 'where',
      displayName: 'Where Clause',
      type: 'string',
      required: false,
      placeholder: 'id = $1',
      description: 'WHERE clause conditions',
      displayOptions: {
        show: {
          operation: ['update', 'delete', 'select']
        }
      }
    },
    {
      name: 'updateData',
      displayName: 'Update Data',
      type: 'json',
      required: true,
      default: {},
      placeholder: '{ "name": "Jane", "age": 30 }',
      description: 'Data to update (JSON object)',
      displayOptions: {
        show: {
          operation: ['update']
        }
      }
    },
    {
      name: 'parameters',
      displayName: 'Parameters',
      type: 'json',
      required: false,
      default: [],
      placeholder: '[1, "value"]',
      description: 'Query parameters as JSON array'
    },
    {
      name: 'returnResults',
      displayName: 'Return Results',
      type: 'boolean',
      default: true,
      description: 'Whether to return query results'
    }
  ],
  execute: async (context) => {
    try {
      const databaseType = context.getNodeParameter('databaseType', 'postgres') as string;
      const operation = context.getNodeParameter('operation', 'executeQuery') as string;
      const returnResults = context.getNodeParameter('returnResults', true) as boolean;
      const parameters = context.getNodeParameter('parameters', []) as any[];
      const useCredential = context.getNodeParameter('useCredential', false) as boolean;

      let query: string;
      let queryParams: any[] = parameters;

      // Build query based on operation
      if (operation === 'executeQuery') {
        query = context.getNodeParameter('query', '') as string;
      } else if (operation === 'select') {
        const table = context.getNodeParameter('table', '') as string;
        const columns = context.getNodeParameter('columns', '*') as string;
        const whereConditions = context.getNodeParameter('whereConditions', []) as Array<{column: string, operator: string, value: any}>;
        
        // Validate table and column names (alphanumeric and underscores only)
        if (!/^[a-zA-Z0-9_]+$/.test(table)) {
          throw new Error('Invalid table name');
        }
        const safeColumns = columns.split(',').map(c => c.trim()).every(c => /^[a-zA-Z0-9_\*]+$/.test(c));
        if (!safeColumns) {
          throw new Error('Invalid column names');
        }
        
        query = `SELECT ${columns} FROM ${table}`;
        
        // Build safe WHERE clause from structured conditions
        if (whereConditions && whereConditions.length > 0) {
          const conditions: string[] = [];
          whereConditions.forEach((cond, index) => {
            // Validate column name
            if (!/^[a-zA-Z0-9_]+$/.test(cond.column)) {
              throw new Error(`Invalid column name: ${cond.column}`);
            }
            // Validate operator
            const allowedOperators = ['=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL'];
            if (!allowedOperators.includes(cond.operator.toUpperCase())) {
              throw new Error(`Invalid operator: ${cond.operator}`);
            }
            
            if (cond.operator.toUpperCase().includes('NULL')) {
              conditions.push(`${cond.column} ${cond.operator}`);
            } else {
              const paramIndex = index + 1;
              if (databaseType === 'mysql') {
                conditions.push(`${cond.column} ${cond.operator} ?`);
              } else if (databaseType === 'mssql') {
                conditions.push(`${cond.column} ${cond.operator} @param${paramIndex}`);
              } else {
                conditions.push(`${cond.column} ${cond.operator} $${paramIndex}`);
              }
              queryParams.push(cond.value);
            }
          });
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
      } else if (operation === 'insert') {
        const table = context.getNodeParameter('table', '') as string;
        const values = context.getNodeParameter('values', {}) as Record<string, any>;
        const columns = Object.keys(values);
        
        if (databaseType === 'mysql') {
          const placeholders = columns.map(() => '?').join(', ');
          query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
          queryParams = columns.map(col => values[col]);
        } else if (databaseType === 'mssql') {
          const placeholders = columns.map((_, i) => `@param${i + 1}`).join(', ');
          query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
          queryParams = columns.map(col => values[col]);
        } else {
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
          queryParams = columns.map(col => values[col]);
        }
      } else if (operation === 'update') {
        const table = context.getNodeParameter('table', '') as string;
        const updateData = context.getNodeParameter('updateData', {}) as Record<string, any>;
        const whereConditions = context.getNodeParameter('whereConditions', []) as Array<{column: string, operator: string, value: any}>;
        const columns = Object.keys(updateData);
        
        // Validate table and column names
        if (!/^[a-zA-Z0-9_]+$/.test(table)) {
          throw new Error('Invalid table name');
        }
        if (!columns.every(col => /^[a-zA-Z0-9_]+$/.test(col))) {
          throw new Error('Invalid column names');
        }
        
        let whereClause = '';
        const whereParams: any[] = [];
        
        // Build safe WHERE clause from structured conditions
        if (whereConditions && whereConditions.length > 0) {
          const conditions: string[] = [];
          whereConditions.forEach((cond, index) => {
            if (!/^[a-zA-Z0-9_]+$/.test(cond.column)) {
              throw new Error(`Invalid column name: ${cond.column}`);
            }
            const allowedOperators = ['=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL'];
            if (!allowedOperators.includes(cond.operator.toUpperCase())) {
              throw new Error(`Invalid operator: ${cond.operator}`);
            }
            
            if (cond.operator.toUpperCase().includes('NULL')) {
              conditions.push(`${cond.column} ${cond.operator}`);
            } else {
              if (databaseType === 'mysql') {
                conditions.push(`${cond.column} ${cond.operator} ?`);
              } else if (databaseType === 'mssql') {
                conditions.push(`${cond.column} ${cond.operator} @param${columns.length + index + 1}`);
              } else {
                conditions.push(`${cond.column} ${cond.operator} $${columns.length + index + 1}`);
              }
              whereParams.push(cond.value);
            }
          });
          whereClause = ` WHERE ${conditions.join(' AND ')}`;
        }
        
        if (databaseType === 'mysql') {
          const setClause = columns.map(col => `${col} = ?`).join(', ');
          query = `UPDATE ${table} SET ${setClause}${whereClause}`;
          queryParams = columns.map(col => updateData[col]).concat(whereParams);
        } else if (databaseType === 'mssql') {
          const setClause = columns.map((col, i) => `${col} = @param${i + 1}`).join(', ');
          query = `UPDATE ${table} SET ${setClause}${whereClause}`;
          queryParams = columns.map(col => updateData[col]).concat(whereParams);
        } else {
          const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
          query = `UPDATE ${table} SET ${setClause}${whereClause}`;
          queryParams = columns.map(col => updateData[col]).concat(whereParams);
        }
      } else if (operation === 'delete') {
        const table = context.getNodeParameter('table', '') as string;
        const whereConditions = context.getNodeParameter('whereConditions', []) as Array<{column: string, operator: string, value: any}>;
        
        // Validate table name
        if (!/^[a-zA-Z0-9_]+$/.test(table)) {
          throw new Error('Invalid table name');
        }
        
        query = `DELETE FROM ${table}`;
        
        // Build safe WHERE clause from structured conditions
        if (whereConditions && whereConditions.length > 0) {
          const conditions: string[] = [];
          whereConditions.forEach((cond, index) => {
            if (!/^[a-zA-Z0-9_]+$/.test(cond.column)) {
              throw new Error(`Invalid column name: ${cond.column}`);
            }
            const allowedOperators = ['=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL'];
            if (!allowedOperators.includes(cond.operator.toUpperCase())) {
              throw new Error(`Invalid operator: ${cond.operator}`);
            }
            
            if (cond.operator.toUpperCase().includes('NULL')) {
              conditions.push(`${cond.column} ${cond.operator}`);
            } else {
              const paramIndex = index + 1;
              if (databaseType === 'mysql') {
                conditions.push(`${cond.column} ${cond.operator} ?`);
              } else if (databaseType === 'mssql') {
                conditions.push(`${cond.column} ${cond.operator} @param${paramIndex}`);
              } else {
                conditions.push(`${cond.column} ${cond.operator} $${paramIndex}`);
              }
              queryParams.push(cond.value);
            }
          });
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
      } else {
        throw new Error(`Unknown operation: ${operation}`);
      }

      if (!query.trim()) {
        throw new Error('Query is required');
      }

      // Helper function to load credential data
      const loadCredentialData = async (): Promise<Record<string, any> | null> => {
        if (!useCredential) return null;
        
        const credentialId = context.getNodeParameter('credentialId', '') as string;
        if (!credentialId) return null;

        try {
          // Use userId from context to ensure users can only access their own credentials
          const credential = await prisma.credential.findFirst({
            where: { 
              id: credentialId,
              userId: context.userId
            }
          });

          if (!credential) return null;

          // Update last used timestamp
          await prisma.credential.update({
            where: { id: credentialId },
            data: { lastUsed: new Date() }
          });

          return decryptJSON(credential.data, credential.iv);
        } catch (error) {
          console.error('Error loading credential:', error);
          return null;
        }
      };

      // Load credential if enabled
      const credentialData = await loadCredentialData();

      // Execute query based on database type
      let result: any;
      
      if (databaseType === 'postgres') {
        let connectionString: string;
        
        if (useCredential && credentialData) {
          // Build connection string from credential
          const { host, port, database, user, password, ssl } = credentialData;
          const portStr = port ? `:${port}` : '';
          const sslParam = ssl ? '?sslmode=require' : '';
          connectionString = `postgresql://${user}:${password}@${host}${portStr}/${database}${sslParam}`;
        } else {
          connectionString = context.getNodeParameter('postgresConnectionString', '') as string;
        }
        
        if (!connectionString) {
          throw new Error('PostgreSQL connection string is required');
        }
        // Convert MySQL-style ? placeholders to PostgreSQL $1, $2, etc.
        let pgQuery = query;
        if (databaseType === 'postgres' && query.includes('?')) {
          let paramIndex = 0;
          pgQuery = query.replace(/\?/g, () => `$${++paramIndex}`);
        }
        result = await executePostgres(connectionString, pgQuery, queryParams);
      } else if (databaseType === 'mysql') {
        let config: mysql.PoolOptions;
        
        if (useCredential && credentialData) {
          config = {
            host: credentialData.host || 'localhost',
            port: credentialData.port || 3306,
            database: credentialData.database,
            user: credentialData.user,
            password: credentialData.password || undefined
          };
        } else {
          config = {
            host: context.getNodeParameter('mysqlHost', 'localhost') as string,
            port: context.getNodeParameter('mysqlPort', 3306) as number,
            database: context.getNodeParameter('mysqlDatabase', '') as string,
            user: context.getNodeParameter('mysqlUser', '') as string,
            password: context.getNodeParameter('mysqlPassword', '') as string || undefined
          };
        }
        
        if (!config.database || !config.user) {
          throw new Error('MySQL database and user are required');
        }
        
        // Convert PostgreSQL-style $1, $2 placeholders to MySQL ?
        let mysqlQuery = query;
        if (query.includes('$')) {
          mysqlQuery = query.replace(/\$\d+/g, '?');
        }
        result = await executeMySQL(config, mysqlQuery, queryParams);
      } else if (databaseType === 'mssql') {
        let config: mssql.config;
        
        if (useCredential && credentialData) {
          config = {
            server: credentialData.host || 'localhost',
            port: credentialData.port,
            database: credentialData.database,
            user: credentialData.user,
            password: credentialData.password || undefined,
            options: {
              encrypt: credentialData.ssl !== false,
              trustServerCertificate: false
            }
          };
        } else {
          const port = context.getNodeParameter('mssqlPort', undefined) as number | undefined;
          config = {
            server: context.getNodeParameter('mssqlServer', 'localhost') as string,
            database: context.getNodeParameter('mssqlDatabase', '') as string,
            user: context.getNodeParameter('mssqlUser', '') as string,
            password: context.getNodeParameter('mssqlPassword', '') as string || undefined,
            options: {
              encrypt: context.getNodeParameter('mssqlEncrypt', true) as boolean,
              trustServerCertificate: context.getNodeParameter('mssqlTrustServerCertificate', false) as boolean
            }
          };
          if (port) config.port = port;
        }
        
        if (!config.database || !config.user) {
          throw new Error('MSSQL database and user are required');
        }
        
        result = await executeMSSQL(config, query, queryParams);
      } else if (databaseType === 'sqlite') {
        const filePath = context.getNodeParameter('sqliteFilePath', ':memory:') as string;
        // Convert MySQL-style ? placeholders to SQLite $1, $2, etc.
        let sqliteQuery = query;
        if (query.includes('?')) {
          let paramIndex = 0;
          sqliteQuery = query.replace(/\?/g, () => `$${++paramIndex}`);
        }
        result = await executeSQLite(filePath, sqliteQuery, queryParams);
      } else {
        throw new Error(`Unsupported database type: ${databaseType}`);
      }

      if (returnResults) {
        return {
          success: true,
          output: [{
            json: {
              result,
              rowCount: Array.isArray(result) ? result.length : 1
            }
          }]
        };
      } else {
        return {
          success: true,
          output: [{
            json: {
              success: true
            }
          }]
        };
      }
    } catch (error: any) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: {
              error: error.message
            }
          }]
        };
      }
      throw error;
    }
  }
};
