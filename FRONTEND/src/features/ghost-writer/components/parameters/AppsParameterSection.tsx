import { useEffect, useState } from "react";
import BiblioExternaPanel from "@/features/ghost-writer/components/bibliography/BiblioExternaPanel";
import BiblioGeralPanel from "@/features/ghost-writer/components/bibliography/BiblioGeralPanel";
import BookSearchPanel from "@/features/ghost-writer/components/search/BookSearchPanel";
import LexicalOverviewPanel from "@/features/ghost-writer/components/search/LexicalOverviewPanel";
import LexicalCitationLookupPanel from "@/features/ghost-writer/components/search/LexicalCitationLookupPanel";
import InsertRefBookPanel from "@/features/ghost-writer/components/bibliography/InsertRefBookPanel";
import InsertRefVerbetePanel from "@/features/ghost-writer/components/bibliography/InsertRefVerbetePanel";
import SemanticOverviewPanel from "@/features/ghost-writer/components/search/SemanticOverviewPanel";
import SemanticSearchPanel from "@/features/ghost-writer/components/search/SemanticSearchPanel";
import VerbeteSearchPanel from "@/features/ghost-writer/components/search/VerbeteSearchPanel";
import VerbetografiaPanel from "@/features/ghost-writer/components/parameters/VerbetografiaPanel";
import { parameterSemanticMeta } from "@/features/ghost-writer/config/metadata";
import { resolveActionItem, resolveSemanticActionId } from "@/features/ghost-writer/config/appRegistry";
import { ALL_OVERVIEW_SOURCE_IDS } from "@/features/ghost-writer/config/overviewSources";
import type { ActionItemId, AppPanelScope, LexicalBookOption, RefBookMode, SelectOption, SemanticActionId, SemanticIndexOption, SemanticSearchRagContext } from "@/features/ghost-writer/types";

