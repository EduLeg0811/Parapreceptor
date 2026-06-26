import SourcesPanel from "@/features/ghost-writer/components/config/SourcesPanel";
import ApplicationsLinksPanel from "@/features/ghost-writer/components/common/ApplicationsLinksPanel";
import DocumentParameterSection from "@/features/ghost-writer/components/editor/DocumentParameterSection";
import AiActionsParameterSection from "@/features/ghost-writer/components/parameters/AiActionsParameterSection";
import AppsParameterSection from "@/features/ghost-writer/components/parameters/AppsParameterSection";
import ParameterPanelToolbar from "@/features/ghost-writer/components/parameters/ParameterPanelToolbar";
import { NO_VECTOR_STORE_ID } from "@/features/ghost-writer/config/constants";
import { BOOK_SOURCE, DEFAULT_BOOK_SOURCE_ID, MACRO1_HIGHLIGHT_COLORS, TRANSLATE_LANGUAGE_OPTIONS, VECTOR_STORES_SOURCE } from "@/features/ghost-writer/config/options";
import type { TextStats } from "@/features/ghost-writer/hooks/useTextStats";
import type { UploadedLlmFile } from "@/features/ghost-writer/services/openai";
import { AI_PANEL_SECTIONS, APP_PANEL_SECTIONS, resolveSemanticActionId } from "@/features/ghost-writer/config/appRegistry";
import type { ActionItemId, AiActionId, AiPanelScope, AppPanelScope, LexicalBookOption, Macro2SpacingMode, ParameterPanelTarget, RefBookMode, RewritePromptType, SelectOption, SemanticIndexOption, SemanticSearchRagContext } from "@/features/ghost-writer/types";

type NonNullParameterPanelTarget = Exclude<ParameterPanelTarget, null>;

