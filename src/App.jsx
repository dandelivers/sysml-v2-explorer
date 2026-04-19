import { useState, useMemo, useRef, useEffect } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { parseSysML } from './parser/index.js'
import { registerSysMLLanguage } from './sysmlLanguage.js'
import { DEFAULT_TEXT } from './data/defaultModel.js'
import MetamodelDiagram from './components/MetamodelDiagram'
import EditorSidebar from './components/EditorSidebar'
import OverviewView from './views/OverviewView'
import StructureView from './views/StructureView'
import FunctionView from './views/FunctionView'
import RequirementsView from './views/RequirementsView'
import TraceabilityView from './views/TraceabilityView'
import './App.css'

const STORAGE_KEY = 'sysml-model-text'
const SAVE_DELAY  = 800

// sidebar: true → floating editor toggle available on this tab
const TABS = [
  { id: 'metamodel',    label: 'Metamodel',    model: false, sidebar: false },
  { id: 'model',        label: 'Model',        model: true,  sidebar: false },
  { id: 'overview',     label: 'Overview',     model: true,  sidebar: false },
  { id: 'structure',    label: 'Structure',    model: true,  sidebar: true  },
  { id: 'functions',    label: 'Functions',    model: true,  sidebar: true  },
  { id: 'requirements', label: 'Requirements', model: true,  sidebar: true  },
  { id: 'traceability', label: 'Traceability', model: true,  sidebar: true  },
]

export default function App() {
  const [text,        setText]       = useState(() => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TEXT)
  const [saveStatus,  setSaveStatus] = useState('saved')
  const [activeTab,   setActiveTab]  = useState('metamodel')
  const [editorOpen,  setEditorOpen] = useState(false)
  const [exporting,   setExporting]  = useState(false)

  const svgRef    = useRef(null)
  const fileRef   = useRef(null)
  const saveTimer = useRef(null)
  const monaco    = useMonaco()

  useEffect(() => {
    if (monaco) registerSysMLLanguage(monaco)
  }, [monaco])

  const { nodes, edges, errors } = useMemo(() => parseSysML(text), [text])

  // ── Text change: debounced localStorage save ─────────────────────────────────

  function handleTextChange(val) {
    const next = val ?? ''
    setText(next)
    setSaveStatus('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, next)
      setSaveStatus('saved')
    }, SAVE_DELAY)
  }

  // ── File import ──────────────────────────────────────────────────────────────

  function handleImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => handleTextChange(ev.target.result ?? '')
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  // ── File export ──────────────────────────────────────────────────────────────

  function handleExportSysML() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.download = 'model.sysml'
    a.href = url
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  function handleReset() {
    if (!window.confirm('Reset to the default example model?')) return
    clearTimeout(saveTimer.current)
    localStorage.setItem(STORAGE_KEY, DEFAULT_TEXT)
    setText(DEFAULT_TEXT)
    setSaveStatus('saved')
  }

  // ── PNG export (Overview tab) ────────────────────────────────────────────────

  useEffect(() => {
    if (!exporting) return
    const id = setTimeout(() => {
      const svg = svgRef.current
      if (!svg) { setExporting(false); return }
      const scale = 4
      const w = svg.width.baseVal.value
      const h = svg.height.baseVal.value
      const xml  = new XMLSerializer().serializeToString(svg)
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const img  = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width  = w * scale
        canvas.height = h * scale
        const ctx = canvas.getContext('2d')
        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        const a = document.createElement('a')
        a.download = 'sysml-model.png'
        a.href = canvas.toDataURL('image/png')
        a.click()
        setExporting(false)
      }
      img.src = url
    }, 50)
    return () => clearTimeout(id)
  }, [exporting])

  // Close sidebar when switching away from a sidebar-capable tab
  function handleTabChange(id) {
    const tab = TABS.find(t => t.id === id)
    if (!tab?.sidebar) setEditorOpen(false)
    setActiveTab(id)
  }

  const activeTabDef = TABS.find(t => t.id === activeTab)

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">SysML v2 Explorer</span>

        <nav className="tab-bar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          {activeTabDef?.model && (
            <>
              <span className={`save-status ${saveStatus}`}>
                {saveStatus === 'saved' ? '✓ Saved' : '● Saving…'}
              </span>
              <span className="header-sep" />
            </>
          )}
          {activeTab === 'model' && (
            <>
              <button className="toolbar-btn" onClick={() => fileRef.current?.click()}>Import</button>
              <button className="toolbar-btn" onClick={handleExportSysML}>Export .sysml</button>
              <button className="toolbar-btn muted" onClick={handleReset}>Reset</button>
              <input ref={fileRef} type="file" accept=".sysml,.sysmlv2,.txt"
                style={{ display: 'none' }} onChange={handleImport} />
            </>
          )}
          {activeTabDef?.model && errors.length > 0 && (
            <span className="parse-errors">
              {errors.length} error{errors.length !== 1 ? 's' : ''}
            </span>
          )}
          {activeTab === 'overview' && (
            <button className="export-btn" onClick={() => setExporting(true)}>Export PNG</button>
          )}
        </div>
      </header>

      <main className="app-content">

        {/* ── Metamodel ── */}
        {activeTab === 'metamodel' && <MetamodelDiagram modelNodes={nodes} text={text} />}

        {/* ── Model (standalone editor tab) ── */}
        {activeTab === 'model' && (
          <div className="model-tab">
            <Editor
              height="100%"
              language="sysmlv2"
              theme="sysml-dark"
              value={text}
              onChange={handleTextChange}
              options={{
                fontSize: 13,
                lineHeight: 22,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                renderLineHighlight: 'line',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                folding: true,
                lineNumbers: 'on',
              }}
            />
            {errors.length > 0 && (
              <div className="model-tab-errors">
                {errors.map((err, i) => (
                  <div key={i} className="editor-error">line {err.line}: {err.message}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Diagram tabs (Overview + sidebar-capable tabs) ── */}
        {activeTabDef?.model && activeTab !== 'model' && (
          <div className="view-panel">

            {/* Sliding editor sidebar — pushes content right */}
            {activeTabDef.sidebar && (
              <EditorSidebar
                open={editorOpen}
                onClose={() => setEditorOpen(false)}
                text={text}
                onChange={handleTextChange}
                saveStatus={saveStatus}
              />
            )}

            <div className="view-content">
              {/* Floating toggle — only visible when sidebar is closed */}
              {activeTabDef.sidebar && !editorOpen && (
                <button
                  className="sidebar-toggle"
                  onClick={() => setEditorOpen(true)}
                  title="Open model editor"
                >
                  { }
                </button>
              )}

              {activeTab === 'overview'     && <OverviewView     nodes={nodes} edges={edges} svgRef={svgRef} exporting={exporting} />}
              {activeTab === 'structure'    && <StructureView    nodes={nodes} edges={edges} />}
              {activeTab === 'functions'    && <FunctionView     nodes={nodes} edges={edges} />}
              {activeTab === 'requirements' && <RequirementsView nodes={nodes} edges={edges} />}
              {activeTab === 'traceability' && <TraceabilityView nodes={nodes} edges={edges} />}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
