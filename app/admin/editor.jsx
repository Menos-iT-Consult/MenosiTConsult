'use client';

import { useEffect, useRef } from 'react';
import { LinkIcon } from './ui';

export function markdownToHtml(md) {
  if (!md) return '';
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  html = html
    .split(/\n\n+/)
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ul|ol|li|blockquote|pre|table)/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

export default function MarkdownEditor({ value, onChange }) {
  const areaRef = useRef(null);
  const pendingCursor = useRef(null);

  useEffect(() => {
    if (pendingCursor.current != null && areaRef.current) {
      const pos = pendingCursor.current;
      pendingCursor.current = null;
      areaRef.current.focus();
      areaRef.current.setSelectionRange(pos, pos);
    }
  }, [value]);

  function applyAction(action) {
    const el = areaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end);
    let replacement = '';

    switch (action) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        break;
      case 'heading':
        replacement = `## ${selected || 'Heading'}`;
        break;
      case 'link': {
        const url = prompt('Enter URL:', 'https://');
        if (!url) return;
        replacement = `[${selected || 'link text'}](${url})`;
        break;
      }
      default:
        return;
    }

    pendingCursor.current = start + replacement.length;
    onChange(value.substring(0, start) + replacement + value.substring(end));
  }

  return (
    <>
      <div className="editor-toolbar">
        <button type="button" className="toolbar-btn" data-action="bold" title="Bold" onClick={() => applyAction('bold')}>
          <strong>B</strong>
        </button>
        <button type="button" className="toolbar-btn" data-action="italic" title="Italic" onClick={() => applyAction('italic')}>
          <em>I</em>
        </button>
        <button type="button" className="toolbar-btn" data-action="heading" title="Heading 2" onClick={() => applyAction('heading')}>
          H2
        </button>
        <button type="button" className="toolbar-btn" data-action="link" title="Insert Link" onClick={() => applyAction('link')}>
          <LinkIcon />
        </button>
      </div>
      <div className="editor-split">
        <textarea
          id="blog-content"
          ref={areaRef}
          rows="12"
          placeholder="Write your post content in markdown..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div
          id="blog-preview"
          className="preview-pane"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }}
        />
      </div>
    </>
  );
}
