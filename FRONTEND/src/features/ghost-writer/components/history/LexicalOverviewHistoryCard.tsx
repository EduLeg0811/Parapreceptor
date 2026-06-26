import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { AIResponse, LexicalOverviewHistoryGroup, LexicalOverviewHistoryPayload } from "@/features/ghost-writer/types";
import { buildLexicalOverviewPillLabel, renderLexicalOverviewGroupHtml } from "@/features/ghost-writer/utils/history/historyLexicalOverview";

interface LexicalOverviewHistoryCardProps {
  response: AIResponse;
  historyFontStyle: CSSProperties;
  enableHistoryNumbering: boolean;
  enableHistoryReferences: boolean;
  enableHistoryMetadata: boolean;
  enableHistoryHighlight: boolean;
}

const buildGroupKey = (group: LexicalOverviewHistoryGroup): string => `${group.bookCode}:${group.fileStem}`;

const isLexicalOverviewPayload = (payload: AIResponse["payload"]): payload is LexicalOverviewHistoryPayload =>
  payload?.kind === "lexical_overview";

const LexicalOverviewHistoryCard = ({
  response,
  historyFontStyle,
  enableHistoryNumbering,
  enableHistoryReferences,
  enableHistoryMetadata,
  enableHistoryHighlight,
}: LexicalOverviewHistoryCardProps) => {
  const payload = isLexicalOverviewPayload(response.payload) ? response.payload : null;
  const groups = payload?.groups || [];
  const defaultOpenKey = useMemo(() => (groups[0] ? buildGroupKey(groups[0]) : null), [groups]);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(defaultOpenKey);

  useEffect(() => {
    setOpenGroupKey(defaultOpenKey);
  }, [defaultOpenKey, response.id]);

  if (!payload || groups.length <= 0) {
    return (
      <p className="text-xs text-muted-foreground" style={historyFontStyle}>
        Nenhum resultado de overview disponivel.
      </p>
    );
  }

  const openGroup = groups.find((group) => buildGroupKey(group) === openGroupKey) || null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => {
          const groupKey = buildGroupKey(group);
          const isOpen = openGroupKey === groupKey;
          const fileStem = (group.fileStem || "").trim();
          const showFileStem = Boolean(fileStem) && fileStem.toUpperCase() !== (group.bookCode || "").trim().toUpperCase();

          return (
            <button
              key={groupKey}
              type="button"
              onClick={() => setOpenGroupKey((prev) => (prev === groupKey ? null : groupKey))}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-left transition ${
                isOpen
                  ? "border-blue-300 bg-blue-50 text-blue-900 shadow-sm"
                  : "border-border bg-white/80 text-foreground hover:border-blue-200 hover:bg-blue-50/60"
              }`}
              style={historyFontStyle}
            >
              <span className="font-semibold">{buildLexicalOverviewPillLabel(group)}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${isOpen ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}`}>
                {group.totalFound}
              </span>
              {showFileStem ? (
                <span className="text-[11px] text-muted-foreground">{fileStem}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {openGroup ? (
        <div className="rounded-xl border border-blue-100 bg-white/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-blue-900" style={historyFontStyle}>
                {openGroup.bookLabel}
              </p>
              <p className="text-[11px] text-muted-foreground" style={historyFontStyle}>
                Exibindo {openGroup.shownCount} de {openGroup.totalFound} trechos
              </p>
            </div>
          </div>
          <div
            className="prose prose-sm max-w-none text-xs text-foreground"
            style={historyFontStyle}
            dangerouslySetInnerHTML={{
              __html: renderLexicalOverviewGroupHtml(openGroup, payload.term, {
                applyNumbering: enableHistoryNumbering,
                applyReferences: enableHistoryReferences,
                applyMetadata: enableHistoryMetadata,
                applyHighlight: enableHistoryHighlight,
              }),
            }}
          />
        </div>
      ) : null}

    </div>
  );
};

export default LexicalOverviewHistoryCard;

