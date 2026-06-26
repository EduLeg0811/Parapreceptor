import { renderHistorySearchCardsHtml } from "@/features/ghost-writer/utils/history/historySearchCards";
import { markdownToEditorHtml, normalizeHistoryContentToMarkdown } from "@/lib/markdown";
import type { AIResponse } from "@/features/ghost-writer/types";
import { renderLexicalOverviewPayloadHtml } from "@/features/ghost-writer/utils/history/historyLexicalOverview";
import { renderSemanticOverviewPayloadHtml } from "@/features/ghost-writer/utils/history/historySemanticOverview";

const RESULT_LINE_INDENT_PX = 28;
const RESULT_NUMBER_GAP_PX = 8;

type HistoryResponseRenderOptions = {
  applyNumbering: boolean;
  applyReferences: boolean;
  applyMetadata: boolean;
  applyHighlight?: boolean;
  compactSpacing?: boolean;
};

const parseHtmlRoot = (html: string): { doc: Document; root: HTMLDivElement } | null => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLDivElement | null;
  if (!root) return null;
  return { doc, root };
};

const isHttpUrlText = (value: string): boolean => /^https?:\/\/\S+$/i.test((value || "").trim());

const applyIndentedLine = (block: Element, px = 19): void => {
  const htmlBlock = block as HTMLElement;
  htmlBlock.style.paddingLeft = `${px}px`;
};

const applyNumberedBlockLayout = (block: Element, indexLabel: string, doc: Document): void => {
  const htmlBlock = block as HTMLElement;
  const originalHtml = htmlBlock.innerHTML;

  htmlBlock.innerHTML = "";
  htmlBlock.style.display = "flex";
  htmlBlock.style.alignItems = "flex-start";
  htmlBlock.style.gap = `${RESULT_NUMBER_GAP_PX}px`;
  htmlBlock.style.paddingLeft = "0";
  htmlBlock.style.textIndent = "0";

  const numberBlock = doc.createElement("span");
  numberBlock.style.width = `${RESULT_LINE_INDENT_PX - RESULT_NUMBER_GAP_PX}px`;
  numberBlock.style.minWidth = `${RESULT_LINE_INDENT_PX - RESULT_NUMBER_GAP_PX}px`;
  numberBlock.style.flex = `0 0 ${RESULT_LINE_INDENT_PX - RESULT_NUMBER_GAP_PX}px`;
  numberBlock.style.textAlign = "right";
  numberBlock.style.lineHeight = "inherit";
  numberBlock.style.display = "inline-block";
  numberBlock.innerHTML = `<strong style="color:#1d4ed8;font-weight:700;">${indexLabel}.</strong>`;

  const contentBlock = doc.createElement("span");
  contentBlock.style.flex = "1 1 auto";
  contentBlock.style.minWidth = "0";
  contentBlock.style.display = "block";
  contentBlock.innerHTML = originalHtml;

  htmlBlock.appendChild(numberBlock);
  htmlBlock.appendChild(contentBlock);
};

const applyExternalLinkLineStyle = (block: Element, urlText: string, doc: Document): void => {
  const htmlBlock = block as HTMLElement;
  htmlBlock.style.fontSize = "0.9em";
  htmlBlock.style.color = "rgba(115,115,115,0.5)";
  const anchor = doc.createElement("a");
  anchor.href = urlText;
  anchor.dataset.pdfDownloadUrl = urlText;
  anchor.setAttribute("aria-label", "Baixar PDF");
  anchor.setAttribute("download", "");
  anchor.style.color = "inherit";
  anchor.style.textDecoration = "none";
  anchor.style.display = "inline-flex";
  anchor.style.alignItems = "center";
  anchor.style.justifyContent = "center";
  anchor.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" fill="#ef4444"/>
        <path d="M14 2v5h5" fill="#fca5a5"/>
        <path d="M8 17h8M8 13h5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`;
  block.innerHTML = "";
  block.appendChild(anchor);
};

