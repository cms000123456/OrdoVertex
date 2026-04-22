/**
 * Safe expression evaluator for workflow nodes.
 * Validates expressions before execution to prevent code injection.
 */

const BLOCKED_EXPRESSION_PATTERNS = [
  // Dangerous globals and keywords
  /\b(require|process|global|globalThis|module|exports|eval|Function|constructor|prototype|__proto__|window|document|navigator|fetch|XMLHttpRequest|WebSocket|import|export|default|class|extends|super|new|this|void|with|debugger|delete|in|instanceof|typeof|var|let|const|function|return|throw|try|catch|finally|if|else|for|while|do|switch|case|break|continue|label|goto|async|await|yield)\b/,
  // String literals (prevents payload construction)
  /["'`]/,
  // Backslash escapes
  /\\/,
  // Object literals and array method abuse
  /\{\s*\[?\s*__/,
  // Double underscore
  /__/,
];

/**
 * Validate that an expression only contains safe characters and keywords.
 * Returns true if the expression is safe to evaluate.
 */
export function validateExpression(expr: string): { valid: boolean; error?: string } {
  if (!expr || typeof expr !== 'string') {
    return { valid: true };
  }

  for (const pattern of BLOCKED_EXPRESSION_PATTERNS) {
    if (pattern.test(expr)) {
      return {
        valid: false,
        error: 'Expression contains unsafe characters or keywords. Only math/logic operators, variable names, and property access are allowed.',
      };
    }
  }

  return { valid: true };
}

/**
 * Safely evaluate a math expression with given variables.
 * Only allows arithmetic operations on numbers.
 */
export function safeEvaluateMath(
  expression: string,
  variables: Record<string, number>
): number | null {
  const validation = validateExpression(expression);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const varNames = Object.keys(variables);
  const varValues = Object.values(variables);

  try {
    const fn = new Function(...varNames, `"use strict"; return (${expression})`);
    const result = fn(...varValues);
    return typeof result === 'number' && !isNaN(result) ? result : null;
  } catch (e) {
    return null;
  }
}

/**
 * Safely evaluate a boolean condition against an item object.
 * Only allows comparisons and logical operators.
 */
export function safeEvaluateCondition(
  condition: string,
  item: Record<string, any>
): boolean {
  const validation = validateExpression(condition);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    const fn = new Function('item', `"use strict"; return (${condition})`);
    return !!fn(item);
  } catch (e) {
    return false;
  }
}
