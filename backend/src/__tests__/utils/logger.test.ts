import logger from '../../utils/logger';

describe('logger', () => {
  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should have standard log levels', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should log without throwing', () => {
    expect(() => {
      logger.info('Test info message');
      logger.error('Test error message');
      logger.warn('Test warning message');
    }).not.toThrow();
  });
});

describe('logStream', () => {
  it('should be defined', () => {
    const { logStream } = require('../../utils/logger');
    expect(logStream).toBeDefined();
    expect(typeof logStream.write).toBe('function');
  });

  it('should write logs without throwing', () => {
    const { logStream } = require('../../utils/logger');
    expect(() => {
      logStream.write('Test stream message\n');
    }).not.toThrow();
  });
});