const appendExternalLinkIconToHeader = (block: Element, urlText: string, doc: Document): void => {
  const anchor = doc.createElement("a");
  anchor.href = urlText;
  anchor.dataset.pdfDownloadUrl = urlText;
  anchor.setAttribute("aria-label", "Baixar PDF");
  anchor.setAttribute("download", "");
  anchor.style.display = "inline-flex";
  anchor.style.alignItems = "center";
  anchor.style.justifyContent = "center";
  anchor.style.verticalAlign = "baseline";
  anchor.style.marginLeft = "12px";
  anchor.style.textDecoration = "none";
  anchor.style.textIndent = "0";
  anchor.style.position = "relative";
  anchor.style.top = "1px";
  anchor.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" fill="#ef4444"/>
        <path d="M14 2v5h5" fill="#fca5a5"/>
        <path d="M8 17h8M8 13h5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`;
  block.appendChild(anchor);
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeForAccentInsensitiveMatch = (value: string): string => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const buildNormalizedIndexMap = (value: string): { normalized: string; indexMap: number[] } => {
  let normalized = "";
  const indexMap: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const normalizedChar = normalizeForAccentInsensitiveMatch(value[index]);
    for (let normalizedIndex = 0; normalizedIndex < normalizedChar.length; normalizedIndex += 1) {
      normalized += normalizedChar[normalizedIndex];
      indexMap.push(index);
    }
  }

  return { normalized, indexMap };
};

const extractSearchQuery = (query: string): string => {
  const raw = query || "";
  const withTotal = raw.match(/Termo:\s*([\s\S]*?)\s*\|\s*Total:/i);
  if (withTotal?.[1]) return withTotal[1].trim();
  const semanticWithTotal = raw.match(/Consulta:\s*([\s\S]*?)\s*\|\s*Total(?:\s+semantic)?:/i);
  if (semanticWithTotal?.[1]) return semanticWithTotal[1].trim();
  if (/\b(?:Author|Title|Area|Text):/i.test(raw)) {
    const segments = raw
      .split("|")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .filter((segment) => !/^Total:/i.test(segment) && !/^Exibidos:/i.test(segment));
    const values = segments
      .map((segment) => segment.replace(/^[A-Za-zÀ-ÿ_ ]+:\s*/i, "").trim())
      .filter(Boolean);
    if (values.length > 0) return values.join(" ");
  }
  const legacyWithMax = raw.match(/Termo:\s*([\s\S]*?)\s*\|\s*Max:/i);
  if (legacyWithMax?.[1]) return legacyWithMax[1].trim();
  const fallback = raw.match(/Termo:\s*([\s\S]*?)$/i);
  if (fallback?.[1]) return fallback[1].trim();
  const semanticFallback = raw.match(/Consulta:\s*([\s\S]*?)$/i);
  return (semanticFallback?.[1] || "").trim();
};

const extractHighlightTerms = (query: string): string[] => {
  const raw = extractSearchQuery(query);
  if (!raw) return [];
  const tokens = raw.match(/"[^"]+"|\S+/g) || [];
  const cleaned = tokens
    .map((token) => {
      const quoted = token.startsWith("\"") && token.endsWith("\"") && token.length >= 2;
      const core = quoted ? token.slice(1, -1) : token;
      return core.replace(/[!&|()]/g, "").replace(/\*/g, "").trim();
    })
    .filter((token) => token.length >= 2);
  return Array.from(new Set(cleaned)).sort((a, b) => b.length - a.length);
};

