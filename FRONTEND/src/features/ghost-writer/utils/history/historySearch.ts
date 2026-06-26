import type { HistorySearchCardMetadata } from "@/features/ghost-writer/utils/history/historySearchCards";
import { SEMANTIC_NUMBER_METADATA_KEYS, SEMANTIC_TITLE_METADATA_KEYS } from "@/features/ghost-writer/config/constants";

const normalizeHistorySearchMetadataValue = (value: unknown): string =>
  value == null ? "" : String(value).replace(/\u00a0/g, " ").trim();

const getFirstHistorySearchMetadataValue = (metadata: Record<string, unknown>, keys: readonly string[]): string => {
  for (const key of keys) {
    const value = normalizeHistorySearchMetadataValue(metadata[key]);
    if (value) return value;
  }
  return "";
};

const assignHistorySearchMetadata = (
  target: HistorySearchCardMetadata,
  key: string,
  value: unknown,
  options?: { preserveCollision?: boolean },
) => {
  const normalizedValue = normalizeHistorySearchMetadataValue(value);
  if (!normalizedValue) return;

  if (!(key in target)) {
    target[key] = normalizedValue;
    return;
  }

  if (target[key] === normalizedValue) return;
  if (!options?.preserveCollision) return;

  let collisionKey = `raw_${key}`;
  let suffix = 2;
  while (collisionKey in target) {
    if (target[collisionKey] === normalizedValue) return;
    collisionKey = `raw_${key}_${suffix}`;
    suffix += 1;
  }
  target[collisionKey] = normalizedValue;
};

const assignBaseHistorySearchMetadata = (
  target: HistorySearchCardMetadata,
  values: {
    sourcebook?: unknown;
    title?: unknown;
    number?: unknown;
    pagina?: unknown;
    [key: string]: unknown;
  },
) => {
  assignHistorySearchMetadata(target, "sourcebook", values.sourcebook);
  assignHistorySearchMetadata(target, "title", values.title);
  assignHistorySearchMetadata(target, "number", values.number);
  assignHistorySearchMetadata(target, "pagina", values.pagina);
};

const mergeHistorySearchMetadataEntries = (
  target: HistorySearchCardMetadata,
  entries: Record<string, unknown>,
) => {
  for (const [key, value] of Object.entries(entries)) {
    assignHistorySearchMetadata(target, key, value, { preserveCollision: true });
  }
};

export const buildLexicalHistorySearchMetadata = (
  item: {
    book: string;
    row: number;
    number: number | null;
    title: string;
    bookName?: string;
    book_label?: string;
    data: Record<string, string>;
    pagina: string;
  },
  fallbackBook: string,
): HistorySearchCardMetadata => {
  const metadata: HistorySearchCardMetadata = {};
  const sourceBookCode = normalizeHistorySearchMetadataValue(item.book) || normalizeHistorySearchMetadataValue(fallbackBook);
  const sourcebook =
    normalizeHistorySearchMetadataValue(item.bookName)
    || normalizeHistorySearchMetadataValue(item.book_label)
    || normalizeHistorySearchMetadataValue(item.data?.book_name)
    || sourceBookCode;
  const title = normalizeHistorySearchMetadataValue(item.title) || "s/titulo";
  const number = item.number == null ? "" : normalizeHistorySearchMetadataValue(item.number);
  const pagina = normalizeHistorySearchMetadataValue(item.pagina);

  assignBaseHistorySearchMetadata(metadata, { sourcebook, title, number, pagina });
  assignHistorySearchMetadata(metadata, "book", sourceBookCode);
  assignHistorySearchMetadata(metadata, "row", item.row);
  mergeHistorySearchMetadataEntries(metadata, item.data || {});

  return metadata;
};

export const buildSemanticHistorySearchMetadata = (
  item: {
    book: string;
    index_id: string;
    index_label: string;
    row: number;
    metadata: Record<string, unknown>;
    score: number;
  },
  fallbackIndexLabel: string,
): HistorySearchCardMetadata => {
  const rawMetadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
  const metadata: HistorySearchCardMetadata = {};
  const sourcebook =
    normalizeHistorySearchMetadataValue(item.index_label) ||
    normalizeHistorySearchMetadataValue(fallbackIndexLabel) ||
    normalizeHistorySearchMetadataValue(item.book);
  const title = getFirstHistorySearchMetadataValue(rawMetadata, SEMANTIC_TITLE_METADATA_KEYS) || "s/titulo";
  const number = getFirstHistorySearchMetadataValue(rawMetadata, SEMANTIC_NUMBER_METADATA_KEYS);

  assignBaseHistorySearchMetadata(metadata, { sourcebook, title, number });
  assignHistorySearchMetadata(metadata, "book", item.book);
  assignHistorySearchMetadata(metadata, "index_id", item.index_id);
  assignHistorySearchMetadata(metadata, "index_label", item.index_label || fallbackIndexLabel);
  assignHistorySearchMetadata(metadata, "row", item.row);
  assignHistorySearchMetadata(metadata, "score", Number.isFinite(item.score) ? item.score.toFixed(2) : item.score);
  mergeHistorySearchMetadataEntries(metadata, rawMetadata);

  return metadata;
};

