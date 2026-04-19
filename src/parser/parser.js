import { tokenize, T } from './tokenizer.js';

/**
 * Parse a SysML V2 subset into an AST.
 * Returns { ast, errors } — errors is an array so callers can show
 * inline diagnostics without crashing.
 *
 * Supported top-level constructs:
 *   package, part def, action def, requirement def,
 *   interface def, connection def, metadata def
 *
 * Supported members (inside a def body):
 *   part usage, action usage, requirement usage,
 *   interface usage, end, attribute, doc
 */
export function parse(input) {
  const tokens = tokenize(input);
  let pos = 0;
  const errors = [];

  // ── Cursor helpers ──────────────────────────────────────────────────────────

  function peek(offset = 0) { return tokens[Math.min(pos + offset, tokens.length - 1)]; }
  function consume()        { return tokens[pos++]; }

  function check(type, value) {
    const t = peek();
    return t.type === type && (value === undefined || t.value === value);
  }

  function eat(type, value) {
    if (check(type, value)) { consume(); return true; }
    return false;
  }

  function expect(type, value) {
    if (check(type, value)) return consume();
    const t = peek();
    errors.push({ line: t.line, message: `Expected ${value ?? type}, got '${t.value}'` });
    return null;
  }

  // ── Name (identifier, keyword used as name, or quoted string) ───────────────

  function parseName() {
    const t = peek();
    if (t.type === T.STRING || t.type === T.IDENT || t.type === T.KEYWORD) {
      return consume().value;
    }
    errors.push({ line: t.line, message: `Expected a name, got '${t.value}'` });
    return null;
  }

  // ── Specialization  :> SuperType ────────────────────────────────────────────

  function parseSpecialization() {
    if (!eat(T.SPECIALIZES)) return null;
    return parseName();
  }

  // ── Multiplicity  [n]  [n..*]  [*] ──────────────────────────────────────────

  function parseMultiplicity() {
    if (!check(T.LBRACKET)) return null;
    consume(); // [
    let lower = null, upper = null;
    if (check(T.NUMBER))    lower = consume().value;
    else if (check(T.STAR)) { consume(); lower = upper = '*'; }
    if (eat(T.DOTDOT)) {
      if (check(T.NUMBER))    upper = consume().value;
      else if (check(T.STAR)) { consume(); upper = '*'; }
    } else {
      upper = lower;
    }
    expect(T.RBRACKET);
    return { lower, upper };
  }

  // ── Skip an unknown/unsupported block { ... } ────────────────────────────────

  function skipBlock() {
    if (!check(T.LBRACE)) return;
    consume();
    let depth = 1;
    while (pos < tokens.length && depth > 0) {
      const t = consume();
      if (t.type === T.LBRACE)  depth++;
      if (t.type === T.RBRACE)  depth--;
      if (t.type === T.EOF)     break;
    }
  }

  // ── Skip to the next ; or } (error recovery) ────────────────────────────────

  function skipToSync() {
    while (!check(T.SEMI) && !check(T.RBRACE) && !check(T.EOF)) consume();
    eat(T.SEMI);
  }

  // ── Member body  { member* } ─────────────────────────────────────────────────

  function parseBody() {
    if (!eat(T.LBRACE)) return [];
    const members = [];
    while (!check(T.RBRACE) && !check(T.EOF)) {
      const m = parseMember();
      if (m) members.push(m);
    }
    expect(T.RBRACE);
    return members;
  }

  // ── A single member inside a def body ────────────────────────────────────────

  function parseMember() {
    const t = peek();

    if (t.type !== T.KEYWORD && t.type !== T.IDENT) {
      errors.push({ line: t.line, message: `Unexpected token '${t.value}' in body` });
      skipToSync();
      return null;
    }

    const kw = t.value;

    // doc  /* ... */  or  doc "string"
    if (kw === 'doc') {
      consume();
      eat(T.STRING);
      eat(T.SEMI);
      return null; // doc nodes not represented in diagram
    }

    // attribute name : Type [mult] ;
    if (kw === 'attribute') {
      consume();
      const name = parseName();
      let typeName = null;
      if (eat(T.COLON)) typeName = parseName();
      parseMultiplicity();
      eat(T.SEMI);
      return { nodeType: 'AttributeUsage', name, typeName };
    }

    // end name : Type ;   (inside connection def)
    if (kw === 'end') {
      consume();
      const name = check(T.COLON) ? null : parseName();
      let typeName = null;
      if (eat(T.COLON)) typeName = parseName();
      parseMultiplicity();
      eat(T.SEMI);
      return { nodeType: 'EndUsage', name, typeName };
    }

    // part / action / requirement / interface usage  name : Type [mult] { ... }
    if (['part', 'action', 'requirement', 'interface', 'flow', 'item',
         'connection', 'state', 'metadata', 'attribute'].includes(kw)) {
      consume();
      // Could be a nested def — e.g.  part def Foo { }  inside a body
      if (check(T.KEYWORD, 'def')) {
        return parseDefinition(kw);
      }
      const name = parseName();
      let typeName = null;
      if (eat(T.COLON)) typeName = parseName();
      const mult = parseMultiplicity();
      const members = check(T.LBRACE) ? parseBody() : [];
      eat(T.SEMI);
      return { nodeType: `${kw}Usage`, name, typeName, multiplicity: mult, members };
    }

    // Anything else we don't recognise — skip it
    consume();
    skipToSync();
    return null;
  }

  // ── A top-level definition  <keyword> def Name :> Super { ... } ─────────────

  function parseDefinition(keyword) {
    // 'def' keyword (already consumed the element keyword by callers below)
    expect(T.KEYWORD, 'def');
    const name = parseName();
    const specializes = parseSpecialization();
    const members = parseBody();
    return { nodeType: `${keyword}Def`, name, specializes, members };
  }

  // ── Top-level element ─────────────────────────────────────────────────────────

  function parseElement() {
    const t = peek();
    if (t.type === T.EOF) return null;

    if (t.type !== T.KEYWORD && t.type !== T.IDENT) {
      errors.push({ line: t.line, message: `Unexpected token '${t.value}'` });
      consume();
      return null;
    }

    const kw = t.value;

    // package 'Name' { ... }
    if (kw === 'package') {
      consume();
      const name = parseName();
      const members = parseBody();
      return { nodeType: 'Package', name, members };
    }

    // <keyword> def Name ...
    if (['part', 'action', 'requirement', 'interface', 'connection',
         'flow', 'state', 'metadata', 'item', 'attribute'].includes(kw)) {
      consume();
      if (check(T.KEYWORD, 'def')) {
        return parseDefinition(kw);
      }
      // usage at top level — treat same as member
      const name = parseName();
      let typeName = null;
      if (eat(T.COLON)) typeName = parseName();
      const mult = parseMultiplicity();
      const members = check(T.LBRACE) ? parseBody() : [];
      eat(T.SEMI);
      return { nodeType: `${kw}Usage`, name, typeName, multiplicity: mult, members };
    }

    // use case def Name ...
    if (kw === 'use') {
      consume();
      if (check(T.KEYWORD, 'case') || check(T.IDENT, 'case')) {
        consume();
        return parseDefinition('useCase');
      }
      errors.push({ line: t.line, message: `Expected 'case' after 'use'` });
      skipToSync();
      return null;
    }

    // Unrecognised keyword/ident — skip
    errors.push({ line: t.line, message: `Unknown element keyword '${kw}'` });
    consume();
    if (check(T.LBRACE)) skipBlock();
    else skipToSync();
    return null;
  }

  // ── Root: one or more top-level elements ─────────────────────────────────────

  function parseRoot() {
    const elements = [];
    while (!check(T.EOF)) {
      const el = parseElement();
      if (el) elements.push(el);
    }
    return { nodeType: 'Root', elements };
  }

  const ast = parseRoot();
  return { ast, errors };
}
