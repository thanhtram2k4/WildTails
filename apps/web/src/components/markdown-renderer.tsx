'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Components } from 'react-markdown';
import type { ReactNode } from 'react';

/**
 * Strict sanitize schema — extends the rehype-sanitize default but strips
 * all event-handler attributes and javascript: protocol hrefs.
 * We never enable rehype-raw so no raw HTML can be injected.
 */
const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    // Only allow safe URL schemes for href and src.
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
};

/** Map react-markdown component overrides to WildTails D09 styles. */
const components: Components = {
  a({ href, children, ...rest }) {
    const isExternal = href?.startsWith('http') ?? false;
    return (
      <a
        href={href}
        style={{ color: 'var(--wt-teal)', textDecoration: 'underline' }}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...rest}
      >
        {children}
      </a>
    );
  },
  h1({ children, ...rest }) {
    return (
      <h1 className="text-2xl font-bold mt-6 mb-3" style={{ color: 'var(--wt-navy)' }} {...rest}>
        {children as ReactNode}
      </h1>
    );
  },
  h2({ children, ...rest }) {
    return (
      <h2 className="text-xl font-semibold mt-5 mb-2" style={{ color: 'var(--wt-navy)' }} {...rest}>
        {children as ReactNode}
      </h2>
    );
  },
  h3({ children, ...rest }) {
    return (
      <h3 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--wt-navy)' }} {...rest}>
        {children as ReactNode}
      </h3>
    );
  },
  p({ children, ...rest }) {
    return (
      <p className="my-2 leading-relaxed" {...rest}>
        {children as ReactNode}
      </p>
    );
  },
  ul({ children, ...rest }) {
    return (
      <ul className="list-disc list-inside my-2 space-y-1" {...rest}>
        {children as ReactNode}
      </ul>
    );
  },
  ol({ children, ...rest }) {
    return (
      <ol className="list-decimal list-inside my-2 space-y-1" {...rest}>
        {children as ReactNode}
      </ol>
    );
  },
  blockquote({ children, ...rest }) {
    return (
      <blockquote
        className="border-l-4 pl-4 my-3 italic"
        style={{ borderLeftColor: 'var(--wt-teal)', color: 'var(--wt-text-muted)' }}
        {...rest}
      >
        {children as ReactNode}
      </blockquote>
    );
  },
  code({ children, className, ...rest }) {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="px-1 py-0.5 rounded text-sm font-mono"
          style={{ backgroundColor: '#f1f5f9', color: 'var(--wt-navy)' }}
          {...rest}
        >
          {children as ReactNode}
        </code>
      );
    }
    return (
      <code className={className} {...rest}>
        {children as ReactNode}
      </code>
    );
  },
  pre({ children, ...rest }) {
    return (
      <pre
        className="my-3 p-4 rounded-lg overflow-x-auto text-sm font-mono"
        style={{ backgroundColor: '#f1f5f9', color: 'var(--wt-navy)' }}
        {...rest}
      >
        {children as ReactNode}
      </pre>
    );
  },
  hr(rest) {
    return <hr className="my-4" style={{ borderColor: 'var(--wt-border)' }} {...rest} />;
  },
  table({ children, ...rest }) {
    return (
      <div className="overflow-x-auto my-3">
        <table
          className="min-w-full border-collapse text-sm"
          style={{ borderColor: 'var(--wt-border)' }}
          {...rest}
        >
          {children as ReactNode}
        </table>
      </div>
    );
  },
  th({ children, ...rest }) {
    return (
      <th
        className="border px-3 py-2 text-left font-semibold"
        style={{
          borderColor: 'var(--wt-border)',
          backgroundColor: '#f1f5f9',
          color: 'var(--wt-navy)',
        }}
        {...rest}
      >
        {children as ReactNode}
      </th>
    );
  },
  td({ children, ...rest }) {
    return (
      <td className="border px-3 py-2" style={{ borderColor: 'var(--wt-border)' }} {...rest}>
        {children as ReactNode}
      </td>
    );
  },
};

interface MarkdownRendererProps {
  /** Markdown source string. Must be treated as untrusted input. */
  content: string;
  className?: string;
}

/**
 * Safe Markdown renderer.
 *
 * Security properties:
 * - No raw HTML (rehype-raw is NOT included).
 * - rehype-sanitize strips unknown attributes and dangerous protocols.
 * - External links get target=_blank + rel=noopener noreferrer.
 * - javascript: and data: hrefs are blocked by the sanitize schema.
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div
      className={['prose-sm max-w-none', className].join(' ')}
      style={{ color: 'var(--wt-text)' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
