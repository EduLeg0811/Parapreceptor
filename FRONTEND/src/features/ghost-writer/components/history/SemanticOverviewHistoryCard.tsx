import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  AIResponse,
  SemanticOverviewHistoryGroup,
  SemanticOverviewHistoryMatch,
  SemanticOverviewHistoryPayload,
} from "@/features/ghost-writer/types";
import { buildSemanticOverviewPillLabel, renderSemanticOverviewGroupHtml } from "@/features/ghost-writer/utils/history/historySemanticOverview";

interface SemanticOverviewHistoryCardProps {
  response: AIResponse;
  historyFontStyle: CSSProperties;
  enableHistoryNumbering: boolean;
  enableHistoryReferences: boolean;
  enableHistoryMetadata: boolean;
  enableHistoryHighlight: boolean;
}

const buildGroupKey = (group: SemanticOverviewHistoryGroup): string => `${group.indexId}:${group.indexLabel}`;

const isSemanticOverviewPayload = (payload: AIResponse["payload"]): payload is SemanticOverviewHistoryPayload =>
  payload?.kind === "semantic_overview";

const ALL_GROUP_KEY = "__all__";

const buildAllGroup = (payload: SemanticOverviewHistoryPayload): SemanticOverviewHistoryGroup => {
  const limit = Math.max(1, Number(payload.limit || 1));
  const combinedMatches = payload.groups
    .flatMap((group) => group.matches || [])
    .slice()
    .sort((a: SemanticOverviewHistoryMatch, b: SemanticOverviewHistoryMatch) => {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.index_label || "").localeCompare(b.index_label || "");
    });

  return {
    indexId: ALL_GROUP_KEY,
    indexLabel: "ALL",
    totalFound: Number(payload.totalFound || combinedMatches.length),
    shownCount: Math.min(limit, combinedMatches.length),
    matches: combinedMatches.slice(0, limit),
  };
};

const SemanticOverviewHistoryCard = ({
  response,
  historyFontStyle,
  enableHistoryNumbering,
  enableHistoryReferences,
  enableHistoryMetadata,
  enableHistoryHighlight,
}: SemanticOverviewHistoryCardProps) => {
  const payload = isSemanticOverviewPayload(response.payload) ? response.payload : null;
  const groups = payload?.groups || [];
  const allGroup = useMemo(() => (payload ? buildAllGroup(payload) : null), [payload]);
  const groupsWithAll = useMemo(() => (allGroup ? [...groups, allGroup] : groups), [allGroup, groups]);
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

  const openGroup = groupsWithAll.find((group) => buildGroupKey(group) === openGroupKey) || null;
  const isAllOpen = openGroup?.indexId === ALL_GROUP_KEY;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {groupsWithAll.map((group) => {
          const groupKey = buildGroupKey(group);
          const isOpen = openGroupKey === groupKey;
          const isAllGroup = group.indexId === ALL_GROUP_KEY;

          return (
            <button
              key={groupKey}
              type="button"
              onClick={() => setOpenGroupKey((prev) => (prev === groupKey ? null : groupKey))}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-left transition ${
                isAllGroup
                  ? isOpen
                    ? "border-orange-300 bg-orange-100 text-orange-900 shadow-sm"
                    : "border-orange-300 bg-white/80 text-foreground hover:border-orange-200 hover:bg-orange-50/60"
                  : isOpen
                    ? "border-blue-300 bg-blue-50 text-blue-900 shadow-sm"
                    : "border-border bg-white/80 text-foreground hover:border-blue-200 hover:bg-blue-50/60"
              }`}
              style={historyFontStyle}
            >
              <span className="font-semibold">{buildSemanticOverviewPillLabel(group)}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                isAllGroup
                  ? isOpen
                    ? "bg-orange-200 text-orange-900"
                    : "bg-slate-100 text-slate-700"
                  : isOpen
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-100 text-slate-700"
              }`}>
                {group.totalFound}
              </span>
            </button>
          );
        })}
      </div>

      {openGroup ? (
        <div className="rounded-xl border border-blue-100 bg-white/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-blue-900" style={historyFontStyle}>
                {isAllOpen ? "ALL" : openGroup.indexLabel}
              </p>
              <p className="text-[11px] text-muted-foreground" style={historyFontStyle}>
                {isAllOpen
                  ? `Exibindo os ${openGroup.shownCount} melhores resultados de ${openGroup.totalFound} achados`
                  : `Exibindo ${openGroup.shownCount} de ${openGroup.totalFound} trechos`}
              </p>
            </div>
          </div>
          <div
            className="prose prose-sm max-w-none text-xs text-foreground"
            style={historyFontStyle}
            dangerouslySetInnerHTML={{
              __html: renderSemanticOverviewGroupHtml(openGroup, payload.term, {
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

export default SemanticOverviewHistoryCard;

