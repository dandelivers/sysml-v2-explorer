import { tokenize, T } from './tokenizer.js';

/**
 * Parse a SysML V2 subset into an AST.
 * Returns { ast, errors }.
 *
 * Supported constructs:
 *   Definitions:  part, action, requirement, interface, connection, flow,
 *                 state, metadata, item, attribute, calc, constraint, use case
 *   Modifiers:    abstract, in, out, inout
 *   Relations:    :> (specializes, comma-list), :>> (redefines), subsets
 *                 satisfy, verify, allocate … to
 *   Members:      part/action/requirement/interface/flow/item/connection/
 *                 state/metadata/attribute/calc/constraint usage
 *                 end (connection ends), doc, attribute = value
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

  // ── Name: identifier, keyword-used-as-name, or quoted string ────────────────

  function parseName() {
    const t = peek();
    if (t.type === T.STRING || t.type === T.IDENT || t.type === T.KEYWORD) {
      return consume().value;
    }
    errors.push({ line: t.line, message: `Expected a name, got '${t.value}'` });
    return null;
  }

  // ── Qualified name: Foo or Foo.Bar ───────────────────────────────────────────

  function parseQualifiedName() {
    let name = parseName();
    while (check(T.DOT) && name) {
      consume();
      const part = parseName();
      if (part) name = `${name}.${part}`;
    }
    return name;
  }

  // ── Specializations: :> Name { , Name }*  → string[] ────────────────────────

  function parseSpecializations() {
    if (!eat(T.SPECIALIZES)) return [];
    const names = [parseQualifiedName()];
    while (eat(T.COMMA)) names.push(parseQualifiedName());
    return names;
  }

  // ── Redefines: :>> Name → string | null ─────────────────────────────────────

  function parseRedefines() {
    if (!eat(T.REDEFINES)) return null;
    return parseQualifiedName();
  }

  // ── Subsets: subsets Name → string | null ───────────────────────────────────

  function parseSubsets() {
    if (!check(T.KEYWORD, 'subsets')) return null;
    consume();
    return parseQualifiedName();
  }

  // ── Usage type annotation: Name [redefines|subsets ref] ─────────────────────
  // Returns { typeName, redefines, subsets }

  function parseTypeAnnotation() {
    if (!eat(T.COLON)) return { typeName: null, redefines: null, subsets: null };
    const typeName = parseQualifiedName();
    const redefines = parseRedefines();
    const subsets   = parseSubsets();
    return { typeName, redefines, subsets };
  }

  // ── Multiplicity: [n] [n..*] [*] ────────────────────────────────────────────

  function parseMultiplicity() {
    if (!check(T.LBRACKET)) return null;
    consume();
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

  // ── Attribute value: collect tokens until ; { } ──────────────────────────────

  function parseAttributeValue() {
    const parts = [];
    while (!check(T.SEMI) && !check(T.LBRACE) && !check(T.RBRACE) && !check(T.EOF)) {
      parts.push(peek().value);
      consume();
    }
    return parts.join(' ') || null;
  }

  // ── Skip an unknown block { ... } ────────────────────────────────────────────

  function skipBlock() {
    if (!check(T.LBRACE)) return;
    consume();
    let depth = 1;
    while (pos < tokens.length && depth > 0) {
      const t = consume();
      if (t.type === T.LBRACE) depth++;
      if (t.type === T.RBRACE) depth--;
      if (t.type === T.EOF)    break;
    }
  }

  // ── Skip to next ; or } (error recovery) ────────────────────────────────────

  function skipToSync() {
    while (!check(T.SEMI) && !check(T.RBRACE) && !check(T.EOF)) consume();
    eat(T.SEMI);
  }

  // ── Body: { member* } ────────────────────────────────────────────────────────

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

  // ── Definition: <kw> def Name :> Parents { members } ────────────────────────

  function parseDefinition(keyword, abstract = false) {
    expect(T.KEYWORD, 'def');
    const name        = parseName();
    const specializes = parseSpecializations();   // string[]
    const redefines   = parseRedefines();         // string | null
    const subsets     = parseSubsets();           // string | null
    const members     = parseBody();
    return { nodeType: `${keyword}Def`, name, specializes, redefines, subsets, abstract, members };
  }

  // ── Usage: name [: Type] [mult] [body] ; ────────────────────────────────────

  function parseUsage(keyword, direction = null) {
    const name = parseName();
    const { typeName, redefines, subsets } = parseTypeAnnotation();
    const mult    = parseMultiplicity();
    const members = check(T.LBRACE) ? parseBody() : [];
    eat(T.SEMI);
    return { nodeType: `${keyword}Usage`, name, typeName, redefines, subsets,
             multiplicity: mult, direction, members };
  }

  // ── A single member inside a def body ────────────────────────────────────────

  const USAGE_KEYWORDS = new Set([
    'part', 'action', 'requirement', 'interface', 'flow', 'item',
    'connection', 'state', 'metadata', 'attribute', 'calc', 'constraint',
    'occurrence', 'individual',
  ]);

  function parseMember() {
    // abstract modifier
    const abstract = eat(T.KEYWORD, 'abstract');

    // direction modifiers: in / out / inout
    let direction = null;
    if (check(T.KEYWORD, 'in') || check(T.KEYWORD, 'out') || check(T.KEYWORD, 'inout')) {
      direction = peek().value;
      consume();
    }

    const t = peek();

    if (t.type !== T.KEYWORD && t.type !== T.IDENT) {
      if (!abstract && !direction) {
        errors.push({ line: t.line, message: `Unexpected token '${t.value}' in body` });
      }
      skipToSync();
      return null;
    }

    const kw = t.value;

    // ── doc ─────────────────────────────────────────────────────────────────
    if (kw === 'doc') {
      consume();
      if (check(T.STRING)) consume();
      eat(T.SEMI);
      return null;
    }

    // ── satisfy reqName [by ref] ; ──────────────────────────────────────────
    if (kw === 'satisfy') {
      consume();
      const target = parseQualifiedName();
      let by = null;
      if (check(T.KEYWORD, 'by') || check(T.IDENT, 'by')) { consume(); by = parseQualifiedName(); }
      eat(T.SEMI);
      return { nodeType: 'SatisfyUsage', target, by };
    }

    // ── verify reqName [by ref] ; ───────────────────────────────────────────
    if (kw === 'verify') {
      consume();
      const target = parseQualifiedName();
      let by = null;
      if (check(T.KEYWORD, 'by') || check(T.IDENT, 'by')) { consume(); by = parseQualifiedName(); }
      eat(T.SEMI);
      return { nodeType: 'VerifyUsage', target, by };
    }

    // ── allocate ref [to ref] ; ─────────────────────────────────────────────
    if (kw === 'allocate') {
      consume();
      const from = parseQualifiedName();
      let to = null;
      if (check(T.KEYWORD, 'to')) { consume(); to = parseQualifiedName(); }
      eat(T.SEMI);
      return { nodeType: 'AllocateUsage', from, to };
    }

    // ── end name : Type ;  (connection def members) ─────────────────────────
    if (kw === 'end') {
      consume();
      const name = check(T.COLON) ? null : parseName();
      const { typeName } = parseTypeAnnotation();
      parseMultiplicity();
      eat(T.SEMI);
      return { nodeType: 'EndUsage', name, typeName };
    }

    // ── attribute name [: Type] [= value] [body] ; ──────────────────────────
    if (kw === 'attribute') {
      consume();
      const name = parseName();
      const { typeName, redefines, subsets } = parseTypeAnnotation();
      const mult  = parseMultiplicity();
      let value   = null;
      if (eat(T.EQUALS)) value = parseAttributeValue();
      const members = check(T.LBRACE) ? parseBody() : [];
      eat(T.SEMI);
      return { nodeType: 'AttributeUsage', name, typeName, redefines, subsets,
               multiplicity: mult, value, members };
    }

    // ── use case [def] ──────────────────────────────────────────────────────
    if (kw === 'use') {
      consume();
      if (check(T.KEYWORD, 'case') || check(T.IDENT, 'case')) {
        consume();
        if (check(T.KEYWORD, 'def')) return parseDefinition('useCase', abstract);
        return parseUsage('useCase', direction);
      }
      skipToSync();
      return null;
    }

    // ── Nested definition: <kw> def Name ... ────────────────────────────────
    if (USAGE_KEYWORDS.has(kw)) {
      consume();
      if (check(T.KEYWORD, 'def')) return parseDefinition(kw, abstract);
      return parseUsage(kw, direction);
    }

    // ── Unknown — skip ───────────────────────────────────────────────────────
    if (!abstract && !direction) {
      consume();
      skipToSync();
    } else {
      skipToSync();
    }
    return null;
  }

  // ── Top-level element ─────────────────────────────────────────────────────────

  const TOP_KEYWORDS = new Set([
    'part', 'action', 'requirement', 'interface', 'connection',
    'flow', 'state', 'metadata', 'item', 'attribute', 'calc', 'constraint',
    'occurrence', 'individual',
  ]);

  function parseElement() {
    // abstract modifier
    const abstract = eat(T.KEYWORD, 'abstract');

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
      const name    = parseName();
      const members = parseBody();
      return { nodeType: 'Package', name, members };
    }

    // use case def Name ...
    if (kw === 'use') {
      consume();
      if (check(T.KEYWORD, 'case') || check(T.IDENT, 'case')) {
        consume();
        if (check(T.KEYWORD, 'def')) return parseDefinition('useCase', abstract);
        return parseUsage('useCase');
      }
      errors.push({ line: t.line, message: `Expected 'case' after 'use'` });
      skipToSync();
      return null;
    }

    // satisfy / verify / allocate at top level
    if (kw === 'satisfy' || kw === 'verify') {
      consume();
      const target = parseQualifiedName();
      let by = null;
      if (check(T.KEYWORD, 'by') || check(T.IDENT, 'by')) { consume(); by = parseQualifiedName(); }
      eat(T.SEMI);
      return { nodeType: kw === 'satisfy' ? 'SatisfyUsage' : 'VerifyUsage', target, by };
    }

    if (kw === 'allocate') {
      consume();
      const from = parseQualifiedName();
      let to = null;
      if (check(T.KEYWORD, 'to')) { consume(); to = parseQualifiedName(); }
      eat(T.SEMI);
      return { nodeType: 'AllocateUsage', from, to };
    }

    if (TOP_KEYWORDS.has(kw)) {
      consume();
      if (check(T.KEYWORD, 'def')) return parseDefinition(kw, abstract);
      // Usage at top level
      return parseUsage(kw);
    }

    errors.push({ line: t.line, message: `Unknown element '${kw}'` });
    consume();
    if (check(T.LBRACE)) skipBlock();
    else skipToSync();
    return null;
  }

  // ── Root ──────────────────────────────────────────────────────────────────────

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
