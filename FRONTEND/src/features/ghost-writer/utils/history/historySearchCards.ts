import { markdownToEditorHtml } from "@/lib/markdown";

export interface HistorySearchCardMetadata {
  sourcebook?: string;
  title?: string;
  number?: string;
  [key: string]: string | undefined;
}

export interface HistorySearchCardInput {
  textParagraphs: string[];
  metadata: HistorySearchCardMetadata;
}

export interface HistorySearchRenderOptions {
  applyNumbering: boolean;
  showSourceLine?: boolean;
  showMetadata: boolean;
}

const MAIN_LINE_BREAK_TOKEN = "[[HISTORY_SEARCH_BR]]";
const RESULT_LINE_INDENT_PX = 28;
const RESULT_NUMBER_GAP_PX = 8;
const CARD_TEXT_TOP_SPACING_EM = "0.5em";
const SOURCEBOOK_FALLBACK = "s/fonte";
const TITLE_FALLBACK = "s/titulo";
const METADATA_PRIORITY = ["sourcebook", "title", "argumento", "area", "date", "author", "number", "pagina"] as const;
// ==== METADATA VISIBILITY CONTROL ====
// Campos nesta lista NAO aparecem na linha de metadados dos cards.
// Para reinserir source_row, chunk_index ou chunk_total no futuro, remova-os daqui.
// A montagem final da linha acontece em buildMetadataEntries().
const HIDDEN_METADATA_KEYS = new Set([
  "text",
  "row",
  "quest",
  "answer",
  "book",
  "index_id",
  "index_label",
  "source_row",
  "chunk_index",
  "chunk_total",
]);
const CANONICAL_ALIAS_GROUPS: Record<string, string[]> = {
  sourcebook: ["sourcebook"],
  title: ["title", "titulo", "verbete", "tema", "cabecalho", "heading"],
  argumento: ["argumento"],
  area: ["area"],
  date: ["date", "data"],
  author: ["author", "autor"],
  number: ["number", "numero", "paragraph_number", "index", "ordem", "id"],
  pagina: ["pagina", "page"],
};

type MetadataEntry = {
  key: string;
  keyLower: string;
  canonicalKey: string;
  value: string;
  order: number;
};

const trim = (value: string | undefined): string => (value || "").replace(/\u00a0/g, " ").trim();

const normalizeMetadataValue = (value: string | undefined): string => trim(value);

const normalizeComparisonValue = (value: string): string =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const joinTextParagraphs = (textParagraphs: string[]): string =>
  textParagraphs
    .map((paragraph) => trim(paragraph))
    .filter(Boolean)
    .join(MAIN_LINE_BREAK_TOKEN);

export const replaceHistorySearchInlineBreaks = (text: string): string =>
  (text || "").replace(/\s*\|\s*/g, MAIN_LINE_BREAK_TOKEN);

const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const resolveCanonicalKey = (key: string): string => {
  const normalizedKey = key.trim().toLowerCase();
  for (const [canonicalKey, aliases] of Object.entries(CANONICAL_ALIAS_GROUPS)) {
    if (aliases.includes(normalizedKey)) return canonicalKey;
  }
  return normalizedKey;
};

const getPriorityIndex = (canonicalKey: string): number => {
  const index = METADATA_PRIORITY.indexOf(canonicalKey as (typeof METADATA_PRIORITY)[number]);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
};

const buildSourceRefLine = (metadata: HistorySearchCardMetadata): string => {
  const bookCode = trim(metadata.book);
  const sourcebook = trim(metadata.sourcebook) || SOURCEBOOK_FALLBACK;
  const title = trim(metadata.title) || TITLE_FALLBACK;
  const date = trim(metadata.date);
  const author = trim(metadata.author);
  const pagina = trim(metadata.pagina) || "";
  if (bookCode === "EC") return `(**${sourcebook}**, verbete *${title}*)`;
  if (bookCode === "QUEST") {
    const suffixParts = [date, author, pagina ? `p. ${pagina}` : ""].filter(Boolean);
    return suffixParts.length > 0
      ? `(**${sourcebook}**, ${suffixParts.join(", ")})`
      : `(**${sourcebook}**)`;
  }
  return pagina ? `(**${sourcebook}**, p. ${pagina})` : `(**${sourcebook}**)`;
};

