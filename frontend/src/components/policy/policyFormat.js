/**
 * Utility functions for Policy Content:
 * - Detecting HTML vs Markdown
 * - Converting Markdown to clean semantic HTML
 * - Sanitizing HTML safely for client-side rendering
 * - Friendly date formatting
 */

/**
 * Checks if a string contains HTML tags.
 */
export function isHtmlContent(str) {
  if (!str || typeof str !== "string") return false;
  return /<(h[1-6]|p|ul|ol|li|blockquote|strong|b|em|i|div|span|br)[^>]*>/i.test(str);
}

/**
 * Formats inline Markdown syntax (e.g. **bold**) to HTML.
 */
function formatInlineMarkdown(text) {
  if (!text) return "";
  // Bold: **text**
  let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic: *text* (when not preceded or followed by *)
  formatted = formatted.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  return formatted;
}

/**
 * Helper to parse an array of text lines into semantic paragraphs and list blocks.
 */
function parseMixedLinesToHtml(lines) {
  const parts = [];
  let currentP = [];
  let currentUl = [];
  let currentOl = [];

  function flushP() {
    if (currentP.length > 0) {
      parts.push(`<p>${currentP.map(l => formatInlineMarkdown(l)).join("<br />")}</p>`);
      currentP = [];
    }
  }
  function flushUl() {
    if (currentUl.length > 0) {
      parts.push(`<ul>${currentUl.map(l => `<li>${formatInlineMarkdown(l)}</li>`).join("")}</ul>`);
      currentUl = [];
    }
  }
  function flushOl() {
    if (currentOl.length > 0) {
      parts.push(`<ol>${currentOl.map(l => `<li>${formatInlineMarkdown(l)}</li>`).join("")}</ol>`);
      currentOl = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^[-*]\s+/.test(trimmed)) {
      flushP();
      flushOl();
      currentUl.push(trimmed.replace(/^[-*]\s+/, ""));
    } else if (/^\d+\.\s+/.test(trimmed)) {
      flushP();
      flushUl();
      currentOl.push(trimmed.replace(/^\d+\.\s+/, ""));
    } else {
      flushUl();
      flushOl();
      currentP.push(trimmed);
    }
  }

  flushP();
  flushUl();
  flushOl();
  return parts.join("\n");
}

/**
 * Converts Markdown content into clean, semantic HTML suitable for WYSIWYG editing and formal display.
 * If the content is already HTML, it returns it as-is.
 */
export function markdownToHtml(content) {
  if (!content || typeof content !== "string" || !content.trim()) {
    return "<p></p>";
  }

  // If already HTML, return directly
  if (isHtmlContent(content)) {
    return content.trim();
  }

  // Normalize line breaks
  const normalized = content.replace(/\r\n/g, "\n");
  const blocks = normalized.split(/\n{2,}/);

  const htmlBlocks = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      const lines = trimmed.split("\n");

      // Check if the block starts with a heading line (e.g. ### Title)
      if (/^#{1,6}\s+/.test(lines[0])) {
        const headingTitle = lines[0].replace(/^#{1,6}\s+/, "").trim();
        const headingHtml = `<h3>${formatInlineMarkdown(headingTitle)}</h3>`;

        const remainingLines = lines.slice(1).map((l) => l.trim()).filter(Boolean);
        if (remainingLines.length === 0) {
          return headingHtml;
        }

        const parsedBody = parseMixedLinesToHtml(remainingLines);
        return `${headingHtml}\n${parsedBody}`;
      }

      // Callout: > note text
      if (lines.length > 0 && lines.every((l) => /^\s*>\s?/.test(l))) {
        const noteText = lines
          .map((line) => line.replace(/^\s*>\s?/, "").trim())
          .join(" ");
        return `<blockquote>${formatInlineMarkdown(noteText)}</blockquote>`;
      }

      // Mixed lines (paragraphs, bullet lists, numbered lists)
      return parseMixedLinesToHtml(lines);
    })
    .filter(Boolean);

  return htmlBlocks.join("\n");
}

/**
 * Decodes HTML entities in a plain-text string (browser-only).
 * e.g. "&amp;" → "&", "&amp;amp;" → "&amp;", "&#39;" → "'"
 */
function decodeHtmlEntities(str) {
  if (!str || typeof str !== "string") return str;
  if (typeof document === "undefined") return str;
  try {
    const el = document.createElement("textarea");
    el.innerHTML = str;
    return el.value;
  } catch {
    return str;
  }
}

/**
 * Extracts structured policy sections ({ title, body }) from either HTML or Markdown content.
 * Used for dynamic invoice policies, summary boxes, and short-form legal references.
 */
export function extractPolicySections(content) {
  if (!content || typeof content !== "string" || !content.trim()) return [];

  // If HTML content
  if (isHtmlContent(content)) {
    const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
    let match;
    const indices = [];
    while ((match = headingRegex.exec(content)) !== null) {
      indices.push({
        title: decodeHtmlEntities(match[1].replace(/<[^>]+>/g, "").trim()),
        index: match.index,
        length: match[0].length,
      });
    }

    if (indices.length > 0) {
      const items = [];
      for (let i = 0; i < indices.length; i++) {
        const cur = indices[i];
        const next = indices[i + 1];
        const start = cur.index + cur.length;
        const end = next ? next.index : content.length;
        const bodyHtml = content.slice(start, end);
        const cleanBody = decodeHtmlEntities(
          bodyHtml
            .replace(/<li[^>]*>/gi, " • ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        );
        if (cur.title && cleanBody) {
          items.push({ title: cur.title, body: cleanBody });
        }
      }
      if (items.length > 0) return items;
    }
  }

  // If Markdown or fallback line parsing
  const blocks = content.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const items = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines[0].startsWith("#")) {
      const title = lines[0].replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "").trim();
      const body = lines
        .slice(1)
        .map((l) => l.replace(/^[-*]\s+/, "• ").replace(/\*\*/g, "").trim())
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (title) items.push({ title, body: body || title });
    }
  }
  return items;
}


/**
 * Sanitizes HTML to only allow safe semantic elements:
 * h1-h4, p, strong, b, em, i, ul, ol, li, blockquote, div, span, br.
 * Removes script, iframe, form, style, and any inline event handlers (onclick, etc).
 */
export function sanitizePolicyHtml(html) {
  if (!html || typeof html !== "string") return "";

  // Check if DOMParser is available (browser environment)
  if (typeof window === "undefined" || !window.DOMParser) {
    return html;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Remove forbidden tags
    const disallowed = doc.querySelectorAll(
      "script, iframe, object, embed, form, input, button, select, textarea, style, link, meta"
    );
    disallowed.forEach((el) => el.remove());

    // Remove on* attributes and javascript: urls from all elements
    const all = doc.querySelectorAll("*");
    all.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const attrName = attr.name.toLowerCase();
        const attrVal = attr.value.trim().toLowerCase();
        if (
          attrName.startsWith("on") ||
          attrVal.startsWith("javascript:") ||
          attrVal.startsWith("data:")
        ) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

/**
 * Formats an ISO date string into a friendly localized date and time.
 * Example: "Sep 19, 2026, 4:25 PM"
 */
export function formatPolicyDate(dateString) {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
}
