import Editor from '@monaco-editor/react'
import './EditorSidebar.css'

export default function EditorSidebar({ open, onClose, text, onChange, saveStatus }) {
  return (
    <div className={`editor-sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-head">
        <span className="sidebar-title">Model</span>
        <span className={`sidebar-save-dot ${saveStatus}`} title={saveStatus === 'saved' ? 'Saved' : 'Saving…'} />
        <button className="sidebar-close" onClick={onClose} title="Close editor">✕</button>
      </div>

      {/* Monaco only mounts while open — avoids a dormant heavy instance */}
      <div className="sidebar-body">
        {open && (
          <Editor
            height="100%"
            language="sysmlv2"
            theme="sysml-dark"
            value={text}
            onChange={onChange}
            options={{
              fontSize: 12,
              lineHeight: 20,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              renderLineHighlight: 'line',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
            }}
          />
        )}
      </div>
    </div>
  )
}
