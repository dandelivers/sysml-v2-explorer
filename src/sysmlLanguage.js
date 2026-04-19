/**
 * Monaco language definition for SysML V2 (subset).
 * Call registerSysMLLanguage(monaco) once before mounting the editor.
 */
export function registerSysMLLanguage(monaco) {
  const LANG_ID = "sysmlv2";

  // Avoid double-registration on HMR reloads
  if (monaco.languages.getLanguages().some(l => l.id === LANG_ID)) return;

  monaco.languages.register({ id: LANG_ID });

  // ── Monarch tokenizer ────────────────────────────────────────────────────

  monaco.languages.setMonarchTokensProvider(LANG_ID, {
    defaultToken: "",

    keywords: [
      "package", "part", "def", "action", "requirement", "interface",
      "connection", "flow", "state", "metadata", "use", "case",
      "end", "in", "out", "inout", "doc", "about", "abstract",
      "readonly", "derived", "all", "ordered", "nonunique",
      "specializes", "redefines", "subsets", "attribute", "item",
      "satisfy", "verify", "allocate", "expose",
    ],

    operators: [":>", ":>>", "->", ".."],

    symbols: /[=><!~?:&|+\-*/%^]+/,

    tokenizer: {
      root: [
        // Comments
        [/\/\/.*$/,           "comment"],
        [/\/\*/,              "comment", "@blockComment"],

        // Strings
        [/'[^']*'/,           "string"],
        [/"[^"]*"/,           "string"],

        // Stereotypes  «...»
        [/«[^»]*»/,           "type.identifier"],

        // Numbers
        [/\d+/,               "number"],

        // Operators
        [/:>>/,               "keyword.operator"],
        [/:>/,                "keyword.operator"],
        [/->/,                "keyword.operator"],

        // Identifiers / keywords
        [/[a-zA-Z_]\w*/, {
          cases: {
            "@keywords": "keyword",
            "@default":  "identifier",
          },
        }],

        // Punctuation
        [/[{}]/, "@brackets"],
        [/[[\]]/, "@brackets"],
        [/[();,]/, "delimiter"],
        [/:/, "delimiter"],
        [/;/, "delimiter"],
      ],

      blockComment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  });

  // ── Theme colours ────────────────────────────────────────────────────────

  monaco.editor.defineTheme("sysml-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword",          foreground: "60a5fa", fontStyle: "bold"   },
      { token: "keyword.operator", foreground: "a78bfa"                      },
      { token: "type.identifier",  foreground: "34d399"                      },
      { token: "identifier",       foreground: "e2e8f0"                      },
      { token: "string",           foreground: "fb923c"                      },
      { token: "number",           foreground: "86efac"                      },
      { token: "comment",          foreground: "4b5563", fontStyle: "italic" },
      { token: "delimiter",        foreground: "94a3b8"                      },
    ],
    colors: {
      "editor.background":               "#0d1117",
      "editor.foreground":               "#e2e8f0",
      "editorLineNumber.foreground":     "#374151",
      "editorLineNumber.activeForeground": "#6b7280",
      "editor.lineHighlightBackground":  "#161b22",
      "editor.selectionBackground":      "#1d3a5f",
      "editorCursor.foreground":         "#60a5fa",
      "editor.inactiveSelectionBackground": "#172235",
      "editorIndentGuide.background":    "#1f2937",
      "editorIndentGuide.activeBackground": "#374151",
    },
  });

  // ── Bracket / autocomplete configuration ────────────────────────────────

  monaco.languages.setLanguageConfiguration(LANG_ID, {
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "'", close: "'", notIn: ["string", "comment"] },
      { open: '"', close: '"', notIn: ["string", "comment"] },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
      { open: '"', close: '"' },
    ],
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"],
    },
    indentationRules: {
      increaseIndentPattern: /^.*\{[^}]*$/,
      decreaseIndentPattern: /^\s*\}/,
    },
  });

  // ── Completions ──────────────────────────────────────────────────────────

  monaco.languages.registerCompletionItemProvider(LANG_ID, {
    provideCompletionItems(model, position) {
      const word  = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn,        endColumn:    word.endColumn,
      };

      const kw = (label, insert) => ({
        label, kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: insert ?? label, range,
      });
      const snip = (label, insert) => ({
        label, kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: insert, insertTextRules:
          monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      });

      return {
        suggestions: [
          snip("part def",         "part def ${1:Name} {\n\t$0\n}"),
          snip("action def",       "action def ${1:Name} {\n\t$0\n}"),
          snip("requirement def",  "requirement def ${1:Name} {\n\t$0\n}"),
          snip("interface def",    "interface def ${1:Name} {\n\t$0\n}"),
          snip("connection def",   "connection def ${1:Name} {\n\tend ${2:a} : ${3:TypeA};\n\tend ${4:b} : ${5:TypeB};\n}"),
          snip("flow def",         "flow def ${1:Name} {\n\t$0\n}"),
          snip("metadata def",     "metadata def ${1:Name} {\n\t$0\n}"),
          snip("use case def",     "use case def ${1:Name} {\n\t$0\n}"),
          snip("package",          "package '${1:Name}' {\n\t$0\n}"),
          snip("part usage",       "part ${1:name} : ${2:Type};"),
          snip("end",              "end ${1:name} : ${2:Type};"),
          kw("specializes",        "specializes "),
          kw("abstract"),
          kw("doc",                "doc /* $0 */"),
        ],
      };
    },
  });
}
