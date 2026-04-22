import { validateExpression, safeEvaluateMath, safeEvaluateCondition } from '../../utils/safe-eval';

describe('validateExpression', () => {
  it('should allow safe math expressions', () => {
    expect(validateExpression('a + b').valid).toBe(true);
    expect(validateExpression('x * y / z').valid).toBe(true);
    expect(validateExpression('(a - b) * 2').valid).toBe(true);
  });

  it('should block require keyword', () => {
    expect(validateExpression('require("fs")').valid).toBe(false);
  });

  it('should block eval keyword', () => {
    expect(validateExpression('eval("1+1")').valid).toBe(false);
  });

  it('should block Function constructor', () => {
    expect(validateExpression('Function("return 1")').valid).toBe(false);
  });

  it('should block prototype access', () => {
    expect(validateExpression('obj.__proto__').valid).toBe(false);
  });

  it('should block process access', () => {
    expect(validateExpression('process.exit(1)').valid).toBe(false);
  });

  it('should block string literals', () => {
    expect(validateExpression('"hello"').valid).toBe(false);
  });

  it('should return valid=true for empty/undefined input', () => {
    expect(validateExpression('').valid).toBe(true);
    expect(validateExpression(undefined as any).valid).toBe(true);
  });
});

describe('safeEvaluateMath', () => {
  it('should evaluate simple math', () => {
    expect(safeEvaluateMath('a + b', { a: 1, b: 2 })).toBe(3);
  });

  it('should evaluate complex expressions', () => {
    expect(safeEvaluateMath('(x + y) * z', { x: 2, y: 3, z: 4 })).toBe(20);
  });

  it('should return null for NaN results', () => {
    expect(safeEvaluateMath('0 / 0', {})).toBeNull();
  });

  it('should throw for invalid expressions', () => {
    expect(() => safeEvaluateMath('require("fs")', {})).toThrow();
  });
});

describe('safeEvaluateCondition', () => {
  it('should evaluate simple conditions', () => {
    expect(safeEvaluateCondition('item.value > 10', { value: 15 })).toBe(true);
    expect(safeEvaluateCondition('item.value > 10', { value: 5 })).toBe(false);
  });

  it('should evaluate boolean conditions', () => {
    expect(safeEvaluateCondition('item.active === true', { active: true })).toBe(true);
  });

  it('should throw for invalid conditions', () => {
    expect(() => safeEvaluateCondition('process.exit()', {})).toThrow();
  });
});
