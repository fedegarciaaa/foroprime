const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "em", "code", "pre",
  "blockquote", "ul", "ol", "li", "a",
  "h1", "h2", "h3", "h4",
]);

function sanitizeHtml(html: string): string {
  return html.replace(/<(\/?)([\w]+)([^>]*)>/g, (_full, slash, rawTag, attrs) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (slash) return `</${tag}>`;
    if (tag === "a") {
      const href = /href="(https?:\/\/[^"]+)"/.exec(attrs)?.[1] ?? "";
      if (!href) return "";
      return `<a href="${href}" rel="nofollow ugc noopener noreferrer" target="_blank">`;
    }
    return `<${tag}>`;
  });
}

/**
 * Renderiza markdown muy básico a HTML y lo sanitiza con allowlist estricta.
 * Soporta: párrafos, **bold**, *italic*, `code`, ``` blocks, > quotes, listas, [links].
 * No depende de DOM ni jsdom — seguro en entornos serverless.
 */
export function renderMarkdownSafe(md: string): string {
  // Escape HTML primero para que el markdown no pueda inyectar tags
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bloques de código triple (antes que inline)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // Bold y italic (orden importa)
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");

  // Links [text](url) — solo http(s)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" rel="nofollow ugc noopener noreferrer" target="_blank">$1</a>',
  );

  // Citas (línea que empieza con &gt;)
  html = html.replace(/^&gt;\s?(.+)$/gm, "<blockquote>$1</blockquote>");

  // Listas no ordenadas (- item)
  html = html.replace(/(^|\n)((?:- .+(?:\n|$))+)/g, (_m, pre, block: string) => {
    const items = block
      .trim()
      .split("\n")
      .map((line) => `<li>${line.replace(/^- /, "")}</li>`)
      .join("");
    return `${pre}<ul>${items}</ul>`;
  });

  // Párrafos: dobles saltos de línea -> </p><p>
  const paragraphs = html
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      if (/^<(pre|ul|ol|blockquote|h\d)/.test(p)) return p;
      return `<p>${p.replace(/\n/g, "<br />")}</p>`;
    })
    .join("");

  return sanitizeHtml(paragraphs);
}
