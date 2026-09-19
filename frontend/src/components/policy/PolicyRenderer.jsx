import React from "react";
import { isHtmlContent, sanitizePolicyHtml, markdownToHtml } from "./policyFormat";

/**
 * Clean, readable policy content renderer.
 * Converts both rich HTML (from WYSIWYG editor) and raw Markdown into semantic HTML
 * with comfortable typography suited for a customer-facing policy viewer.
 */
export default function PolicyRenderer({ content, className = "" }) {
  if (!content || typeof content !== "string" || !content.trim()) {
    return (
      <p className="text-sm text-slate-400 italic py-4">No policy content provided.</p>
    );
  }

  // Convert raw Markdown to clean semantic HTML, then sanitize
  const rawHtml = isHtmlContent(content) ? content : markdownToHtml(content);
  const cleanHtml = sanitizePolicyHtml(rawHtml);

  return (
    <div
      className={`policy-rich-sheet font-sans text-sm text-slate-700 leading-relaxed space-y-4
        [&_h1]:font-sans [&_h1]:text-base [&_h1]:font-semibold [&_h1]:tracking-normal [&_h1]:text-slate-900 [&_h1]:border-b [&_h1]:border-slate-150 [&_h1]:pb-2 [&_h1]:pt-5 [&_h1]:first:pt-0
        [&_h2]:font-sans [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-normal [&_h2]:text-slate-900 [&_h2]:border-b [&_h2]:border-slate-150 [&_h2]:pb-2 [&_h2]:pt-5 [&_h2]:first:pt-0
        [&_h3]:font-sans [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:tracking-normal [&_h3]:text-slate-900 [&_h3]:border-b [&_h3]:border-slate-100 [&_h3]:pb-1.5 [&_h3]:pt-4 [&_h3]:first:pt-0
        [&_h4]:font-sans [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-slate-800 [&_h4]:pt-3
        [&_p]:font-sans [&_p]:text-sm [&_p]:text-slate-700 [&_p]:leading-[1.75] [&_p]:my-2
        [&_strong]:font-semibold [&_strong]:text-slate-900
        [&_b]:font-semibold [&_b]:text-slate-900
        [&_ul]:font-sans [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-sm [&_ul]:text-slate-700 [&_ul]:my-3
        [&_ul_li::marker]:text-[#4C81E0]
        [&_ol]:font-sans [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:text-sm [&_ol]:text-slate-700 [&_ol]:my-3
        [&_ol_li::marker]:text-[#4C81E0] [&_ol_li::marker]:font-semibold
        [&_blockquote]:font-sans [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:rounded-lg [&_blockquote]:bg-slate-50 [&_blockquote]:border-l-4 [&_blockquote]:border-[#4C81E0] [&_blockquote]:text-sm [&_blockquote]:text-slate-700 [&_blockquote]:my-3 [&_blockquote]:shadow-sm
        ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