const highlightBookSearchHtml = (html: string, query: string): string => {
  const terms = extractHighlightTerms(query);
  if (terms.length === 0) return html;

  const parsed = parseHtmlRoot(html);
  if (!parsed) return html;
  const { doc, root } = parsed;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.nodeValue || !node.nodeValue.trim()) continue;
    if (node.parentElement?.tagName.toLowerCase() === "mark") continue;
    textNodes.push(node);
  }

  const normalizedTerms = terms.map((term) => normalizeForAccentInsensitiveMatch(term));
  const pattern = new RegExp(normalizedTerms.map((term) => escapeRegExp(term)).join("|"), "gi");
  for (const node of textNodes) {
    const value = node.nodeValue || "";
    const { normalized, indexMap } = buildNormalizedIndexMap(value);
    pattern.lastIndex = 0;
    if (!pattern.test(normalized)) continue;

    const fragment = doc.createDocumentFragment();
    let lastIndex = 0;
    normalized.replace(pattern, (match, offset) => {
      const start = indexMap[offset];
      const end = indexMap[offset + match.length - 1] + 1;

      if (start > lastIndex) fragment.appendChild(doc.createTextNode(value.slice(lastIndex, start)));
      const mark = doc.createElement("mark");
      mark.setAttribute("style", "background-color:#fef08a;padding:0 .08em;");
      mark.textContent = value.slice(start, end);
      fragment.appendChild(mark);
      lastIndex = end;
      return match;
    });
    if (lastIndex < value.length) fragment.appendChild(doc.createTextNode(value.slice(lastIndex)));
    node.parentNode?.replaceChild(fragment, node);
  }

  return root.innerHTML;
};

const styleNumberedListItemsHtml = (html: string): string => {
  const parsed = parseHtmlRoot(html);
  if (!parsed) return html;
  const { doc, root } = parsed;

  const blocks = Array.from(root.querySelectorAll("p, li"));
  const numberedPattern = /^\s*(\d{1,2})\.\s*/;
  const numberedBlocks = blocks
    .map((block) => {
      const text = (block.textContent || "").replace(/\u00a0/g, " ");
      const match = text.match(numberedPattern);
      if (!match) return null;
      return { block, index: Number(match[1]) };
    })
    .filter((item): item is { block: Element; index: number } => item !== null);

  const shouldPad = numberedBlocks.length >= 10;
  for (const item of numberedBlocks) {
    const normalizedIndex = shouldPad && item.index < 10 ? `0${item.index}` : String(item.index);
    const firstStrong = item.block.querySelector("strong");
    if (firstStrong && /^\s*\d{1,2}\.\s*$/.test((firstStrong.textContent || "").replace(/\u00a0/g, " "))) {
      firstStrong.remove();
      const next = item.block.firstChild;
      if (next?.nodeType === Node.TEXT_NODE) next.nodeValue = (next.nodeValue || "").replace(/^\s+/, "");
    } else if (item.block.firstChild?.nodeType === Node.TEXT_NODE) {
      const raw = (item.block.firstChild.nodeValue || "").replace(/\u00a0/g, " ");
      item.block.firstChild.nodeValue = raw.replace(/^\s*\d{1,2}\.\s*/, "");
    }

    applyNumberedBlockLayout(item.block, normalizedIndex, doc);
    (item.block as HTMLElement).style.marginTop = "0.6em";
    (item.block as HTMLElement).style.marginBottom = "0.2em";
  }

  return root.innerHTML;
};

const styleVerbeteSearchResultItemsHtml = (html: string): string => {
  const parsed = parseHtmlRoot(html);
  if (!parsed) return html;
  const { doc, root } = parsed;

  const allBlocks = Array.from(root.querySelectorAll("p"));
  const blocks = allBlocks.filter((block) => {
    const text = (block.textContent || "").replace(/\u00a0/g, " ").trim();
    if (!text) return false;
    return block.querySelector("strong") !== null && block.querySelector("em") !== null && text.includes("#");
  });

  const shouldPad = blocks.length >= 10;
  blocks.forEach((block, index) => {
    const normalizedIndex = shouldPad && index + 1 < 10 ? `0${index + 1}` : String(index + 1);
    if (block.firstChild?.nodeType === Node.TEXT_NODE) {
      block.firstChild.nodeValue = (block.firstChild.nodeValue || "").replace(/^\s*\d{1,2}\.\s*/, "");
    }
    applyNumberedBlockLayout(block, normalizedIndex, doc);
    (block as HTMLElement).style.marginTop = index === 0 ? "0.2em" : "0.45em";
    (block as HTMLElement).style.marginBottom = "0.15em";
  });

  // Keep the definologia/body lines aligned to the same text column as the numbered header.
  for (let index = 0; index < allBlocks.length; index += 1) {
    const block = allBlocks[index];
    const text = (block.textContent || "").replace(/\u00a0/g, " ").trim();
    const isHeaderBlock = block.querySelector("strong") !== null && block.querySelector("em") !== null && text.includes("#");
    if (!isHeaderBlock) continue;

    for (let lookAhead = index + 1; lookAhead < allBlocks.length; lookAhead += 1) {
      const candidate = allBlocks[lookAhead];
      const candidateText = (candidate.textContent || "").replace(/\u00a0/g, " ").trim();
      const candidateIsHeader = candidate.querySelector("strong") !== null && candidate.querySelector("em") !== null && candidateText.includes("#");
      if (candidateIsHeader) break;

      applyIndentedLine(candidate, RESULT_LINE_INDENT_PX);
    }
  }

  return root.innerHTML;
};