interface ParameterPanelContentProps {
  parameterPanelTarget: NonNullParameterPanelTarget;
  isLoading: boolean;
  isTermsConceptsConscienciografiaEnabled: boolean;
  isUploadingChatFiles: boolean;
  currentFileId: string;
  selectedImportFileName: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  stats: TextStats;
  isOpeningDocument: boolean;
  isImportingDocument: boolean;
  macro1Term: string;
  macro1ColorId: (typeof MACRO1_HIGHLIGHT_COLORS)[number]["id"];
  macro1PredictedMatches: number | null;
  isCountingMacro1Matches: boolean;
  macro2SpacingMode: Macro2SpacingMode;
  selectedBookSourceIds: string[];
  selectedChatSourceLabel: string;
  uploadedChatFiles: UploadedLlmFile[];
  llmModel: string;
  llmTemperature: number;
  llmMaxOutputTokens: number;
  llmMaxNumResults: number;
  llmEditorContextMaxChars: number;
  llmVerbosity: string;
  llmEffort: string;
  llmSystemPrompt: string;
  actionText: string;
  aiCommandQuery: string;
  translateLanguage: (typeof TRANSLATE_LANGUAGE_OPTIONS)[number]["value"];
  rewritePromptType: RewritePromptType;
  aiActionsSelectedVectorStoreIds: string[];
  aiActionVectorStoreOptions: SelectOption[];
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
  selectedLexicalOverviewSourceIds: string[];
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
  selectedSemanticOverviewSourceIds: string[];
  isRunningSemanticOverview: boolean;
  verbeteSearchAuthor: string;
  verbeteSearchTitle: string;
  verbeteSearchArea: string;
  verbeteSearchText: string;
  verbeteSearchMaxResults: number;
  isRunningVerbeteSearch: boolean;
  verbetografiaTitle: string;
  verbetografiaSpecialty: string;
  includeEditorContextInLlm: boolean;
  isRunningVerbetografiaOpenTable: boolean;
  isRunningVerbetografiaOpenTableWord: boolean;
  isRunningVerbeteDefinologia: boolean;
  isRunningVerbeteFraseEnfatica: boolean;
  isRunningVerbeteSinonimologia: boolean;
  isRunningVerbeteFatologia: boolean;
  onToggleAiActionsConfig: () => void;
  onToggleTermsConceptsConscienciografia: () => void;
  onCreateBlankDocument: () => void | Promise<void>;
  onDocumentPanelFile: (file: File | null | undefined) => void | Promise<void>;
  onDocumentPanelDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onClearSelectedImportFileName: () => void;
  onRefreshStats: () => void | Promise<void>;
  onOpenMacro: (macroId: "macro1" | "macro2") => void | Promise<void>;
  onMacro1TermChange: (value: string) => void;
  onMacro1ColorChange: (value: (typeof MACRO1_HIGHLIGHT_COLORS)[number]["id"]) => void;
  onRunMacro1Highlight: () => void | Promise<void>;
  onClearMacro1Highlight: () => void | Promise<void>;
  onMacro2SpacingModeChange: (value: Macro2SpacingMode) => void;
  onRunMacro2ManualNumbering: () => void | Promise<void>;
  onToggleBookSource: (id: string, checked: boolean) => void;
  onRemoveUploadedChatFile: (fileId: string) => void;
  onLlmModelChange: (value: string) => void;
  onLlmTemperatureChange: (value: number) => void;
  onLlmMaxOutputTokensChange: (value: number) => void;
  onLlmMaxNumResultsChange: (value: number) => void;
  onLlmEditorContextMaxCharsChange: (value: number) => void;
  onLlmVerbosityChange: (value: string) => void;
  onLlmEffortChange: (value: string) => void;
  onLlmSystemPromptChange: (value: string) => void;
  onResetAllConfig: () => void;
  onRunRandomPensata: () => void | Promise<void>;
  onOpenAiActionParameters: (id: AiActionId, sectionOverride?: "actions" | "rewriting" | "translation" | "customized_prompts") => void;
  onActionTextChange: (value: string) => void;
  onAiCommandQueryChange: (value: string) => void;
  onTranslateLanguageChange: (value: (typeof TRANSLATE_LANGUAGE_OPTIONS)[number]["value"]) => void;
  onRewritePromptTypeChange: (value: RewritePromptType) => void;
  onRetrieveSelectedText: () => void | Promise<void>;
  onApplyAction: (actionId: AiActionId) => void | Promise<void>;
  onToggleIncludeEditorContextInLlm: () => void;
  onUploadSourceFiles: (files: File[]) => void | Promise<void>;
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
  onToggleLexicalOverviewSource: (id: string, checked: boolean) => void;
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
  onToggleSemanticOverviewSource: (id: string, checked: boolean) => void;
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
  onSelectVerbetografiaAction: (id: ActionItemId) => void | Promise<void>;
  onRunAppAction: (id: ActionItemId) => void | Promise<void>;
  onVerbetografiaTitleChange: (value: string) => void;
  onVerbetografiaSpecialtyChange: (value: string) => void;
}

