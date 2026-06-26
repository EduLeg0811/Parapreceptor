let mammothModulePromise: Promise<typeof import("mammoth")> | null = null;

async function getMammoth() {
  if (!mammothModulePromise) {
    mammothModulePromise = import("mammoth");
  }
  return mammothModulePromise;
}

export async function warmupDocxParser(): Promise<void> {
  await getMammoth();
}

export async function parseDocxArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  const mammoth = await getMammoth();
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1:fresh",
        "b => strong",
        "i => em",
        "u => u",
        "strike => s",
      ],
    },
  );

  if (result.messages.length > 0) {
    console.log("[file-parser] mammoth messages:", result.messages);
  }

  return result.value;
}

function normalizeHeaderText(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isStandaloneEncyclopediaHeaderLine(value: string): boolean {
  const normalized = normalizeHeaderText(value).replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  // Bloco deve ser apenas o cabeçalho (sem texto adicional de conteúdo).
  if (!/enciclop/.test(normalized)) return false;
  if (!/conscienciolog/.test(normalized)) return false;
  return normalized.split(" ").length <= 5;
}

function isStandalonePageNumberLine(value: string): boolean {
  const compact = (value || "")
    .replace(/\u00a0/g, " ")
    // eslint-disable-next-line no-useless-escape
    .replace(/[\s\-\–\—\.,;:()\[\]{}\/\\|]+/g, "")
    .trim();
  return /^[0-9]{1,4}$/.test(compact);
}

function isHeaderOnlyTableText(value: string): boolean {
  const normalized = normalizeHeaderText(value).replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  return (
    /^enciclopedia da conscienciologia(?: [0-9]{1,4})?$/.test(normalized) ||
    /^[0-9]{1,4} enciclopedia da conscienciologia$/.test(normalized)
  );
}

function getFirstMeaningfulTextNode(doc: Document, el: Element): Text | null {
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if ((node.nodeValue || "").trim()) return node;
  }
  return null;
}

function getLastMeaningfulTextNode(doc: Document, el: Element): Text | null {
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if ((node.nodeValue || "").trim()) last = node;
  }
  return last;
}

function reuniteHyphenatedWordsAcrossBlocks(doc: Document, root: Element): void {
  const blocks = Array.from(root.querySelectorAll("p,div,li,h1,h2,h3,h4,h5,h6"));
  if (blocks.length < 2) return;

  const LETTER = "A-Za-zÀ-ÖØ-öø-ÿ";
  const LOWER_LETTER = "a-zà-öø-ÿ";
  const prevRegex = new RegExp(`([${LETTER}]{2,})-\\s*$`);
  const nextRegex = new RegExp(`^\\s*([${LOWER_LETTER}]{2,})(.*)$`);

  for (let i = 0; i < blocks.length - 1; i += 1) {
    const prevNode = getLastMeaningfulTextNode(doc, blocks[i]);
    const nextNode = getFirstMeaningfulTextNode(doc, blocks[i + 1]);
    if (!prevNode || !nextNode) continue;

    const prevText = prevNode.nodeValue || "";
    const nextText = nextNode.nodeValue || "";
    const prevMatch = prevText.match(prevRegex);
    const nextMatch = nextText.match(nextRegex);
    if (!prevMatch || !nextMatch) continue;

    const nextPrefix = nextMatch[1];
    prevNode.nodeValue = prevText.replace(/-\s*$/, "") + nextPrefix;
    nextNode.nodeValue = nextText.replace(new RegExp(`^\\s*${nextPrefix}`), "");
  }
}

export function cleanupConvertedPdfHeaderHtml(html: string): string {
  const raw = (html || "").trim();
  if (!raw) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${raw}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLDivElement | null;
  if (!root) return html;

  const blocks = Array.from(root.querySelectorAll("p,div,li,h1,h2,h3,h4,h5,h6"));
  const remove = new Set<Element>();
  const blockTexts = blocks.map((block) => (block.textContent || "").replace(/\u00a0/g, " ").trim());

  for (let i = 0; i < blocks.length; i += 1) {
    const text = blockTexts[i];
    if (isStandaloneEncyclopediaHeaderLine(text) || isStandalonePageNumberLine(text)) {
      remove.add(blocks[i]);
    }
  }

  // Alguns PDFs convertem o header em tabela de 2 colunas: [numero] [Enciclopedia da Conscienciologia].
  const tables = Array.from(root.querySelectorAll("table"));
  for (const table of tables) {
    const tableText = (table.textContent || "").replace(/\u00a0/g, " ").trim();
    if (isHeaderOnlyTableText(tableText)) {
      remove.add(table);
    }
  }

  if (remove.size === 0) return html;
  for (const node of remove) node.remove();
  reuniteHyphenatedWordsAcrossBlocks(doc, root);
  return root.innerHTML;
}
