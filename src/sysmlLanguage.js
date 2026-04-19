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
      { token: "keyword",          foreground: "569cd6", fontStyle: "bold"   },
      { token: "keyword.operator", foreground: "c586c0"                      },
      { token: "type.identifier",  foreground: "4ec9b0"                      },
      { token: "identifier",       foreground: "d4d4d4"                      },
      { token: "string",           foreground: "ce9178"                      },
      { token: "number",           foreground: "b5cea8"                      },
      { token: "comment",          foreground: "6a9955", fontStyle: "italic" },
      { token: "delimiter",        foreground: "d4d4d4"                      },
    ],
    colors: {
      "editor.background":          "#1e1e1e",
      "editor.foreground":          "#d4d4d4",
      "editorLineNumber.foreground":"#5a5a5a",
      "editor.lineHighlightBackground": "#2a2a2a",
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