const formatMetadataEntry = (entry: MetadataEntry): string => {
  if (entry.canonicalKey === "sourcebook") return entry.value;
  if (entry.canonicalKey === "title") return entry.value;
  // ==== METADATA LABEL CONTROL ====
  // date e author ficam sem prefixo para reduzir ruido visual:
  // antes: "date: 12/11/2012 | author: L.L."
  // agora: "12/11/2012 | L.L."
  // Para voltar a exibir os titulos, remova estas duas linhas.
  if (entry.canonicalKey === "date") return entry.value;
  if (entry.canonicalKey === "author") return entry.value;
  //if (entry.canonicalKey === "number") return `#${entry.value}`;
  if (entry.canonicalKey === "pagina") return `p. ${entry.value}`;
  return `${entry.key}: ${entry.value}`;
};

const buildMetadataEntries = (metadata: HistorySearchCardMetadata): string[] => {
  const entries = Object.entries(metadata)
    .map(([key, value], order): MetadataEntry | null => {
      const normalizedValue = normalizeMetadataValue(value);
      if (!normalizedValue) return null;
      const keyLower = key.trim().toLowerCase();
      if (HIDDEN_METADATA_KEYS.has(keyLower)) return null;
      return {
        key,
        keyLower,
        canonicalKey: resolveCanonicalKey(key),
        value: normalizedValue,
        order,
      };
    })
    .filter((entry): entry is MetadataEntry => entry !== null);

  const canonicalValues = new Map<string, string>();
  for (const entry of entries) {
    if (entry.keyLower === entry.canonicalKey) {
      canonicalValues.set(entry.canonicalKey, normalizeComparisonValue(entry.value));
    }
  }

  const seenEntries = new Set<string>();
  const filteredEntries = entries.filter((entry) => {
    const canonicalValue = canonicalValues.get(entry.canonicalKey);
    const isAliasOfCanonical = entry.keyLower !== entry.canonicalKey;
    if (isAliasOfCanonical && canonicalValue && canonicalValue === normalizeComparisonValue(entry.value)) {
      return false;
    }

    const signature = `${entry.keyLower}|${normalizeComparisonValue(entry.value)}`;
    if (seenEntries.has(signature)) return false;
    seenEntries.add(signature);
    return true;
  });

  filteredEntries.sort((left, right) => {
    const leftPriority = getPriorityIndex(left.canonicalKey);
    const rightPriority = getPriorityIndex(right.canonicalKey);
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.order - right.order;
  });

  return filteredEntries.map(formatMetadataEntry);
};

const applySearchSubLineStyle = (block: HTMLElement, applyNumbering: boolean): void => {
  block.style.paddingLeft = applyNumbering ? `${RESULT_LINE_INDENT_PX}px` : "0";
  block.style.textIndent = "0";
};


// Fonte {date{ antes da resposta de Mini Arlindo Mini_Arlindo}}
const applyInitialDateStyle = (block: HTMLElement): void => {
  const firstStrong = block.querySelector("strong");
  if (!firstStrong) return;

  const dateText = (firstStrong.textContent || "").trim();
  if (!/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateText)) return;

  firstStrong.setAttribute("style", "color:#4d8f5b;font-weight:600;font-size:inherit;");
};