const removeNumberingFromHistoryHtml = (html: string): string => {
  const parsed = parseHtmlRoot(html);
  if (!parsed) return html;
  const { root } = parsed;

  for (const list of Array.from(root.querySelectorAll("ol"))) {
    const htmlList = list as HTMLOListElement;
    htmlList.style.listStyle = "none";
    htmlList.style.paddingLeft = "0";
    htmlList.style.marginLeft = "0";
  }

  for (const block of Array.from(root.querySelectorAll("p, li"))) {
    const firstStrong = block.querySelector("strong");
    if (firstStrong) {
      const normalizedStrongText = (firstStrong.textContent || "").replace(/\u00a0/g, " ");
      if (/^\s*\d{1,2}\.\s*$/.test(normalizedStrongText)) {
        firstStrong.remove();
        const next = block.firstChild;
        if (next?.nodeType === Node.TEXT_NODE) next.nodeValue = (next.nodeValue || "").replace(/^\s+/, "");
      } else if (/^\s*\d{1,2}\.\s+/.test(normalizedStrongText)) {
        firstStrong.textContent = normalizedStrongText.replace(/^\s*\d{1,2}\.\s+/, "");
      }
    }

    if (block.firstChild?.nodeType === Node.TEXT_NODE) {
      block.firstChild.nodeValue = (block.firstChild.nodeValue || "").replace(/^\s*\d{1,2}\.\s*/, "");
    }

    (block as HTMLElement).style.paddingLeft = "0";
    (block as HTMLElement).style.textIndent = "0";
  }

  return root.innerHTML;
};