interface AppsParameterSectionProps {
  appId: ActionItemId | null;
  appPanelScope: AppPanelScope | null;
  selectedRefBook: string;
  refBookMode: RefBookMode;
  refBookPages: string;
  isRunningInsertRefBook: boolean;
  verbeteInput: string;
  isRunningInsertRefVerbete: boolean;
  biblioGeralAuthor: string;
  biblioGeralTitle: string;
  biblioGeralYear: string;
  biblioGeralExtra: string;
  isRunningBiblioGeral: boolean;
  biblioExternaAuthor: string;
  biblioExternaTitle: string;
  biblioExternaYear: string;
  biblioExternaJournal: string;
  biblioExternaPublisher: string;
  biblioExternaIdentifier: string;
  biblioExternaExtra: string;
  biblioExternaFreeText: string;
  isRunningBiblioExterna: boolean;
  lexicalBooks: LexicalBookOption[];
  selectedLexicalBook: string;
  lexicalTerm: string;
  lexicalCitationText: string;
  lexicalMaxResults: number;
  selectedLexicalOverviewSourceIds?: string[];
  isRunningLexicalSearch: boolean;
  isRunningLexicalCitationLookup: boolean;
  isRunningLexicalOverview: boolean;
  selectedSemanticSearchIndexId: string;
  semanticSearchIndexes: SemanticIndexOption[];
  isLoadingSemanticSearchIndexes: boolean;
  semanticSearchQuery: string;
  semanticSearchMaxResults: number;
  semanticMinScore: number | null;
  semanticMinScoreMode: "auto" | "manual";
  semanticUseRagContext: boolean;
  semanticExcludeLexicalDuplicates: boolean;
  semanticOverviewLastRagContext: SemanticSearchRagContext | null;
  isRunningSemanticSearch: boolean;
  semanticOverviewTerm: string;
  semanticOverviewMaxResults: number;
  selectedSemanticOverviewSourceIds?: string[];
  isRunningSemanticOverview: boolean;
  verbeteSearchAuthor: string;
  verbeteSearchTitle: string;
  verbeteSearchArea: string;
  verbeteSearchText: string;
  verbeteSearchMaxResults: number;
  isRunningVerbeteSearch: boolean;
  verbetografiaTitle: string;
  verbetografiaSpecialty: string;
  hasDocumentOpen: boolean;
  isRunningVerbetografiaOpenTable: boolean;
  isRunningVerbetografiaOpenTableWord: boolean;
  isRunningVerbeteDefinologia: boolean;
  isRunningVerbeteFraseEnfatica: boolean;
  isRunningVerbeteSinonimologia: boolean;
  isRunningVerbeteFatologia: boolean;
  aiActionsSelectedVectorStoreId: string;
  aiActionVectorStoreOptions: SelectOption[];
  onSelectRefBook: (value: string) => void;
  onRefBookModeChange: (value: RefBookMode) => void;
  onRefBookPagesChange: (value: string) => void;
  onRunInsertRefBook: () => void | Promise<void>;
  onVerbeteInputChange: (value: string) => void;
  onRunInsertRefVerbete: () => void | Promise<void>;
  onBiblioGeralAuthorChange: (value: string) => void;
  onBiblioGeralTitleChange: (value: string) => void;
  onBiblioGeralYearChange: (value: string) => void;
  onBiblioGeralExtraChange: (value: string) => void;
  onRunBiblioGeral: () => void | Promise<void>;
  onBiblioExternaAuthorChange: (value: string) => void;
  onBiblioExternaTitleChange: (value: string) => void;
  onBiblioExternaYearChange: (value: string) => void;
  onBiblioExternaJournalChange: (value: string) => void;
  onBiblioExternaPublisherChange: (value: string) => void;
  onBiblioExternaIdentifierChange: (value: string) => void;
  onBiblioExternaExtraChange: (value: string) => void;
  onBiblioExternaFreeTextChange: (value: string) => void;
  onRunBiblioExterna: () => void | Promise<void>;
  onToggleBiblioExternaConfig: () => void;
  onSelectedLexicalBookChange: (value: string) => void;
  onLexicalTermChange: (value: string) => void;
  onLexicalCitationTextChange: (value: string) => void;
  onImportLexicalCitationText: () => void | Promise<void>;
  onLexicalMaxResultsChange: (value: number) => void;
  onRunLexicalSearch: () => void | Promise<void>;
  onRunLexicalCitationLookup: () => void | Promise<void>;
  onRunLexicalOverview: () => void | Promise<void>;
  onToggleLexicalOverviewSource?: (id: string, checked: boolean) => void;
  onSelectedSemanticSearchIndexIdChange: (value: string) => void;
  onSemanticSearchQueryChange: (value: string) => void;
  onSemanticSearchMaxResultsChange: (value: number) => void;
  onSemanticMinScoreChange: (value: number | null) => void;
  onSemanticMinScoreDefaultChange: (value: number | null) => void;
  onSemanticUseRagContextChange: (value: boolean) => void;
  onSemanticExcludeLexicalDuplicatesChange: (value: boolean) => void;
  onRunSemanticSearch: () => void | Promise<void>;
  onSemanticOverviewTermChange: (value: string) => void;
  onSemanticOverviewMaxResultsChange: (value: number) => void;
  onRunSemanticOverview: () => void | Promise<void>;
  onToggleSemanticOverviewSource?: (id: string, checked: boolean) => void;
  onVerbeteSearchAuthorChange: (value: string) => void;
  onVerbeteSearchTitleChange: (value: string) => void;
  onVerbeteSearchAreaChange: (value: string) => void;
  onVerbeteSearchTextChange: (value: string) => void;
  onVerbeteSearchMaxResultsChange: (value: number) => void;
  onRunVerbeteSearch: () => void | Promise<void>;
  onRunVerbetografiaOpenTable: () => void | Promise<void>;
  onRunVerbetografiaOpenTableWord: () => void | Promise<void>;
  onRunVerbeteDefinologia: () => void | Promise<void>;
  onRunVerbeteFraseEnfatica: () => void | Promise<void>;
  onRunVerbeteSinonimologia: () => void | Promise<void>;
  onRunVerbeteFatologia: () => void | Promise<void>;
  onVerbetografiaTitleChange: (value: string) => void;
  onVerbetografiaSpecialtyChange: (value: string) => void;
}

const SEMANTIC_AUTO_MIN_SCORE_FLOOR = 0.25;

const getRelaxedSemanticMinScore = (recommendedScore: number): number =>
  Number(Math.max(SEMANTIC_AUTO_MIN_SCORE_FLOOR, recommendedScore / 2).toFixed(2));

