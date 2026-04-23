import { validateSmbPath } from '../../utils/smb-client';

describe('validateSmbPath', () => {
  it('should allow valid paths', () => {
    expect(validateSmbPath('share\\folder\\file.txt')).toBe('share\\folder\\file.txt');
    expect(validateSmbPath('folder/file.txt')).toBe('folder\\file.txt');
    expect(validateSmbPath('simple')).toBe('simple');
  });

  it('should convert forward slashes to backslashes', () => {
    expect(validateSmbPath('folder/subfolder/file.txt')).toBe('folder\\subfolder\\file.txt');
  });

  it('should reject paths with double quotes', () => {
    expect(() => validateSmbPath('folder"evil')).toThrow('Invalid characters in SMB path');
  });

  it('should reject paths with semicolons', () => {
    expect(() => validateSmbPath('folder;cmd')).toThrow('Invalid characters in SMB path');
  });

  it('should reject paths with pipe', () => {
    expect(() => validateSmbPath('folder|cmd')).toThrow('Invalid characters in SMB path');
  });

  it('should reject paths with ampersand', () => {
    expect(() => validateSmbPath('folder&cmd')).toThrow('Invalid characters in SMB path');
  });

  it('should reject paths with dollar sign', () => {
    expect(() => validateSmbPath('folder$var')).toThrow('Invalid characters in SMB path');
  });

  it('should reject paths with backtick', () => {
    expect(() => validateSmbPath('folder`cmd')).toThrow('Invalid characters in SMB path');
  });

  it('should reject paths with newlines', () => {
    expect(() => validateSmbPath('folder\ncmd')).toThrow('Invalid characters in SMB path');
    expect(() => validateSmbPath('folder\rcmd')).toThrow('Invalid characters in SMB path');
  });

  it('should reject paths with null byte', () => {
    expect(() => validateSmbPath('folder\x00cmd')).toThrow('Invalid characters in SMB path');
  });

  it('should include custom name in error message', () => {
    expect(() => validateSmbPath('bad"path', 'remotePath')).toThrow('Invalid characters in SMB remotePath');
  });
});
