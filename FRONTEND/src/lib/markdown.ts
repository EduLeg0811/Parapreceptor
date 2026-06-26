export const DEFAULT_MARKDOWN_PLACEHOLDER_HTML = ""
  // "<span class='text-muted-foreground'>A resposta da macro aparece aqui.</span>";

type MarkdownTable = {
  headers: string[];
  aligns: Array<"left" | "center" | "right">;
  rows: string[][];
};

export function renderBasicMarkdown(text: string): string {
  const escaped = (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

function renderInlineMarkdown(text: string): string {
  const escaped = (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  return escaped
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/___([\s\S]+?)___/g, "<strong><em>$1</em></strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/(?<!\w)_(?!\s)(.*?)(?<!\s)_(?!\w)/g, "<em>$1</em>");
}

const splitMarkdownTableRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/g)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());

const parseAlignmentCell = (cell: string): "left" | "center" | "right" | null => {
  const normalized = cell.replace(/\s+/g, "");
  if (!/^:?-{3,}:?$/.test(normalized)) return null;
  if (normalized.startsWith(":") && normalized.endsWith(":")) return "center";
  if (normalized.endsWith(":")) return "right";
  return "left";
};

const parseMarkdownTable = (lines: string[], startIndex: number): { table: MarkdownTable; nextIndex: number } | null => {
  const headerLine = lines[startIndex]?.trim() || "";
  const separatorLine = lines[startIndex + 1]?.trim() || "";
  if (!headerLine.includes("|") || !separatorLine.includes("|")) return null;

  const headers = splitMarkdownTableRow(headerLine);
  const separatorCells = splitMarkdownTableRow(separatorLine);
  if (headers.length === 0 || headers.length !== separatorCells.length) return null;

  const aligns = separatorCells.map(parseAlignmentCell);
  if (aligns.some((align) => align === null)) return null;

  const rows: string[][] = [];
  let cursor = startIndex + 2;
  while (cursor < lines.length) {
    const rawLine = lines[cursor];
    const trimmed = rawLine.trim();
    if (!trimmed || !trimmed.includes("|")) break;

    const cells = splitMarkdownTableRow(trimmed);
    if (cells.length !== headers.length) break;
    rows.push(cells);
    cursor += 1;
  }

  return {
    table: {
      headers,
      aligns: aligns as Array<"left" | "center" | "right">,
      rows,
    },
    nextIndex: cursor,
  };
};

const tableAlignToCss = (align: "left" | "center" | "right"): string => {
  if (align === "center") return "center";
  if (align === "right") return "right";
  return "left";
};

const renderMarkdownTable = (table: MarkdownTable): string => {
  const wrapperStyle = "margin:0.75em 0;overflow-x:auto;";
  const tableStyle = "width:100%;border-collapse:collapse;border-spacing:0;font-size:0.95em;line-height:1.45;border:1px solid rgba(34,197,94,0.22);border-radius:10px;overflow:hidden;background:rgba(255,255,255,0.78);";
  const headCellStyle = "padding:8px 10px;background:rgba(115,115,115,0.5);border-bottom:1px solid rgba(34,197,94,0.22);font-weight:600;color:rgb(255,255,255);";
  const bodyCellStyle = "padding:8px 10px;vertical-align:top;border-top:1px solid rgba(24,24,27,0.08);";

  const headerHtml = table.headers
    .map((header, index) => `<th style="${headCellStyle}text-align:${tableAlignToCss(table.aligns[index])};">${renderInlineMarkdown(header)}</th>`)
    .join("");

  const rowsHtml = table.rows
    .map((row, rowIndex) => {
      const rowBackground = rowIndex % 2 === 0 ? "background:rgba(255,255,255,0.92);" : "background:rgba(248,250,252,0.92);";
      const cellsHtml = row
        .map((cell, index) => `<td style="${bodyCellStyle}${rowBackground}text-align:${tableAlignToCss(table.aligns[index])};">${renderInlineMarkdown(cell)}</td>`)
        .join("");
      return `<tr>${cellsHtml}</tr>`;
    })
    .join("");

  return `<div style="${wrapperStyle}"><table style="${tableStyle}"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
};

export function markdownToEditorHtml(text: string): string {
  const raw = (text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";

  const lines = raw.split("\n");
  const htmlParts: string[] = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      htmlParts.push("<br/>");
      index += 1;
      continue;
    }

    const parsedTable = parseMarkdownTable(lines, index);
    if (parsedTable) {
      htmlParts.push(renderMarkdownTable(parsedTable.table));
      index = parsedTable.nextIndex;
      continue;
    }

    if (/^###\s+/.test(trimmed)) {
      htmlParts.push(`<h3>${renderInlineMarkdown(trimmed.replace(/^###\s+/, ""))}</h3>`);
      index += 1;
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      htmlParts.push(`<h2>${renderInlineMarkdown(trimmed.replace(/^##\s+/, ""))}</h2>`);
      index += 1;
      continue;
    }
    if (/^#\s+/.test(trimmed)) {
      htmlParts.push(`<h1>${renderInlineMarkdown(trimmed.replace(/^#\s+/, ""))}</h1>`);
      index += 1;
      continue;
    }

    htmlParts.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    index += 1;
  }

  return htmlParts.join("");
}

export function plainTextToEditorHtml(text: string): string {
  const raw = (text || "").replace(/\r\n/g, "\n");
  if (!raw.trim()) return "<p></p>";
  return raw
    .split("\n")
    .map((line) => `<p>${renderInlineMarkdown(line.trim()) || "<br/>"}</p>`)
    .join("");
}

export function normalizeHistoryContentToMarkdown(text: string): string {
  const raw = (text || "").trim();
  if (!raw) return "";

  const hasHtml = /<\s*\/?\s*(strong|b|em|i|br|p)\b[^>]*>/i.test(raw);
  if (!hasHtml) return raw;

  return raw
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*p\s*>/gi, "\n")
    .replace(/<\s*p\b[^>]*>/gi, "")
    .replace(/<\s*(strong|b)\b[^>]*>([\s\S]*?)<\s*\/\s*(strong|b)\s*>/gi, "**$2**")
    .replace(/<\s*(em|i)\b[^>]*>([\s\S]*?)<\s*\/\s*(em|i)\s*>/gi, "*$2*")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .trim();
}
