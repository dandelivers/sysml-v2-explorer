export { parse }     from './parser.js';
export { transform } from './transform.js';
export { tokenize }  from './tokenizer.js';

/**
 * Convenience: parse text → { nodes, edges, errors }
 */
import { parse }     from './parser.js';
import { transform } from './transform.js';

export function parseSysML(text) {
  const { ast, errors } = parse(text);
  const { nodes, edges } = transform(ast);
  return { nodes, edges, errors };
}