const flattenNumberedBlocksForClipboard = (html: string): string => {
  const parsed = parseHtmlRoot(html);
  if (!parsed) return html;
  const { doc, root } = parsed;
  const numberedPattern = /^\s*(\d{1,2})\.\s*/;

  // Normaliza a estrutura invalida gerada quando um bloco flex com divs internos
  // passa por exportacao em <p>, e o parser separa os divs como irmaos do paragrafo.
  const rootChildren = Array.from(root.children) as HTMLElement[];
  for (let index = 0; index < rootChildren.length - 2; index += 1) {
    const current = rootChildren[index];
    const next = rootChildren[index + 1];
    const nextNext = rootChildren[index + 2];
    const currentIsEmptyParagraph = current.tagName === "P" && !((current.textContent || "").replace(/\u00a0/g, " ").trim());
    const nextIsNumberDiv = next.tagName === "DIV" && /^\s*\d{1,2}\.\s*$/.test((next.textContent || "").replace(/\u00a0/g, " "));
    const nextNextIsContentDiv = nextNext.tagName === "DIV" && Boolean((nextNext.textContent || "").replace(/\u00a0/g, " ").trim());

    if (!currentIsEmptyParagraph || !nextIsNumberDiv || !nextNextIsContentDiv) continue;

    const numberText = ((next.textContent || "").replace(/\u00a0/g, " ").match(/^\s*(\d{1,2})\.\s*$/) || [])[1] || "";
    current.innerHTML = `<strong>${numberText}.</strong>&nbsp;&nbsp;${nextNext.innerHTML}`;
    next.remove();
    nextNext.remove();
  }

  const candidateBlocks = [
    ...Array.from(root.querySelectorAll("div")).filter((block) => (block as HTMLElement).style.display === "flex"),
    ...Array.from(root.querySelectorAll("p, li")),
  ];

  for (const block of candidateBlocks) {
    const htmlBlock = block as HTMLElement;
    const text = (htmlBlock.textContent || "").replace(/\u00a0/g, " ");
    const match = text.match(numberedPattern);
    if (!match) continue;

    const indexLabel = match[1];

    if (htmlBlock.style.display === "flex") {
      const children = Array.from(htmlBlock.children) as HTMLElement[];
      const contentBlock = children[1];
      if (contentBlock) {
        htmlBlock.innerHTML = `<strong>${indexLabel}.</strong>&nbsp;&nbsp;${contentBlock.innerHTML}`;
      } else {
        htmlBlock.innerHTML = htmlBlock.innerHTML.replace(numberedPattern, `<strong>${indexLabel}.</strong>&nbsp;&nbsp;`);
      }
    } else {
      const firstStrong = htmlBlock.querySelector("strong");
      if (firstStrong && /^\s*\d{1,2}\.\s*$/.test((firstStrong.textContent || "").replace(/\u00a0/g, " "))) {
        firstStrong.remove();
        const next = htmlBlock.firstChild;
        if (next?.nodeType === Node.TEXT_NODE) next.nodeValue = (next.nodeValue || "").replace(/^\s+/, "");
      } else if (htmlBlock.firstChild?.nodeType === Node.TEXT_NODE) {
        htmlBlock.firstChild.nodeValue = (htmlBlock.firstChild.nodeValue || "").replace(/^\s*\d{1,2}\.\s*/, "");
      }

      const numberStrong = doc.createElement("strong");
      numberStrong.textContent = `${indexLabel}.`;
      htmlBlock.insertBefore(doc.createTextNode("\u00a0\u00a0"), htmlBlock.firstChild);
      htmlBlock.insertBefore(numberStrong, htmlBlock.firstChild);
    }

    htmlBlock.style.display = "block";
    htmlBlock.style.width = "";
    htmlBlock.style.minWidth = "";
    htmlBlock.style.flex = "";
    htmlBlock.style.paddingLeft = "0";
    htmlBlock.style.textIndent = "0";
    htmlBlock.style.gap = "0";
    htmlBlock.style.alignItems = "";
    htmlBlock.style.textAlign = "";
  }

  return root.innerHTML;
};

const styleVerbeteSearchHtml = (html: string): string => {
  const parsed = parseHtmlRoot(html);
  if (!parsed) return html;
  const { doc, root } = parsed;
  const blocks = Array.from(root.querySelectorAll("p"));
  if (blocks.length === 0) return html;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const rawText = (block.textContent || "").trim();
    const hasExternalHref = Array.from(block.querySelectorAll("a")).some((anchor) => isHttpUrlText(anchor.getAttribute("href") || ""));
    const hasHeaderShape = block.querySelector("strong") !== null && block.querySelector("em") !== null && rawText.includes("#");

    if (hasHeaderShape) {
      block.style.color = "#1e3a8a";
      block.style.fontWeight = "700";
      block.style.paddingLeft = `${RESULT_LINE_INDENT_PX}px`;
      block.style.textIndent = "0";

      for (let lookAhead = index + 1; lookAhead < blocks.length; lookAhead += 1) {
        const candidateBlock = blocks[lookAhead];
        const candidateText = (candidateBlock.textContent || "").trim();
        const candidateHasHeaderShape = candidateBlock.querySelector("strong") !== null && candidateBlock.querySelector("em") !== null && candidateText.includes("#");
        if (candidateHasHeaderShape) break;

        const candidateAnchor = candidateBlock.querySelector("a") as HTMLAnchorElement | null;
        const candidateHref = (candidateAnchor?.href || "").trim();
        const candidateIsUrl = isHttpUrlText(candidateText);
        const candidateHasExternalHref = Boolean(candidateHref) && isHttpUrlText(candidateHref);
        const candidateUrl = candidateIsUrl ? candidateText : candidateHasExternalHref ? candidateHref : "";

        if (candidateUrl) {
          appendExternalLinkIconToHeader(block, candidateUrl, doc);
          candidateBlock.remove();
          break;
        }
      }
    } else {
      applyIndentedLine(block);
    }

    if (isHttpUrlText(rawText)) {
      applyExternalLinkLineStyle(block, rawText, doc);
    } else if (hasExternalHref) {
      const anchor = block.querySelector("a") as HTMLAnchorElement | null;
      const href = anchor?.href?.trim() || "";
      if (href) applyExternalLinkLineStyle(block, href, doc);
    }
  }

  return root.innerHTML;
};

