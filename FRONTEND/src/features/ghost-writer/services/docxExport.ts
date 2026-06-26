type InlineStyle = {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  highlight?: "yellow";
};

type DocxModule = typeof import("docx");
type DocxTextRun = InstanceType<DocxModule["TextRun"]>;
type DocxParagraph = InstanceType<DocxModule["Paragraph"]>;
type DocxTable = InstanceType<DocxModule["Table"]>;
type DocxHeading = DocxModule["HeadingLevel"][keyof DocxModule["HeadingLevel"]];
type DocxFileChild = DocxParagraph | DocxTable;

const BLOCK_TAGS = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li"]);

function mergeStyle(base: InlineStyle, extra: InlineStyle): InlineStyle {
  return {
    bold: base.bold || extra.bold,
    italics: base.italics || extra.italics,
    underline: base.underline || extra.underline,
    highlight: base.highlight || extra.highlight,
  };
}

function styleFromElement(el: Element): InlineStyle {
  const tag = el.tagName.toLowerCase();
  const style: InlineStyle = {};
  if (tag === "strong" || tag === "b") style.bold = true;
  if (tag === "em" || tag === "i") style.italics = true;
  if (tag === "u") style.underline = true;
  if (tag === "mark") style.highlight = "yellow";

  const inlineCss = (el.getAttribute("style") || "").toLowerCase();
  if (inlineCss.includes("font-weight:") && !inlineCss.includes("font-weight: normal")) style.bold = true;
  if (inlineCss.includes("font-style: italic")) style.italics = true;
  if (inlineCss.includes("text-decoration: underline")) style.underline = true;
  if (inlineCss.includes("background-color")) style.highlight = "yellow";
  return style;
}

function normalizeText(value: string): string {
  return (value || "").replace(/\u00a0/g, " ");
}

async function inlineRunsFromNode(node: Node, parentStyle: InlineStyle, docx: DocxModule): Promise<DocxTextRun[]> {
  const { TextRun } = docx;
  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeText(node.textContent || "");
    if (!text) return [];
    return [new TextRun({ text, ...parentStyle })];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (tag === "br") return [new TextRun({ text: "", break: 1 })];
  if (BLOCK_TAGS.has(tag) || tag === "ul" || tag === "ol") return [];

  const nextStyle = mergeStyle(parentStyle, styleFromElement(el));
  const runs: DocxTextRun[] = [];
  for (const child of Array.from(el.childNodes)) {
    runs.push(...(await inlineRunsFromNode(child, nextStyle, docx)));
  }
  return runs;
}

async function paragraphFromElement(
  el: Element,
  docx: DocxModule,
  opts?: { bullet?: boolean; numberPrefix?: string; heading?: DocxHeading },
): Promise<DocxParagraph> {
  const { Paragraph, TextRun } = docx;
  const runs: DocxTextRun[] = [];
  if (opts?.numberPrefix) runs.push(new TextRun({ text: opts.numberPrefix }));
  for (const child of Array.from(el.childNodes)) {
    runs.push(...(await inlineRunsFromNode(child, {}, docx)));
  }
  if (runs.length === 0) runs.push(new TextRun(""));

  return new Paragraph({
    children: runs,
    bullet: opts?.bullet ? { level: 0 } : undefined,
    heading: opts?.heading,
    spacing: { after: 120 },
  });
}

