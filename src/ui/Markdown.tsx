import { useEffect, useMemo, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

let mermaidCounter = 0;

function isDark() {
  return document.documentElement.classList.contains('dark');
}

/** Renders trusted-but-sanitized Markdown, with ```mermaid blocks drawn as diagrams (mermaid is lazy-loaded). */
export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(() => {
    const raw = marked.parse(source, { async: false, gfm: true }) as string;
    const clean = DOMPurify.sanitize(raw);
    // Wide tables scroll inside their own box instead of the page.
    return clean.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
  }, [source]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const blocks = [...root.querySelectorAll<HTMLElement>('pre > code.language-mermaid')];
    if (blocks.length === 0) return;
    let cancelled = false;
    void import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: isDark() ? 'dark' : 'neutral',
        fontFamily: 'Inter, system-ui, sans-serif',
      });
      for (const code of blocks) {
        if (cancelled) return;
        const pre = code.parentElement!;
        try {
          const { svg } = await mermaid.render(`mmd-${++mermaidCounter}`, code.textContent ?? '');
          const div = document.createElement('div');
          div.className = 'mermaid-diagram';
          div.setAttribute('role', 'img');
          div.setAttribute('aria-label', 'Diagram');
          div.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ['foreignObject'] });
          pre.replaceWith(div);
        } catch {
          // Leave the source visible if the diagram fails to render.
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [html]);

  return <div ref={ref} className={`prose-notes ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
