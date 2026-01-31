import React, { useState, useEffect } from 'react';
import { Save, Copy, Check, Maximize2, Minimize2, Terminal, Play } from 'lucide-react';
import GlassCard from './ui/GlassCard';
import ModernButton from './ui/ModernButton';
import Badge from './ui/Badge';

/**
 * CodeEditor Component - Apple-style code editor
 * Redesigned with 21st.dev inspired components
 */
const CodeEditor = ({ 
  initialValue = '', 
  language = 'javascript',
  fileName = 'untitled.js',
  onChange,
  onSave,
  onRun,
  readOnly = false,
  showLineNumbers = true
}) => {
  const [value, setValue] = useState(initialValue);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onChange) onChange(newValue);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      await onSave(value);
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const lines = value.split('\n').length;
  const lineNumbers = Array.from({ length: lines }, (_, i) => i + 1);

  const editorContent = (
    <GlassCard 
      padding="p-0" 
      className={`overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => isFullscreen && setIsFullscreen(false)}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-mono text-zinc-400">{fileName}</span>
          </div>
          <Badge variant="glass" size="sm">{language}</Badge>
          {readOnly && <Badge variant="warning" size="sm">Read-only</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          
          {!readOnly && onSave && (
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={handleSave}
              loading={isSaving}
              className="text-zinc-400 hover:text-white"
            >
              <Save className="w-4 h-4" />
              Save
            </ModernButton>
          )}

          {onRun && (
            <ModernButton
              variant="gradient"
              size="sm"
              onClick={() => onRun(value)}
            >
              <Play className="w-4 h-4" />
              Run
            </ModernButton>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative bg-zinc-950" style={{ minHeight: isFullscreen ? 'calc(100% - 120px)' : '350px' }}>
        {/* Line Numbers */}
        {showLineNumbers && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-zinc-900/50 border-r border-zinc-800 text-right select-none pointer-events-none">
            <div className="py-4 font-mono text-sm">
              {lineNumbers.map(num => (
                <div key={num} className="px-3 text-zinc-600 leading-6">
                  {num}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={value}
          onChange={handleChange}
          readOnly={readOnly}
          spellCheck={false}
          className={`
            w-full h-full font-mono text-sm p-4 leading-6
            bg-transparent text-zinc-300
            resize-none focus:outline-none
            ${showLineNumbers ? 'pl-16' : ''}
            ${readOnly ? 'cursor-default' : ''}
          `}
          style={{
            minHeight: isFullscreen ? 'calc(100% - 60px)' : '350px',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500">
        <div className="flex items-center gap-4">
          <span>{lines} line{lines !== 1 ? 's' : ''}</span>
          <span>{value.length} characters</span>
        </div>
        <div className="flex items-center gap-2">
          <span>UTF-8</span>
          <span>•</span>
          <span>{language}</span>
        </div>
      </div>
    </GlassCard>
  );

  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" onClick={() => setIsFullscreen(false)} />
        {editorContent}
      </>
    );
  }

  return editorContent;
};

export default CodeEditor;
