/**
 * Security and correctness tests for MarkdownRenderer.
 *
 * Verifies that XSS vectors are sanitised and that safe Markdown renders
 * correctly, without requiring a real browser or network.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from './markdown-renderer';

// ---------------------------------------------------------------------------
// XSS — script injection
// ---------------------------------------------------------------------------
describe('MarkdownRenderer XSS: script tag', () => {
  it('does not render a <script> element', () => {
    const { container } = render(<MarkdownRenderer content="<script>alert(1)</script>" />);
    expect(container.querySelector('script')).toBeNull();
  });

  it('does not evaluate inline script text', () => {
    const { container } = render(
      <MarkdownRenderer content="<script>window.__XSS = true</script>" />,
    );
    // The literal text should not appear as a script element.
    expect(container.querySelector('script')).toBeNull();
    // The global should not have been set (no eval).
    expect((window as unknown as Record<string, unknown>)['__XSS']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// XSS — event handler stripping
// ---------------------------------------------------------------------------
describe('MarkdownRenderer XSS: event handlers', () => {
  it('strips onerror attribute from img tags', () => {
    const { container } = render(<MarkdownRenderer content='<img src="x" onerror="alert(1)">' />);
    const img = container.querySelector('img');
    // Either the img is removed entirely or the onerror attribute is stripped.
    if (img) {
      expect(img.getAttribute('onerror')).toBeNull();
    }
  });

  it('strips onclick attribute from anchor tags', () => {
    const { container } = render(
      <MarkdownRenderer content='<a href="#" onclick="alert(1)">click</a>' />,
    );
    const anchor = container.querySelector('a');
    if (anchor) {
      expect(anchor.getAttribute('onclick')).toBeNull();
    }
  });

  it('strips onload attribute from iframe-like constructs', () => {
    const { container } = render(<MarkdownRenderer content='<div onload="alert(1)">test</div>' />);
    const div = container.querySelector('[onload]');
    expect(div).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// XSS — javascript: protocol links
// ---------------------------------------------------------------------------
describe('MarkdownRenderer XSS: javascript: URLs', () => {
  it('does not render a javascript: href in Markdown link syntax', () => {
    const { container } = render(<MarkdownRenderer content="[click me](javascript:alert(1))" />);
    const anchor = container.querySelector('a');
    // The link should either not be rendered, or the href must not start with javascript:
    if (anchor) {
      const href = anchor.getAttribute('href') ?? '';
      expect(href.toLowerCase().startsWith('javascript:')).toBe(false);
    }
  });

  it('does not render a data: href', () => {
    const { container } = render(
      <MarkdownRenderer content="[click](data:text/html,<h1>xss</h1>)" />,
    );
    const anchor = container.querySelector('a');
    if (anchor) {
      const href = anchor.getAttribute('href') ?? '';
      expect(href.toLowerCase().startsWith('data:')).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Robustness — malformed Markdown
// ---------------------------------------------------------------------------
describe('MarkdownRenderer robustness', () => {
  it('renders without crashing on empty string', () => {
    expect(() => render(<MarkdownRenderer content="" />)).not.toThrow();
  });

  it('renders without crashing on deeply nested brackets', () => {
    const malformed = '[[[[[[[[test]]]]]]]]'.repeat(10);
    expect(() => render(<MarkdownRenderer content={malformed} />)).not.toThrow();
  });

  it('renders without crashing on unclosed code fences', () => {
    expect(() => render(<MarkdownRenderer content={'```\nunclosed code fence'} />)).not.toThrow();
  });

  it('renders without crashing on null bytes', () => {
    expect(() => render(<MarkdownRenderer content={'hello\x00world'} />)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Correct Markdown rendering
// ---------------------------------------------------------------------------
describe('MarkdownRenderer correct rendering', () => {
  it('renders a paragraph', () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders heading elements with correct levels', () => {
    const { container } = render(<MarkdownRenderer content={'# H1\n## H2\n### H3'} />);
    expect(container.querySelector('h1')).toBeInTheDocument();
    expect(container.querySelector('h2')).toBeInTheDocument();
    expect(container.querySelector('h3')).toBeInTheDocument();
  });

  it('renders bold and italic text', () => {
    const { container } = render(<MarkdownRenderer content="**bold** and _italic_" />);
    expect(container.querySelector('strong')).toBeInTheDocument();
    expect(container.querySelector('em')).toBeInTheDocument();
  });

  it('renders an unordered list', () => {
    const { container } = render(
      <MarkdownRenderer content={'- item one\n- item two\n- item three'} />,
    );
    const items = container.querySelectorAll('li');
    expect(items.length).toBe(3);
  });

  it('renders an ordered list', () => {
    const { container } = render(<MarkdownRenderer content={'1. first\n2. second'} />);
    const ol = container.querySelector('ol');
    expect(ol).toBeInTheDocument();
  });

  it('renders a blockquote', () => {
    const { container } = render(<MarkdownRenderer content="> quoted text" />);
    expect(container.querySelector('blockquote')).toBeInTheDocument();
  });

  it('renders a code block', () => {
    const { container } = render(<MarkdownRenderer content={'```\nconst x = 1;\n```'} />);
    expect(container.querySelector('pre')).toBeInTheDocument();
    expect(container.querySelector('code')).toBeInTheDocument();
  });

  it('renders an https link with correct href', () => {
    const { container } = render(<MarkdownRenderer content="[example](https://example.com)" />);
    const anchor = container.querySelector('a');
    expect(anchor).toBeInTheDocument();
    expect(anchor?.getAttribute('href')).toBe('https://example.com');
  });

  it('adds rel=noopener noreferrer and target=_blank to external links', () => {
    const { container } = render(<MarkdownRenderer content="[external](https://external.com)" />);
    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('rel')).toContain('noopener');
    expect(anchor?.getAttribute('rel')).toContain('noreferrer');
    expect(anchor?.getAttribute('target')).toBe('_blank');
  });

  it('renders a GFM table (remark-gfm)', () => {
    const md = '| Col A | Col B |\n| --- | --- |\n| a1 | b1 |\n| a2 | b2 |';
    const { container } = render(<MarkdownRenderer content={md} />);
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('th')).toBeInTheDocument();
    expect(container.querySelectorAll('td').length).toBe(4);
  });

  it('renders GFM strikethrough', () => {
    const { container } = render(<MarkdownRenderer content="~~struck~~" />);
    // remark-gfm produces <del> or <s>
    const struck = container.querySelector('del') ?? container.querySelector('s');
    expect(struck).toBeInTheDocument();
  });
});