const removeVerbeteLinkLineHtml = (html: string): string => {
  const parsed = parseHtmlRoot(html);
  if (!parsed) return html;
  const { root } = parsed;

  for (const block of Array.from(root.querySelectorAll("p, li"))) {
    const text = (block.textContent || "").trim();
    const hasExternalHref = Array.from(block.querySelectorAll("a")).some((anchor) => isHttpUrlText(anchor.getAttribute("href") || ""));
    if (isHttpUrlText(text) || /^pdf$/i.test(text) || hasExternalHref) block.remove();
  }

  return root.innerHTML;
};

const styleRandomPensataHtml = (html: string): string => {
  const parsed = parseHtmlRoot(html);
  if (!parsed) return html;
  const { root } = parsed;
  const blocks = Array.from(root.querySelectorAll("p, li"));
  const firstContentBlock = blocks.find((block) => ((block.textContent || "").replace(/\u00a0/g, " ").trim().length > 0));
  if (!firstContentBlock) return html;

  const pensataBlock = firstContentBlock as HTMLElement;
  pensataBlock.style.background = "linear-gradient(180deg, rgba(255,247,237,0.96), rgba(255,251,235,0.9))";
  pensataBlock.style.border = "1px solid rgba(253,186,116,0.45)";
  pensataBlock.style.borderLeft = "4px solid rgba(249,115,22,0.55)";
  pensataBlock.style.borderRadius = "12px";
  pensataBlock.style.display = "inline-block";
  pensataBlock.style.maxWidth = "100%";
  pensataBlock.style.padding = "0.8em 0.95em";
  pensataBlock.style.marginBottom = "0.9em";
  pensataBlock.style.fontSize = "1.12em";
  pensataBlock.style.lineHeight = "1.65";
  pensataBlock.style.fontWeight = "500";
  pensataBlock.style.color = "#1e3a8a";

  return root.innerHTML;
};

const convertHistorySearchExportDivsToParagraphs = (html: string): string => {
  const parsed = parseHtmlRoot(html);
  if (!parsed) return html;
  const { doc, root } = parsed;
  const fragment = doc.createDocumentFragment();

  const copyInlineStyles = (from: HTMLElement, to: HTMLElement) => {
    const style = from.getAttribute("style");
    if (style) to.setAttribute("style", style);
  };

  for (const wrapper of Array.from(root.children)) {
    const wrapperElement = wrapper as HTMLElement;
    const childBlocks = Array.from(wrapperElement.children);
    if (childBlocks.length === 0) continue;

    childBlocks.forEach((child) => {
      const paragraph = doc.createElement("p");
      const childElement = child as HTMLElement;
      if (childElement.style.display === "flex") {
        const childParts = Array.from(childElement.children) as HTMLElement[];
        const numberPart = childParts[0];
        const contentPart = childParts[1];
        const numberText = (numberPart?.textContent || "").replace(/\u00a0/g, " ").trim();
        const normalizedNumber = numberText.match(/^(\d{1,2})\.$/)?.[1] || "";
        const contentHtml = contentPart?.innerHTML || childElement.innerHTML;
        paragraph.innerHTML = normalizedNumber
          ? `<strong>${normalizedNumber}.</strong>&nbsp;&nbsp;${contentHtml}`
          : contentHtml;
      } else {
        paragraph.innerHTML = childElement.innerHTML;
      }
      copyInlineStyles(child as HTMLElement, paragraph);
      if (childElement.style.display === "flex") {
        paragraph.style.display = "block";
        paragraph.style.alignItems = "";
        paragraph.style.gap = "0";
      }
      fragment.appendChild(paragraph);
    });

    const spacer = doc.createElement("p");
    spacer.innerHTML = "&nbsp;";
    fragment.appendChild(spacer);
  }

  if (fragment.lastChild instanceof HTMLElement && (fragment.lastChild.textContent || "").replace(/\u00a0/g, " ").trim() === "") {
    fragment.lastChild.remove();
  }

  root.innerHTML = "";
  root.appendChild(fragment);
  return root.innerHTML;
};

