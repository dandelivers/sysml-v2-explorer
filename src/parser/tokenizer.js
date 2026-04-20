export const T = {
  KEYWORD:     'KEYWORD',
  IDENT:       'IDENT',
  STRING:      'STRING',
  NUMBER:      'NUMBER',
  LBRACE:      'LBRACE',      // {
  RBRACE:      'RBRACE',      // }
  COLON:       'COLON',       // :
  SEMI:        'SEMI',        // ;
  COMMA:       'COMMA',       // ,
  LBRACKET:    'LBRACKET',    // [
  RBRACKET:    'RBRACKET',    // ]
  LPAREN:      'LPAREN',      // (
  RPAREN:      'RPAREN',      // )
  SPECIALIZES: 'SPECIALIZES', // :>
  REDEFINES:   'REDEFINES',   // :>>
  ARROW:       'ARROW',       // ->
  AT:          'AT',          // @
  STAR:        'STAR',        // *
  DOT:         'DOT',         // .
  DOTDOT:      'DOTDOT',      // ..
  EQUALS:      'EQUALS',      // =
  EOF:         'EOF',
};

const KEYWORDS = new Set([
  'package', 'part', 'def', 'action', 'requirement', 'interface',
  'connection', 'flow', 'state', 'metadata', 'use', 'case',
  'end', 'in', 'out', 'inout', 'doc', 'about', 'abstract',
  'readonly', 'derived', 'all', 'ordered', 'nonunique',
  'specializes', 'redefines', 'subsets', 'attribute', 'item',
  'satisfy', 'verify', 'allocate', 'expose',
  'to', 'by', 'calc', 'constraint', 'occurrence', 'individual',
]);

export function tokenize(input) {
  const tokens = [];
  let i = 0;
  let line = 1;
  const len = input.length;

  function addToken(type, value) {
    tokens.push({ type, value, line });
  }

  while (i < len) {
    const ch = input[i];

    if (ch === '\n') { line++; i++; continue; }
    if (/\s/.test(ch)) { i++; continue; }

    // Single-line comment
    if (ch === '/' && input[i + 1] === '/') {
      while (i < len && input[i] !== '\n') i++;
      continue;
    }

    // Block comment
    if (ch === '/' && input[i + 1] === '*') {
      i += 2;
      while (i < len && !(input[i] === '*' && input[i + 1] === '/')) {
        if (input[i] === '\n') line++;
        i++;
      }
      i += 2;
      continue;
    }

    // String literals
    if (ch === '"' || ch === "'") {
      const q = ch;
      i++;
      let str = '';
      while (i < len && input[i] !== q) {
        if (input[i] === '\\') { i++; }
        str += input[i++];
      }
      i++;
      addToken(T.STRING, str);
      continue;
    }

    // Multi-char operators — longest match first
    if (ch === ':' && input[i + 1] === '>' && input[i + 2] === '>') {
      addToken(T.REDEFINES, ':>>'); i += 3; continue;
    }
    if (ch === ':' && input[i + 1] === '>') {
      addToken(T.SPECIALIZES, ':>'); i += 2; continue;
    }
    if (ch === '-' && input[i + 1] === '>') {
      addToken(T.ARROW, '->'); i += 2; continue;
    }
    if (ch === '.' && input[i + 1] === '.') {
      addToken(T.DOTDOT, '..'); i += 2; continue;
    }

    // Single-char tokens
    const singles = {
      '{': T.LBRACE,   '}': T.RBRACE,   ':': T.COLON,    ';': T.SEMI,
      ',': T.COMMA,    '[': T.LBRACKET, ']': T.RBRACKET,
      '(': T.LPAREN,   ')': T.RPAREN,   '@': T.AT,
      '*': T.STAR,     '.': T.DOT,      '=': T.EQUALS,
    };
    if (singles[ch]) { addToken(singles[ch], ch); i++; continue; }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(ch)) {
      let word = '';
      while (i < len && /[a-zA-Z0-9_]/.test(input[i])) word += input[i++];
      addToken(KEYWORDS.has(word) ? T.KEYWORD : T.IDENT, word);
      continue;
    }

    // Numbers (integer or decimal)
    if (/[0-9]/.test(ch)) {
      let num = '';
      while (i < len && /[0-9]/.test(input[i])) num += input[i++];
      if (input[i] === '.' && input[i + 1] !== '.') {
        num += input[i++];
        while (i < len && /[0-9]/.test(input[i])) num += input[i++];
      }
      addToken(T.NUMBER, num);
      continue;
    }

    // Skip unrecognised characters silently
    i++;
  }

  addToken(T.EOF, '');
  return tokens;
}
