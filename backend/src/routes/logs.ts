import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import { successResponse, errorResponse } from '../utils/response';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const logsDir = process.env.LOGS_DIR || '/app/logs';

// Allowed log files for security
const ALLOWED_LOGS = ['api', 'worker', 'scheduler', 'system'];
const MAX_LINES = 1000;

// Middleware to check admin
function adminMiddleware(req: AuthRequest, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return errorResponse(res, 'Admin access required', 403);
  }
  next();
}

// Get available log files
router.get('/', authMiddleware, adminMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const logs: { name: string; file: string; size: number; updated: Date }[] = [];
  
  for (const logName of ALLOWED_LOGS) {
    const logFile = path.join(logsDir, `${logName}-combined.log`);
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      logs.push({
        name: logName,
        file: `${logName}-combined.log`,
        size: stats.size,
        updated: stats.mtime
      });
    }
    
    const errorFile = path.join(logsDir, `${logName}-error.log`);
    if (fs.existsSync(errorFile)) {
      const stats = fs.statSync(errorFile);
      logs.push({
        name: `${logName}-errors`,
        file: `${logName}-error.log`,
        size: stats.size,
        updated: stats.mtime
      });
    }
  }

  return successResponse(res, {
    logs,
    directory: logsDir,
    timestamp: new Date().toISOString()
  });
}));

// Read log file contents
router.get('/:logName', authMiddleware, adminMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { logName } = req.params;
  const linesRaw = parseInt(req.query.lines as string, 10);
  const lines = Math.min(isNaN(linesRaw) ? 100 : linesRaw, MAX_LINES);
  const search = (req.query.search as string) || '';
  
  if (!ALLOWED_LOGS.includes(logName)) {
    return errorResponse(res, 'Invalid log name', 400);
  }
  
  const logFile = path.join(logsDir, `${logName}-combined.log`);
  
  if (!fs.existsSync(logFile)) {
    return successResponse(res, {
      logName,
      lines: 0,
      logs: [],
      timestamp: new Date().toISOString()
    });
  }

  const logLines: string[] = [];
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (search && !line.toLowerCase().includes(search.toLowerCase())) {
      continue;
    }
    logLines.push(line);
    
    if (logLines.length > lines) {
      logLines.shift();
    }
  }

  return successResponse(res, {
    logName,
    lines: logLines.length,
    logs: logLines,
    timestamp: new Date().toISOString()
  });
}));

// Download log file
router.get('/:logName/download', authMiddleware, adminMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { logName } = req.params;
  
  if (!ALLOWED_LOGS.includes(logName)) {
    return errorResponse(res, 'Invalid log name', 400);
  }
  
  const logFile = path.join(logsDir, `${logName}-combined.log`);
  
  if (!fs.existsSync(logFile)) {
    return errorResponse(res, 'Log file not found', 404);
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${logName}-logs.txt"`);
  
  const fileStream = fs.createReadStream(logFile);
  fileStream.pipe(res);
}));

// Clear log file (truncate)
router.delete('/:logName', authMiddleware, adminMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { logName } = req.params;
  
  if (!ALLOWED_LOGS.includes(logName)) {
    return errorResponse(res, 'Invalid log name', 400);
  }
  
  const logFile = path.join(logsDir, `${logName}-combined.log`);
  
  if (fs.existsSync(logFile)) {
    fs.truncateSync(logFile, 0);
  }

  return successResponse(res, { message: 'Log file cleared' });
}));

export default router;