const ParameterPanelContent = ({
  parameterPanelTarget,
  isLoading,
  isTermsConceptsConscienciografiaEnabled,
  isUploadingChatFiles,
  currentFileId,
  selectedImportFileName,
  fileInputRef,
  stats,
  isOpeningDocument,
  isImportingDocument,
  macro1Term,
  macro1ColorId,
  macro1PredictedMatches,
  isCountingMacro1Matches,
  macro2SpacingMode,
  selectedBookSourceIds,
  selectedChatSourceLabel,
  uploadedChatFiles,
  llmModel,
  llmTemperature,
  llmMaxOutputTokens,
  llmMaxNumResults,
  llmEditorContextMaxChars,
  llmVerbosity,
  llmEffort,
  llmSystemPrompt,
  actionText,
  aiCommandQuery,
  translateLanguage,
  rewritePromptType,
  aiActionsSelectedVectorStoreIds,
  aiActionVectorStoreOptions,
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
  selectedLexicalOverviewSourceIds,
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
  selectedSemanticOverviewSourceIds,
  isRunningSemanticOverview,
  verbeteSearchAuthor,
  verbeteSearchTitle,
  verbeteSearchArea,
  verbeteSearchText,
  verbeteSearchMaxResults,
  isRunningVerbeteSearch,
  verbetografiaTitle,
  verbetografiaSpecialty,
  includeEditorContextInLlm,
  isRunningVerbetografiaOpenTable,
  isRunningVerbetografiaOpenTableWord,
  isRunningVerbeteDefinologia,
  isRunningVerbeteFraseEnfatica,
  isRunningVerbeteSinonimologia,
  isRunningVerbeteFatologia,
  onToggleAiActionsConfig,
  onToggleTermsConceptsConscienciografia,
  onCreateBlankDocument,
  onDocumentPanelFile,
  onDocumentPanelDrop,
  onClearSelectedImportFileName,
  onRefreshStats,
  onOpenMacro,
  onMacro1TermChange,
  onMacro1ColorChange,
  onRunMacro1Highlight,
  onClearMacro1Highlight,
  onMacro2SpacingModeChange,
  onRunMacro2ManualNumbering,
  onToggleBookSource,
  onRemoveUploadedChatFile,
  onLlmModelChange,
  onLlmTemperatureChange,
  onLlmMaxOutputTokensChange,
  onLlmMaxNumResultsChange,
  onLlmEditorContextMaxCharsChange,
  onLlmVerbosityChange,
  onLlmEffortChange,
  onLlmSystemPromptChange,
  onResetAllConfig,
  onRunRandomPensata,
  onOpenAiActionParameters,
  onActionTextChange,
  onAiCommandQueryChange,
  onTranslateLanguageChange,
  onRewritePromptTypeChange,
  onRetrieveSelectedText,
  onApplyAction,
  onToggleIncludeEditorContextInLlm,
  onUploadSourceFiles,
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
  onToggleLexicalOverviewSource,
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
  onToggleSemanticOverviewSource,
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
  onSelectVerbetografiaAction,
  onRunAppAction,
  onVerbetografiaTitleChange,
  onVerbetografiaSpecialtyChange,
}: ParameterPanelContentProps) => {
  const aiActionsSelectedVectorStoreId = aiActionsSelectedVectorStoreIds[0] ?? "";
  const semanticTargetId = resolveSemanticActionId(parameterPanelTarget.id);
  const isVerbetografiaAiAction =
    parameterPanelTarget.section === "secoes_verbete"
    && (semanticTargetId === "definologia"
      || semanticTargetId === "sinonimologia"
      || semanticTargetId === "fatologia"
      || semanticTargetId === "frase_enfatica");
  const verbetografiaDefaultVectorStoreId = DEFAULT_BOOK_SOURCE_ID;
  const effectiveVerbetografiaVectorStoreId =
    aiActionsSelectedVectorStoreId === NO_VECTOR_STORE_ID
      ? NO_VECTOR_STORE_ID
      : (aiActionsSelectedVectorStoreId || verbetografiaDefaultVectorStoreId);

  return (
    <div className="flex h-full flex-col">
      <ParameterPanelToolbar
        parameterPanelTarget={parameterPanelTarget}
        isLoading={isLoading}
        isTermsConceptsConscienciografiaEnabled={isTermsConceptsConscienciografiaEnabled}
        onToggleAiActionsConfig={onToggleAiActionsConfig}
        onToggleTermsConceptsConscienciografia={onToggleTermsConceptsConscienciografia}
        onOpenAiActionParameters={onOpenAiActionParameters}
        onSelectVerbetografiaAction={onSelectVerbetografiaAction}
        onRunAppAction={(id) => void onRunAppAction(id)}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {parameterPanelTarget.section === "document" ? (
          <DocumentParameterSection
            activeMacroId={parameterPanelTarget.id}
            currentFileId={currentFileId}
            selectedImportFileName={selectedImportFileName}
            fileInputRef={fileInputRef}
            stats={stats}
            isLoading={isLoading}
            isOpeningDocument={isOpeningDocument}
            isImportingDocument={isImportingDocument}
            macro1Term={macro1Term}
            macro1ColorId={macro1ColorId}
            macro1PredictedMatches={macro1PredictedMatches}
            isCountingMacro1Matches={isCountingMacro1Matches}
            macro2SpacingMode={macro2SpacingMode}
            onCreateBlankDocument={onCreateBlankDocument}
            onDocumentPanelFile={onDocumentPanelFile}
            onDocumentPanelDrop={onDocumentPanelDrop}
            onClearSelectedImportFileName={onClearSelectedImportFileName}
            onRefreshStats={onRefreshStats}
            onOpenMacro={onOpenMacro}
            onMacro1TermChange={onMacro1TermChange}
            onMacro1ColorChange={onMacro1ColorChange}
            onRunMacro1Highlight={onRunMacro1Highlight}
            onClearMacro1Highlight={onClearMacro1Highlight}
            onMacro2SpacingModeChange={onMacro2SpacingModeChange}
            onRunMacro2ManualNumbering={onRunMacro2ManualNumbering}
          />
        ) : null}

        {parameterPanelTarget.section === "sources" ? (
          <SourcesPanel
            onUploadFiles={(files) => void onUploadSourceFiles(files)}
            bookSources={BOOK_SOURCE.map((item) => ({ ...item }))}
            vectorStoreSources={VECTOR_STORES_SOURCE.map((item) => ({ ...item }))}
            selectedBookSourceIds={selectedBookSourceIds}
            onToggleBookSource={onToggleBookSource}
            selectedChatSourceLabel={selectedChatSourceLabel}
            uploadedFiles={uploadedChatFiles}
            onRemoveUploadedFile={onRemoveUploadedChatFile}
            isUploadingFiles={isUploadingChatFiles}
            llmModel={llmModel}
            onLlmModelChange={onLlmModelChange}
            llmTemperature={llmTemperature}
            onLlmTemperatureChange={onLlmTemperatureChange}
            llmMaxOutputTokens={llmMaxOutputTokens}
            onLlmMaxOutputTokensChange={onLlmMaxOutputTokensChange}
            llmMaxNumResults={llmMaxNumResults}
            onLlmMaxNumResultsChange={onLlmMaxNumResultsChange}
            llmEditorContextMaxChars={llmEditorContextMaxChars}
            onLlmEditorContextMaxCharsChange={onLlmEditorContextMaxCharsChange}
            llmVerbosity={llmVerbosity}
            onLlmVerbosityChange={onLlmVerbosityChange}
            llmEffort={llmEffort}
            onLlmEffortChange={onLlmEffortChange}
            llmSystemPrompt={llmSystemPrompt}
            onLlmSystemPromptChange={onLlmSystemPromptChange}
            includeEditorContextInLlm={includeEditorContextInLlm}
            onToggleIncludeEditorContextInLlm={onToggleIncludeEditorContextInLlm}
            canToggleIncludeEditorContextInLlm={Boolean(currentFileId)}
            onResetAllConfig={onResetAllConfig}
          />
        ) : null}

        {parameterPanelTarget.section === "applications" ? (
          <ApplicationsLinksPanel
            isLoading={isLoading}
            onRunRandomPensata={() => void onRunRandomPensata()}
          />
        ) : null}

        {AI_PANEL_SECTIONS.includes(parameterPanelTarget.section as never) ? (
          <AiActionsParameterSection
            section={parameterPanelTarget.section as AiPanelScope}
            actionId={parameterPanelTarget.id}
            actionText={actionText}
            aiCommandQuery={aiCommandQuery}
            translateLanguage={translateLanguage}
            rewritePromptType={rewritePromptType}
            isLoading={isLoading}
            hasDocumentOpen={Boolean(currentFileId)}
            onActionTextChange={onActionTextChange}
            onAiCommandQueryChange={onAiCommandQueryChange}
            onTranslateLanguageChange={onTranslateLanguageChange}
            onRewritePromptTypeChange={onRewritePromptTypeChange}
            onRetrieveSelectedText={onRetrieveSelectedText}
            onApplyAction={onApplyAction}
          />
        ) : null}

        {APP_PANEL_SECTIONS.includes(parameterPanelTarget.section as never) ? (
          <AppsParameterSection
            appId={parameterPanelTarget.id}
            appPanelScope={parameterPanelTarget.section as AppPanelScope}
            selectedRefBook={selectedRefBook}
            refBookMode={refBookMode}
            refBookPages={refBookPages}
            isRunningInsertRefBook={isRunningInsertRefBook}
            verbeteInput={verbeteInput}
            isRunningInsertRefVerbete={isRunningInsertRefVerbete}
            biblioGeralAuthor={biblioGeralAuthor}
            biblioGeralTitle={biblioGeralTitle}
            biblioGeralYear={biblioGeralYear}
            biblioGeralExtra={biblioGeralExtra}
            isRunningBiblioGeral={isRunningBiblioGeral}
            biblioExternaAuthor={biblioExternaAuthor}
            biblioExternaTitle={biblioExternaTitle}
            biblioExternaYear={biblioExternaYear}
            biblioExternaJournal={biblioExternaJournal}
            biblioExternaPublisher={biblioExternaPublisher}
            biblioExternaIdentifier={biblioExternaIdentifier}
            biblioExternaExtra={biblioExternaExtra}
            biblioExternaFreeText={biblioExternaFreeText}
            isRunningBiblioExterna={isRunningBiblioExterna}
            lexicalBooks={lexicalBooks}
            selectedLexicalBook={selectedLexicalBook}
            lexicalTerm={lexicalTerm}
            lexicalCitationText={lexicalCitationText}
            lexicalMaxResults={lexicalMaxResults}
            selectedLexicalOverviewSourceIds={selectedLexicalOverviewSourceIds}
            isRunningLexicalSearch={isRunningLexicalSearch}
            isRunningLexicalCitationLookup={isRunningLexicalCitationLookup}
            isRunningLexicalOverview={isRunningLexicalOverview}
            selectedSemanticSearchIndexId={selectedSemanticSearchIndexId}
            semanticSearchIndexes={semanticSearchIndexes}
            isLoadingSemanticSearchIndexes={isLoadingSemanticSearchIndexes}
            semanticSearchQuery={semanticSearchQuery}
            semanticSearchMaxResults={semanticSearchMaxResults}
            semanticMinScore={semanticMinScore}
            semanticMinScoreMode={semanticMinScoreMode}
            semanticUseRagContext={semanticUseRagContext}
            semanticExcludeLexicalDuplicates={semanticExcludeLexicalDuplicates}
            semanticOverviewLastRagContext={semanticOverviewLastRagContext}
            isRunningSemanticSearch={isRunningSemanticSearch}
            semanticOverviewTerm={semanticOverviewTerm}
            semanticOverviewMaxResults={semanticOverviewMaxResults}
            selectedSemanticOverviewSourceIds={selectedSemanticOverviewSourceIds}
            isRunningSemanticOverview={isRunningSemanticOverview}
            verbeteSearchAuthor={verbeteSearchAuthor}
            verbeteSearchTitle={verbeteSearchTitle}
            verbeteSearchArea={verbeteSearchArea}
            verbeteSearchText={verbeteSearchText}
            verbeteSearchMaxResults={verbeteSearchMaxResults}
            isRunningVerbeteSearch={isRunningVerbeteSearch}
            verbetografiaTitle={verbetografiaTitle}
            verbetografiaSpecialty={verbetografiaSpecialty}
            hasDocumentOpen={Boolean(currentFileId)}
            isRunningVerbetografiaOpenTable={isRunningVerbetografiaOpenTable}
            isRunningVerbetografiaOpenTableWord={isRunningVerbetografiaOpenTableWord}
            isRunningVerbeteDefinologia={isRunningVerbeteDefinologia}
            isRunningVerbeteFraseEnfatica={isRunningVerbeteFraseEnfatica}
            isRunningVerbeteSinonimologia={isRunningVerbeteSinonimologia}
            isRunningVerbeteFatologia={isRunningVerbeteFatologia}
            aiActionsSelectedVectorStoreId={isVerbetografiaAiAction ? effectiveVerbetografiaVectorStoreId : aiActionsSelectedVectorStoreId}
            aiActionVectorStoreOptions={aiActionVectorStoreOptions}
            onSelectRefBook={onSelectRefBook}
            onRefBookModeChange={onRefBookModeChange}
            onRefBookPagesChange={onRefBookPagesChange}
            onRunInsertRefBook={onRunInsertRefBook}
            onVerbeteInputChange={onVerbeteInputChange}
            onRunInsertRefVerbete={onRunInsertRefVerbete}
            onBiblioGeralAuthorChange={onBiblioGeralAuthorChange}
            onBiblioGeralTitleChange={onBiblioGeralTitleChange}
            onBiblioGeralYearChange={onBiblioGeralYearChange}
            onBiblioGeralExtraChange={onBiblioGeralExtraChange}
            onRunBiblioGeral={onRunBiblioGeral}
            onBiblioExternaAuthorChange={onBiblioExternaAuthorChange}
            onBiblioExternaTitleChange={onBiblioExternaTitleChange}
            onBiblioExternaYearChange={onBiblioExternaYearChange}
            onBiblioExternaJournalChange={onBiblioExternaJournalChange}
            onBiblioExternaPublisherChange={onBiblioExternaPublisherChange}
            onBiblioExternaIdentifierChange={onBiblioExternaIdentifierChange}
            onBiblioExternaExtraChange={onBiblioExternaExtraChange}
            onBiblioExternaFreeTextChange={onBiblioExternaFreeTextChange}
            onRunBiblioExterna={onRunBiblioExterna}
            onToggleBiblioExternaConfig={onToggleBiblioExternaConfig}
            onSelectedLexicalBookChange={onSelectedLexicalBookChange}
            onLexicalTermChange={onLexicalTermChange}
            onLexicalCitationTextChange={onLexicalCitationTextChange}
            onImportLexicalCitationText={onImportLexicalCitationText}
            onLexicalMaxResultsChange={onLexicalMaxResultsChange}
            onRunLexicalSearch={onRunLexicalSearch}
            onRunLexicalCitationLookup={onRunLexicalCitationLookup}
            onRunLexicalOverview={onRunLexicalOverview}
            onToggleLexicalOverviewSource={onToggleLexicalOverviewSource}
            onSelectedSemanticSearchIndexIdChange={onSelectedSemanticSearchIndexIdChange}
            onSemanticSearchQueryChange={onSemanticSearchQueryChange}
            onSemanticSearchMaxResultsChange={onSemanticSearchMaxResultsChange}
            onSemanticMinScoreChange={onSemanticMinScoreChange}
            onSemanticMinScoreDefaultChange={onSemanticMinScoreDefaultChange}
            onSemanticUseRagContextChange={onSemanticUseRagContextChange}
            onSemanticExcludeLexicalDuplicatesChange={onSemanticExcludeLexicalDuplicatesChange}
            onRunSemanticSearch={onRunSemanticSearch}
            onSemanticOverviewTermChange={onSemanticOverviewTermChange}
            onSemanticOverviewMaxResultsChange={onSemanticOverviewMaxResultsChange}
            onRunSemanticOverview={onRunSemanticOverview}
            onToggleSemanticOverviewSource={onToggleSemanticOverviewSource}
            onVerbeteSearchAuthorChange={onVerbeteSearchAuthorChange}
            onVerbeteSearchTitleChange={onVerbeteSearchTitleChange}
            onVerbeteSearchAreaChange={onVerbeteSearchAreaChange}
            onVerbeteSearchTextChange={onVerbeteSearchTextChange}
            onVerbeteSearchMaxResultsChange={onVerbeteSearchMaxResultsChange}
            onRunVerbeteSearch={onRunVerbeteSearch}
            onRunVerbetografiaOpenTable={onRunVerbetografiaOpenTable}
            onRunVerbetografiaOpenTableWord={onRunVerbetografiaOpenTableWord}
            onRunVerbeteDefinologia={onRunVerbeteDefinologia}
            onRunVerbeteFraseEnfatica={onRunVerbeteFraseEnfatica}
            onRunVerbeteSinonimologia={onRunVerbeteSinonimologia}
            onRunVerbeteFatologia={onRunVerbeteFatologia}
            onVerbetografiaTitleChange={onVerbetografiaTitleChange}
            onVerbetografiaSpecialtyChange={onVerbetografiaSpecialtyChange}
          />
        ) : null}
      </div>
    </div>
  );
};

export default ParameterPanelContent;