const AppsParameterSection = ({
  appId,
  appPanelScope,
  selectedRefBook,
  refBookMode,
  refBookPages,
  isRunningInsertRefBook,
  verbeteInput,
  isRunningInsertRefVerbete,
  biblioGeralAuthor,
  biblioGeralTitle,
  biblioGeralYear,
  biblioGeralExtra,
  isRunningBiblioGeral,
  biblioExternaAuthor,
  biblioExternaTitle,
  biblioExternaYear,
  biblioExternaJournal,
  biblioExternaPublisher,
  biblioExternaIdentifier,
  biblioExternaExtra,
  biblioExternaFreeText,
  isRunningBiblioExterna,
  lexicalBooks,
  selectedLexicalBook,
  lexicalTerm,
  lexicalCitationText,
  lexicalMaxResults,
  selectedLexicalOverviewSourceIds = ALL_OVERVIEW_SOURCE_IDS,
  isRunningLexicalSearch,
  isRunningLexicalCitationLookup,
  isRunningLexicalOverview,
  selectedSemanticSearchIndexId,
  semanticSearchIndexes,
  isLoadingSemanticSearchIndexes,
  semanticSearchQuery,
  semanticSearchMaxResults,
  semanticMinScore,
  semanticMinScoreMode,
  semanticUseRagContext,
  semanticExcludeLexicalDuplicates,
  semanticOverviewLastRagContext,
  isRunningSemanticSearch,
  semanticOverviewTerm,
  semanticOverviewMaxResults,
  selectedSemanticOverviewSourceIds = ALL_OVERVIEW_SOURCE_IDS,
  isRunningSemanticOverview,
  verbeteSearchAuthor,
  verbeteSearchTitle,
  verbeteSearchArea,
  verbeteSearchText,
  verbeteSearchMaxResults,
  isRunningVerbeteSearch,
  verbetografiaTitle,
  verbetografiaSpecialty,
  hasDocumentOpen,
  isRunningVerbetografiaOpenTable,
  isRunningVerbetografiaOpenTableWord,
  isRunningVerbeteDefinologia,
  isRunningVerbeteFraseEnfatica,
  isRunningVerbeteSinonimologia,
  isRunningVerbeteFatologia,
  aiActionsSelectedVectorStoreId,
  aiActionVectorStoreOptions,
  onSelectRefBook,
  onRefBookModeChange,
  onRefBookPagesChange,
  onRunInsertRefBook,
  onVerbeteInputChange,
  onRunInsertRefVerbete,
  onBiblioGeralAuthorChange,
  onBiblioGeralTitleChange,
  onBiblioGeralYearChange,
  onBiblioGeralExtraChange,
  onRunBiblioGeral,
  onBiblioExternaAuthorChange,
  onBiblioExternaTitleChange,
  onBiblioExternaYearChange,
  onBiblioExternaJournalChange,
  onBiblioExternaPublisherChange,
  onBiblioExternaIdentifierChange,
  onBiblioExternaExtraChange,
  onBiblioExternaFreeTextChange,
  onRunBiblioExterna,
  onToggleBiblioExternaConfig,
  onSelectedLexicalBookChange,
  onLexicalTermChange,
  onLexicalCitationTextChange,
  onImportLexicalCitationText,
  onLexicalMaxResultsChange,
  onRunLexicalSearch,
  onRunLexicalCitationLookup,
  onRunLexicalOverview,
  onToggleLexicalOverviewSource = () => undefined,
  onSelectedSemanticSearchIndexIdChange,
  onSemanticSearchQueryChange,
  onSemanticSearchMaxResultsChange,
  onSemanticMinScoreChange,
  onSemanticMinScoreDefaultChange,
  onSemanticUseRagContextChange,
  onSemanticExcludeLexicalDuplicatesChange,
  onRunSemanticSearch,
  onSemanticOverviewTermChange,
  onSemanticOverviewMaxResultsChange,
  onRunSemanticOverview,
  onToggleSemanticOverviewSource = () => undefined,
  onVerbeteSearchAuthorChange,
  onVerbeteSearchTitleChange,
  onVerbeteSearchAreaChange,
  onVerbeteSearchTextChange,
  onVerbeteSearchMaxResultsChange,
  onRunVerbeteSearch,
  onRunVerbetografiaOpenTable,
  onRunVerbetografiaOpenTableWord,
  onRunVerbeteDefinologia,
  onRunVerbeteFraseEnfatica,
  onRunVerbeteSinonimologia,
  onRunVerbeteFatologia,
  onVerbetografiaTitleChange,
  onVerbetografiaSpecialtyChange,
}: AppsParameterSectionProps) => {
  const [semanticPanelMode, setSemanticPanelMode] = useState<"search" | "overview" | null>(null);
  const semanticAppId = resolveSemanticActionId(appId) as SemanticActionId | null;
  const resolvedItem = resolveActionItem(appId);
  const effectiveAppPanelScope = (resolvedItem?.section ?? appPanelScope) as AppPanelScope | null;

  useEffect(() => {
    if (semanticAppId === "busca_semantica") {
      setSemanticPanelMode("search");
      return;
    }
    if (semanticAppId === "semantic_overview") {
      setSemanticPanelMode("overview");
      return;
    }
    setSemanticPanelMode(null);
  }, [semanticAppId]);

  useEffect(() => {
    if ((semanticAppId !== "busca_semantica" && semanticAppId !== "semantic_overview") || semanticPanelMode === null || semanticMinScoreMode !== "auto") return;

    let nextDefault: number | null = null;
    if (semanticPanelMode === "overview") {
      const recommendedScores = semanticSearchIndexes
        .map((item) => item.suggestedMinScore)
        .filter((value) => typeof value === "number" && Number.isFinite(value));
      if (recommendedScores.length > 0) {
        nextDefault = getRelaxedSemanticMinScore(Math.min(...recommendedScores));
      }
    } else {
      const selectedSemanticIndex = semanticSearchIndexes.find((item) => item.id === selectedSemanticSearchIndexId);
      const recommendedScore = selectedSemanticIndex?.suggestedMinScore;
      if (typeof recommendedScore === "number" && Number.isFinite(recommendedScore)) {
        nextDefault = getRelaxedSemanticMinScore(recommendedScore);
      }
    }

    if (semanticMinScore !== nextDefault) {
      onSemanticMinScoreDefaultChange(nextDefault);
    }
  }, [semanticAppId, onSemanticMinScoreDefaultChange, selectedSemanticSearchIndexId, semanticMinScore, semanticMinScoreMode, semanticPanelMode, semanticSearchIndexes]);

  if (semanticAppId === "biblio_livros") {
    return (
      <InsertRefBookPanel
        title={parameterSemanticMeta.biblio_livros.title}
        description={parameterSemanticMeta.biblio_livros.description}
        bookOptions={lexicalBooks}
        selectedRefBook={selectedRefBook}
        refBookMode={refBookMode}
        refBookPages={refBookPages}
        onSelectRefBook={onSelectRefBook}
        onRefBookModeChange={onRefBookModeChange}
        onRefBookPagesChange={onRefBookPagesChange}
        onRunInsertRefBook={() => void onRunInsertRefBook()}
        isRunningInsertRefBook={isRunningInsertRefBook}
        showPanelChrome={false}
      />
    );
  }

  if (semanticAppId === "biblio_verbetes") {
    return (
      <InsertRefVerbetePanel
        title={parameterSemanticMeta.biblio_verbetes.title}
        description={parameterSemanticMeta.biblio_verbetes.description}
        verbeteInput={verbeteInput}
        onVerbeteInputChange={onVerbeteInputChange}
        onRun={() => void onRunInsertRefVerbete()}
        isRunning={isRunningInsertRefVerbete}
        showPanelChrome={false}
      />
    );
  }

  if (semanticAppId === "biblio_autores") {
    return (
      <BiblioGeralPanel
        title={parameterSemanticMeta.biblio_autores.title}
        description={parameterSemanticMeta.biblio_autores.description}
        author={biblioGeralAuthor}
        titleField={biblioGeralTitle}
        year={biblioGeralYear}
        extra={biblioGeralExtra}
        onAuthorChange={onBiblioGeralAuthorChange}
        onTitleFieldChange={onBiblioGeralTitleChange}
        onYearChange={onBiblioGeralYearChange}
        onExtraChange={onBiblioGeralExtraChange}
        onRun={() => void onRunBiblioGeral()}
        isRunning={isRunningBiblioGeral}
        showPanelChrome={false}
      />
    );
  }

  if (semanticAppId === "biblio_externa") {
    return (
      <BiblioExternaPanel
        title={parameterSemanticMeta.biblio_externa.title}
        description={parameterSemanticMeta.biblio_externa.description}
        author={biblioExternaAuthor}
        titleField={biblioExternaTitle}
        year={biblioExternaYear}
        journal={biblioExternaJournal}
        publisher={biblioExternaPublisher}
        identifier={biblioExternaIdentifier}
        extra={biblioExternaExtra}
        freeText={biblioExternaFreeText}
        onAuthorChange={onBiblioExternaAuthorChange}
        onTitleFieldChange={onBiblioExternaTitleChange}
        onYearChange={onBiblioExternaYearChange}
        onJournalChange={onBiblioExternaJournalChange}
        onPublisherChange={onBiblioExternaPublisherChange}
        onIdentifierChange={onBiblioExternaIdentifierChange}
        onExtraChange={onBiblioExternaExtraChange}
        onFreeTextChange={onBiblioExternaFreeTextChange}
        onRun={() => void onRunBiblioExterna()}
        isRunning={isRunningBiblioExterna}
        onToggleConfig={onToggleBiblioExternaConfig}
        showPanelChrome={false}
      />
    );
  }

  if (semanticAppId === "busca_livros") {
    return (
      <BookSearchPanel
        title={parameterSemanticMeta.busca_livros.title}
        description={parameterSemanticMeta.busca_livros.description}
        bookOptions={lexicalBooks}
        selectedBook={selectedLexicalBook}
        term={lexicalTerm}
        maxResults={lexicalMaxResults}
        onSelectBook={onSelectedLexicalBookChange}
        onTermChange={onLexicalTermChange}
        onMaxResultsChange={onLexicalMaxResultsChange}
        onRunSearch={() => void onRunLexicalSearch()}
        isRunning={isRunningLexicalSearch}
        showPanelChrome={false}
      />
    );
  }

  if (semanticAppId === "localiza_trechos") {
    return (
      <LexicalCitationLookupPanel
        title={parameterSemanticMeta.localiza_trechos.title}
        description={parameterSemanticMeta.localiza_trechos.description}
        citationText={lexicalCitationText}
        hasDocumentOpen={hasDocumentOpen}
        onCitationTextChange={onLexicalCitationTextChange}
        onImportCitationText={() => void onImportLexicalCitationText()}
        onRunCitationLookup={() => void onRunLexicalCitationLookup()}
        isRunning={isRunningLexicalCitationLookup}
        showPanelChrome={false}
      />
    );
  }

  if (semanticAppId === "lexical_overview") {
    return (
      <LexicalOverviewPanel
        title={parameterSemanticMeta.lexical_overview.title}
        description={parameterSemanticMeta.lexical_overview.description}
        term={lexicalTerm}
        maxResults={lexicalMaxResults}
        selectedSourceIds={selectedLexicalOverviewSourceIds}
        onToggleSource={onToggleLexicalOverviewSource}
        onTermChange={onLexicalTermChange}
        onMaxResultsChange={onLexicalMaxResultsChange}
        onRunSearch={() => void onRunLexicalOverview()}
        isRunning={isRunningLexicalOverview}
        showPanelChrome={false}
      />
    );
  }

  if (semanticAppId === "busca_semantica" || semanticAppId === "semantic_overview") {
    const activeSemanticPanelMode = semanticAppId === "semantic_overview" ? "overview" : "search";
    const sharedSemanticQuery = semanticSearchQuery || semanticOverviewTerm;
    const sharedSemanticLimit = semanticSearchMaxResults || semanticOverviewMaxResults;
    const selectedSemanticIndex = semanticSearchIndexes.find((item) => item.id === selectedSemanticSearchIndexId);
    const searchRecommendedMinScore = selectedSemanticIndex?.suggestedMinScore;
    const searchEffectiveMinScorePreview = semanticMinScore ?? (typeof searchRecommendedMinScore === "number" ? getRelaxedSemanticMinScore(searchRecommendedMinScore) : undefined);
    const selectedSemanticOverviewSourceIdSet = new Set(selectedSemanticOverviewSourceIds);
    const overviewRecommendedMinScores = semanticSearchIndexes
      .filter((item) => selectedSemanticOverviewSourceIdSet.has(item.id))
      .map((item) => item.suggestedMinScore)
      .filter((value) => Number.isFinite(value));
    const overviewRecommendedMinScoreMin = overviewRecommendedMinScores.length > 0 ? Math.min(...overviewRecommendedMinScores) : undefined;
    const overviewRecommendedMinScoreMax = overviewRecommendedMinScores.length > 0 ? Math.max(...overviewRecommendedMinScores) : undefined;
    const overviewEffectiveMinScorePreview = semanticMinScore ?? (typeof overviewRecommendedMinScoreMin === "number" ? getRelaxedSemanticMinScore(overviewRecommendedMinScoreMin) : undefined);
    const handleSharedSemanticQueryChange = (value: string) => {
      onSemanticSearchQueryChange(value);
      onSemanticOverviewTermChange(value);
    };
    const handleSharedSemanticLimitChange = (value: number) => {
      onSemanticSearchMaxResultsChange(value);
      onSemanticOverviewMaxResultsChange(value);
    };

    return (
      <div className="flex h-full flex-col">
        {activeSemanticPanelMode === "search" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <SemanticSearchPanel
              title={parameterSemanticMeta.busca_semantica.title}
              description={parameterSemanticMeta.busca_semantica.description}
              selectedIndexId={selectedSemanticSearchIndexId}
              availableIndexes={semanticSearchIndexes}
              isLoadingIndexes={isLoadingSemanticSearchIndexes}
              onSelectedIndexChange={onSelectedSemanticSearchIndexIdChange}
              query={sharedSemanticQuery}
              maxResults={sharedSemanticLimit}
              minScore={semanticMinScore}
              effectiveMinScorePreview={searchEffectiveMinScorePreview}
              recommendedMinScore={searchRecommendedMinScore}
              useRagContext={semanticUseRagContext}
              excludeLexicalDuplicates={semanticExcludeLexicalDuplicates}
              selectedVectorStoreLabel={aiActionVectorStoreOptions.find((item) => item.id === aiActionsSelectedVectorStoreId)?.label || ""}
              onQueryChange={handleSharedSemanticQueryChange}
              onMaxResultsChange={handleSharedSemanticLimitChange}
              onMinScoreChange={onSemanticMinScoreChange}
              onUseRagContextChange={onSemanticUseRagContextChange}
              onExcludeLexicalDuplicatesChange={onSemanticExcludeLexicalDuplicatesChange}
              onRunSearch={() => void onRunSemanticSearch()}
              isRunning={isRunningSemanticSearch}
              showPanelChrome={false}
            />
          </div>
        ) : null}
        {activeSemanticPanelMode === "overview" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <SemanticOverviewPanel
              title="Semantic Overview"
              description="Busca em todas as bases semânticas."
              term={sharedSemanticQuery}
              maxResults={sharedSemanticLimit}
              selectedSourceIds={selectedSemanticOverviewSourceIds}
              minScore={semanticMinScore}
              effectiveMinScorePreview={overviewEffectiveMinScorePreview}
              recommendedMinScoreMin={overviewRecommendedMinScoreMin}
              recommendedMinScoreMax={overviewRecommendedMinScoreMax}
              queryLabel="Query"
              useRagContext={semanticUseRagContext}
              excludeLexicalDuplicates={semanticExcludeLexicalDuplicates}
              selectedVectorStoreLabel={aiActionVectorStoreOptions.find((item) => item.id === aiActionsSelectedVectorStoreId)?.label || ""}
              onToggleSource={onToggleSemanticOverviewSource}
              onTermChange={handleSharedSemanticQueryChange}
              onMaxResultsChange={handleSharedSemanticLimitChange}
              onMinScoreChange={onSemanticMinScoreChange}
              onUseRagContextChange={onSemanticUseRagContextChange}
              onExcludeLexicalDuplicatesChange={onSemanticExcludeLexicalDuplicatesChange}
              onRunSearch={() => void onRunSemanticOverview()}
              isRunning={isRunningSemanticOverview}
              showPanelChrome={false}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (semanticAppId === "busca_verbetes") {
    return (
      <VerbeteSearchPanel
        title={parameterSemanticMeta.busca_verbetes.title}
        description={parameterSemanticMeta.busca_verbetes.description}
        author={verbeteSearchAuthor}
        titleField={verbeteSearchTitle}
        area={verbeteSearchArea}
        text={verbeteSearchText}
        maxResults={verbeteSearchMaxResults}
        onAuthorChange={onVerbeteSearchAuthorChange}
        onTitleFieldChange={onVerbeteSearchTitleChange}
        onAreaChange={onVerbeteSearchAreaChange}
        onTextChange={onVerbeteSearchTextChange}
        onMaxResultsChange={onVerbeteSearchMaxResultsChange}
        onRunSearch={() => void onRunVerbeteSearch()}
        isRunning={isRunningVerbeteSearch}
        showPanelChrome={false}
      />
    );
  }

  if (effectiveAppPanelScope === "tabela_verbete") {
    const effectiveTableAction = semanticAppId === "abre_tabword"
      ? "word"
      : semanticAppId === "abre_tab_html"
        ? "editor"
        : null;
    const handleRunTabelaVerbeteAction = () => {
      if (effectiveTableAction === "word") {
        void onRunVerbetografiaOpenTableWord();
        return;
      }
      void onRunVerbetografiaOpenTable();
    };
    const isRunningTabelaVerbeteAction = effectiveTableAction === "word"
      ? isRunningVerbetografiaOpenTableWord
      : isRunningVerbetografiaOpenTable;

    return (
      <div className="flex h-full flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
        {effectiveTableAction && (
          <VerbetografiaPanel
            title="Tabela Verbete"
            description="Abre tabela Word e editor HTML."
            actionLabel={effectiveTableAction === "word" ? parameterSemanticMeta.abre_tabword.title : parameterSemanticMeta.abre_tab_html.title}
            verbeteTitle={verbetografiaTitle}
            specialty={verbetografiaSpecialty}
            onVerbeteTitleChange={onVerbetografiaTitleChange}
            onSpecialtyChange={onVerbetografiaSpecialtyChange}
            onRun={handleRunTabelaVerbeteAction}
            isRunning={isRunningTabelaVerbeteAction}
            showActionButton={true}
            showActionSectionTitle={false}
            showPanelChrome={false}
          />
        )}
        </div>
      </div>
    );
  }

  if (effectiveAppPanelScope === "secoes_verbete") {
    const selectedVerbetografiaAction =
      semanticAppId === "definologia" || semanticAppId === "frase_enfatica" || semanticAppId === "sinonimologia" || semanticAppId === "fatologia"
        ? semanticAppId
        : null;

    const handleRunSelectedVerbetografiaAction = () => {
      switch (selectedVerbetografiaAction) {
        case "definologia":
          void onRunVerbeteDefinologia();
          break;
        case "frase_enfatica":
          void onRunVerbeteFraseEnfatica();
          break;
        case "sinonimologia":
          void onRunVerbeteSinonimologia();
          break;
        case "fatologia":
          void onRunVerbeteFatologia();
          break;
        default:
          break;
      }
    };

    const isSelectedVerbetografiaActionRunning =
      selectedVerbetografiaAction === "definologia"
        ? isRunningVerbeteDefinologia
        : selectedVerbetografiaAction === "frase_enfatica"
          ? isRunningVerbeteFraseEnfatica
          : selectedVerbetografiaAction === "sinonimologia"
            ? isRunningVerbeteSinonimologia
            : selectedVerbetografiaAction === "fatologia"
              ? isRunningVerbeteFatologia
              : false;
    return (
      <div className="flex h-full flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
         {selectedVerbetografiaAction ? (
          <VerbetografiaPanel
            title={parameterSemanticMeta[selectedVerbetografiaAction].title}
            description={parameterSemanticMeta[selectedVerbetografiaAction].description}
            actionLabel={parameterSemanticMeta[selectedVerbetografiaAction].title}
            verbeteTitle={verbetografiaTitle}
            specialty={verbetografiaSpecialty}
            onVerbeteTitleChange={onVerbetografiaTitleChange}
            onSpecialtyChange={onVerbetografiaSpecialtyChange}
            onRun={handleRunSelectedVerbetografiaAction}
            isRunning={isSelectedVerbetografiaActionRunning}
            showActionButton={true}
            showActionSectionTitle={false}
            showPanelChrome={false}
          />
        ) : (
          <VerbetografiaPanel
            title="Seções do Verbete"
            description="Informe o título e a especialidade para usar as ações de verbetografia."
            verbeteTitle={verbetografiaTitle}
            specialty={verbetografiaSpecialty}
            onVerbeteTitleChange={onVerbetografiaTitleChange}
            onSpecialtyChange={onVerbetografiaSpecialtyChange}
            showActionButton={false}
            showPanelChrome={false}
          />
        )}
        </div>
      </div>
    );
  }

  return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground" />;
};

export default AppsParameterSection;