export function buildHistorySearchCardsMarkdown(items: HistorySearchCardInput[]): string {
  return items
    .map(({ textParagraphs, metadata }) => {
      const mainLine = joinTextParagraphs(textParagraphs);
      const sourceRefLine = buildSourceRefLine(metadata);
      const metadataEntries = buildMetadataEntries(metadata);
      const lines = [mainLine, sourceRefLine];

      if (metadataEntries.length > 0) {
        lines.push(metadataEntries.join(" | "));
      }

      return lines.join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function renderHistorySearchCardsHtml(markdown: string, options: HistorySearchRenderOptions): string {
  const normalizedMarkdown = trim(markdown);
  if (!normalizedMarkdown) return "";

  const html = markdownToEditorHtml(normalizedMarkdown);
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLDivElement | null;
  if (!root) return html;

  const items: string[][] = [];
  let currentItem: string[] = [];

  const pushCurrent = () => {
    const filteredLines = currentItem.map((line) => line.trim()).filter(Boolean);
    if (filteredLines.length > 0) items.push(filteredLines);
    currentItem = [];
  };

  for (const childNode of Array.from(root.childNodes)) {
    if (childNode.nodeType === Node.ELEMENT_NODE && (childNode as Element).tagName.toLowerCase() === "br") {
      pushCurrent();
      continue;
    }

    if (childNode.nodeType !== Node.ELEMENT_NODE) continue;
    const element = childNode as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    if (tagName !== "p" && tagName !== "li") continue;

    const innerHtml = (element.innerHTML || "").trim();
    if (!innerHtml) continue;
    currentItem.push(innerHtml);
  }
  pushCurrent();

  const shouldPad = items.length >= 10;
  root.innerHTML = "";

  items.forEach((itemLines, index) => {
    const wrapper = doc.createElement("div");
    wrapper.style.marginTop = CARD_TEXT_TOP_SPACING_EM;
    wrapper.style.marginBottom = "0.2em";

    const mainLine = doc.createElement("div");
    const mainLineHtml = (itemLines[0] || "").split(MAIN_LINE_BREAK_TOKEN).join("<br/>").trim();
    if (options.applyNumbering) {
      const normalizedIndex = shouldPad && index + 1 < 10 ? `0${index + 1}` : String(index + 1);
      mainLine.style.display = "flex";
      mainLine.style.alignItems = "flex-start";
      mainLine.style.gap = `${RESULT_NUMBER_GAP_PX}px`;

      const numberBlock = doc.createElement("div");
      numberBlock.style.width = `${RESULT_LINE_INDENT_PX - RESULT_NUMBER_GAP_PX}px`;
      numberBlock.style.minWidth = `${RESULT_LINE_INDENT_PX - RESULT_NUMBER_GAP_PX}px`;
      numberBlock.style.flex = `0 0 ${RESULT_LINE_INDENT_PX - RESULT_NUMBER_GAP_PX}px`;
      numberBlock.style.textAlign = "right";
      numberBlock.style.lineHeight = "inherit";
      numberBlock.innerHTML = `<strong style="color:#1d4ed8;font-weight:700;">${escapeAttribute(normalizedIndex)}.</strong>`;

      const contentBlock = doc.createElement("div");
      contentBlock.style.flex = "1 1 auto";
      contentBlock.style.minWidth = "0";
      contentBlock.innerHTML = mainLineHtml;
      applyInitialDateStyle(contentBlock);

      mainLine.appendChild(numberBlock);
      mainLine.appendChild(contentBlock);
    } else {
      mainLine.innerHTML = mainLineHtml;
      applyInitialDateStyle(mainLine);
      mainLine.style.paddingLeft = "0";
      mainLine.style.textIndent = "0";
    }
    mainLine.style.marginTop = "0";
    mainLine.style.marginBottom = "0.15em";
    wrapper.appendChild(mainLine);

    if (options.showSourceLine !== false) {
      const sourceRefLine = doc.createElement("div");
      sourceRefLine.innerHTML = itemLines[1] || buildSourceRefLine({});
      applySearchSubLineStyle(sourceRefLine, options.applyNumbering);
      sourceRefLine.style.marginTop = "0";
      sourceRefLine.style.marginBottom = "0.1em";
      sourceRefLine.style.fontSize = "0.9em";
      sourceRefLine.style.color = "rgba(115,115,115,0.5)";
      wrapper.appendChild(sourceRefLine);
    }

    const metadataLineHtml = itemLines.slice(2).join("<br/>").trim();
    if (options.showMetadata && metadataLineHtml) {
      const metadataLine = doc.createElement("div");
      metadataLine.innerHTML = metadataLineHtml;
      applySearchSubLineStyle(metadataLine, options.applyNumbering);
      metadataLine.style.marginTop = "0";
      metadataLine.style.marginBottom = "0";
      metadataLine.style.fontSize = "0.9em";
      metadataLine.style.color = "#ff0000ae";
      wrapper.appendChild(metadataLine);
    }

    root.appendChild(wrapper);
  });

  return root.innerHTML;
}