const normalizeResponseMarkdown = (content: string, compactSpacing = false): string => {
  let markdown = normalizeHistoryContentToMarkdown(content).replace(/\u00a0/g, " ");
  if (compactSpacing) markdown = markdown.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n");
  return markdown;
};

const renderHistorySearchResponseHtml = (response: AIResponse, options: HistoryResponseRenderOptions): string => {
  const markdown = normalizeResponseMarkdown(response.content, options.compactSpacing);
  const renderedHtml = renderHistorySearchCardsHtml(markdown, {
    applyNumbering: options.applyNumbering,
    showSourceLine: options.applyReferences,
    showMetadata: options.applyMetadata,
  });
  if (!options.applyHighlight) return renderedHtml;
  return response.type === "app_book_search" || response.type === "app_semantic_search"
    ? highlightBookSearchHtml(renderedHtml, response.query)
    : renderedHtml;
};

const renderHistorySearchResponseExportHtml = (
  response: AIResponse,
  options: Pick<HistoryResponseRenderOptions, "applyNumbering" | "applyReferences" | "applyMetadata" | "applyHighlight" | "compactSpacing">,
): string => {
  const markdown = normalizeResponseMarkdown(response.content, options.compactSpacing);
  const renderedHtml = renderHistorySearchCardsHtml(markdown, {
    applyNumbering: options.applyNumbering,
    showSourceLine: options.applyReferences,
    showMetadata: options.applyMetadata,
  });
  const exportHtml = convertHistorySearchExportDivsToParagraphs(renderedHtml);
  if (!options.applyHighlight) return exportHtml;
  return response.type === "app_book_search" || response.type === "app_semantic_search"
    ? highlightBookSearchHtml(exportHtml, response.query)
    : exportHtml;
};

export const isHistorySearchResponseType = (type: AIResponse["type"]): type is "app_book_search" | "app_semantic_search" =>
  type === "app_book_search" || type === "app_semantic_search";

const isLexicalOverviewResponse = (
  response: AIResponse,
): response is AIResponse & {
  type: "app_lexical_overview";
  payload: Extract<NonNullable<AIResponse["payload"]>, { kind: "lexical_overview" }>;
} =>
  response.type === "app_lexical_overview" && response.payload?.kind === "lexical_overview";

const isSemanticOverviewResponse = (
  response: AIResponse,
): response is AIResponse & {
  type: "app_semantic_overview";
  payload: Extract<NonNullable<AIResponse["payload"]>, { kind: "semantic_overview" }>;
} =>
  response.type === "app_semantic_overview" && response.payload?.kind === "semantic_overview";

export const renderHistoryResponseEditorHtml = (
  response: AIResponse,
  options: Pick<HistoryResponseRenderOptions, "applyNumbering" | "applyReferences" | "applyMetadata" | "applyHighlight">,
): string => {
  if (isLexicalOverviewResponse(response)) {
    return renderLexicalOverviewPayloadHtml(response.payload, response.payload.term, {
      applyNumbering: options.applyNumbering,
      applyReferences: options.applyReferences,
      applyMetadata: options.applyMetadata,
      applyHighlight: options.applyHighlight ?? true,
      forExport: false,
    });
  }

  if (isSemanticOverviewResponse(response)) {
    return renderSemanticOverviewPayloadHtml(response.payload, response.payload.term, {
      applyNumbering: options.applyNumbering,
      applyReferences: options.applyReferences,
      applyMetadata: options.applyMetadata,
      applyHighlight: options.applyHighlight ?? true,
      forExport: false,
    });
  }

  if (isHistorySearchResponseType(response.type)) {
    return renderHistorySearchResponseHtml(response, { ...options });
  }

  const markdown = normalizeResponseMarkdown(response.content);
  const html = markdownToEditorHtml(markdown);
  if (response.type === "app_verbete_search") {
    const highlightedHtml = options.applyHighlight ? highlightBookSearchHtml(html, response.query) : html;
    const formattedHtml = styleVerbeteSearchHtml(highlightedHtml);
    return options.applyNumbering ? styleVerbeteSearchResultItemsHtml(formattedHtml) : removeNumberingFromHistoryHtml(formattedHtml);
  }

  if (response.type === "app_random_pensata") {
    return styleRandomPensataHtml(html);
  }

  return options.applyNumbering ? styleNumberedListItemsHtml(html) : removeNumberingFromHistoryHtml(html);
};