async function paragraphsFromTableCell(el: Element, docx: DocxModule): Promise<DocxParagraph[]> {
  const { Paragraph } = docx;
  const blockChildren = Array.from(el.children).filter((child) => BLOCK_TAGS.has(child.tagName.toLowerCase()) || child.tagName.toLowerCase() === "ul" || child.tagName.toLowerCase() === "ol");
  if (blockChildren.length === 0) {
    return [await paragraphFromElement(el, docx)];
  }

  const paragraphs: DocxParagraph[] = [];
  for (const child of blockChildren) {
    const tag = child.tagName.toLowerCase();
    if (tag === "ul") {
      const items = Array.from(child.querySelectorAll(":scope > li"));
      for (const li of items) paragraphs.push(await paragraphFromElement(li, docx, { bullet: true }));
      continue;
    }

    if (tag === "ol") {
      const items = Array.from(child.querySelectorAll(":scope > li"));
      for (let i = 0; i < items.length; i += 1) {
        paragraphs.push(await paragraphFromElement(items[i], docx, { numberPrefix: `${i + 1}. ` }));
      }
      continue;
    }

    paragraphs.push(await paragraphFromElement(child, docx));
  }

  return paragraphs.length > 0 ? paragraphs : [new Paragraph("")];
}

async function tableFromElement(el: Element, docx: DocxModule): Promise<DocxTable> {
  const { Table, TableRow, TableCell, WidthType, BorderStyle } = docx;
  const rows = Array.from(el.querySelectorAll(":scope > thead > tr, :scope > tbody > tr, :scope > tr"));
  const tableRows = await Promise.all(rows.map(async (row) => {
    const cells = Array.from(row.querySelectorAll(":scope > th, :scope > td"));
    const tableCells = await Promise.all(cells.map(async (cell) => new TableCell({
      children: await paragraphsFromTableCell(cell, docx),
      columnSpan: Number(cell.getAttribute("colspan") || 1) || 1,
      rowSpan: Number(cell.getAttribute("rowspan") || 1) || 1,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D1" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D1" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D1" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D1" },
      },
      shading: cell.tagName.toLowerCase() === "th" ? { fill: "E5E7EB" } : undefined,
    })));

    return new TableRow({ children: tableCells });
  }));

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D1" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D1" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D1" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "BFC7D1" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" },
    },
  });
}

async function htmlToDocxBlocks(html: string, docx: DocxModule): Promise<DocxFileChild[]> {
  const { Paragraph, HeadingLevel } = docx;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${(html || "").trim() || "<p></p>"}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLDivElement | null;
  if (!root) return [new Paragraph("")];

  const blocks: DocxFileChild[] = [];
  for (const child of Array.from(root.children)) {
    const tag = child.tagName.toLowerCase();

    if (tag === "ul") {
      const items = Array.from(child.querySelectorAll(":scope > li"));
      for (const li of items) {
        blocks.push(await paragraphFromElement(li, docx, { bullet: true }));
      }
      continue;
    }

    if (tag === "ol") {
      const items = Array.from(child.querySelectorAll(":scope > li"));
      for (let i = 0; i < items.length; i += 1) {
        blocks.push(await paragraphFromElement(items[i], docx, { numberPrefix: `${i + 1}. ` }));
      }
      continue;
    }

    const headingMap: Record<string, DocxHeading> = {
      h1: HeadingLevel.HEADING_1,
      h2: HeadingLevel.HEADING_2,
      h3: HeadingLevel.HEADING_3,
      h4: HeadingLevel.HEADING_4,
      h5: HeadingLevel.HEADING_5,
      h6: HeadingLevel.HEADING_6,
    };

    if (headingMap[tag]) {
      blocks.push(await paragraphFromElement(child, docx, { heading: headingMap[tag] }));
      continue;
    }

    if (tag === "table" || (tag === "div" && child.querySelector(":scope > table"))) {
      const tableElement = tag === "table" ? child : child.querySelector(":scope > table");
      if (tableElement) {
        blocks.push(await tableFromElement(tableElement, docx));
      }
      continue;
    }

    if (tag === "p" || tag === "div") {
      blocks.push(await paragraphFromElement(child, docx));
      continue;
    }
  }

  return blocks.length ? blocks : [new Paragraph("")];
}

export async function buildDocxBlobFromHtml(html: string): Promise<Blob> {
  const docx = await import("docx");
  const { Document, Packer } = docx;
  const children = await htmlToDocxBlocks(html, docx);
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