export const renderHistoryResponseAppendBodyHtml = (
  response: AIResponse,
  options?: Pick<HistoryResponseRenderOptions, "applyNumbering" | "applyReferences" | "applyMetadata" | "applyHighlight">,
): string => {
  if (isLexicalOverviewResponse(response)) {
    return renderLexicalOverviewPayloadHtml(response.payload, response.payload.term, {
      applyNumbering: options?.applyNumbering ?? false,
      applyReferences: options?.applyReferences ?? true,
      applyMetadata: options?.applyMetadata ?? true,
      applyHighlight: options?.applyHighlight ?? true,
      forExport: true,
    });
  }

  if (isSemanticOverviewResponse(response)) {
    return renderSemanticOverviewPayloadHtml(response.payload, response.payload.term, {
      applyNumbering: options?.applyNumbering ?? false,
      applyReferences: options?.applyReferences ?? true,
      applyMetadata: options?.applyMetadata ?? true,
      applyHighlight: options?.applyHighlight ?? true,
      forExport: true,
    });
  }

  if (isHistorySearchResponseType(response.type)) {
    return renderHistorySearchResponseExportHtml(response, {
      applyNumbering: options?.applyNumbering ?? false,
      applyReferences: options?.applyReferences ?? true,
      applyMetadata: options?.applyMetadata ?? true,
      applyHighlight: options?.applyHighlight ?? true,
      compactSpacing: true,
    });
  }

  const markdown = normalizeResponseMarkdown(response.content, true);
  const html = markdownToEditorHtml(markdown);
  if (response.type === "app_verbete_search") {
    const highlightedHtml = options?.applyHighlight ?? true ? highlightBookSearchHtml(html, response.query) : html;
    return removeVerbeteLinkLineHtml(highlightedHtml);
  }
  return html;
};

export const renderHistoryResponseCopyHtml = (
  response: AIResponse,
  options: Pick<HistoryResponseRenderOptions, "applyNumbering" | "applyReferences" | "applyMetadata" | "applyHighlight">,
): string => {
  if (isLexicalOverviewResponse(response)) {
    const html = renderLexicalOverviewPayloadHtml(response.payload, response.payload.term, {
      applyNumbering: options.applyNumbering,
      applyReferences: options.applyReferences,
      applyMetadata: options.applyMetadata,
      applyHighlight: options.applyHighlight ?? true,
      forExport: true,
    });
    return flattenNumberedBlocksForClipboard(html);
  }

  if (isSemanticOverviewResponse(response)) {
    const html = renderSemanticOverviewPayloadHtml(response.payload, response.payload.term, {
      applyNumbering: options.applyNumbering,
      applyReferences: options.applyReferences,
      applyMetadata: options.applyMetadata,
      applyHighlight: options.applyHighlight ?? true,
      forExport: true,
    });
    return flattenNumberedBlocksForClipboard(html);
  }

  if (isHistorySearchResponseType(response.type)) {
    return renderHistorySearchResponseExportHtml(response, options);
  }
  const html = renderHistoryResponseEditorHtml(response, options);
  const cleanedHtml = response.type === "app_verbete_search" ? removeVerbeteLinkLineHtml(html) : html;
  return flattenNumberedBlocksForClipboard(cleanedHtml);
};

export const historyHtmlToPlainText = (html: string): string => {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.textContent || "").replace(/\u00a0/g, " ").trim();
};

