import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ParameterPanelToolbar from "@/features/ghost-writer/components/parameters/ParameterPanelToolbar";
import AppsParameterSection from "@/features/ghost-writer/components/parameters/AppsParameterSection";

const baseAppsProps = {
  appPanelScope: "secoes_verbete" as const,
  selectedRefBook: "EXP" as const,
  refBookMode: "bee" as const,
  refBookPages: "",
  isRunningInsertRefBook: false,
  verbeteInput: "",
  isRunningInsertRefVerbete: false,
  biblioGeralAuthor: "",
  biblioGeralTitle: "",
  biblioGeralYear: "",
  biblioGeralExtra: "",
  isRunningBiblioGeral: false,
  biblioExternaAuthor: "",
  biblioExternaTitle: "",
  biblioExternaYear: "",
  biblioExternaJournal: "",
  biblioExternaPublisher: "",
  biblioExternaIdentifier: "",
  biblioExternaExtra: "",
  biblioExternaFreeText: "",
  isRunningBiblioExterna: false,
  lexicalBooks: [],
  selectedLexicalBook: "",
  lexicalTerm: "",
  lexicalMaxResults: 10,
  isRunningLexicalSearch: false,
  isRunningLexicalOverview: false,
  selectedSemanticSearchIndexId: "",
  semanticSearchIndexes: [],
  isLoadingSemanticSearchIndexes: false,
  semanticSearchQuery: "",
  semanticSearchMaxResults: 10,
  semanticMinScore: 0.25,
  semanticMinScoreMode: "auto" as const,
  semanticUseRagContext: true,
  semanticExcludeLexicalDuplicates: false,
  semanticSearchLastRagContext: null,
  semanticOverviewLastRagContext: null,
  isRunningSemanticSearch: false,
  semanticOverviewTerm: "",
  semanticOverviewMaxResults: 10,
  isRunningSemanticOverview: false,
  verbeteSearchAuthor: "",
  verbeteSearchTitle: "",
  verbeteSearchArea: "",
  verbeteSearchText: "",
  verbeteSearchMaxResults: 10,
  isRunningVerbeteSearch: false,
  verbetografiaTitle: "Autopesquisa",
  verbetografiaSpecialty: "Parapercepciologia",
  isRunningVerbetografiaOpenTable: false,
  isRunningVerbetografiaOpenTableWord: false,
  isRunningVerbeteDefinologia: false,
  isRunningVerbeteFraseEnfatica: false,
  isRunningVerbeteSinonimologia: false,
  isRunningVerbeteFatologia: false,
  aiActionsSelectedVectorStoreId: "",
  aiActionVectorStoreOptions: [],
  onSelectRefBook: vi.fn(),
  onRefBookModeChange: vi.fn(),
  onRefBookPagesChange: vi.fn(),
  onRunInsertRefBook: vi.fn(),
  onVerbeteInputChange: vi.fn(),
  onRunInsertRefVerbete: vi.fn(),
  onBiblioGeralAuthorChange: vi.fn(),
  onBiblioGeralTitleChange: vi.fn(),
  onBiblioGeralYearChange: vi.fn(),
  onBiblioGeralExtraChange: vi.fn(),
  onRunBiblioGeral: vi.fn(),
  onBiblioExternaAuthorChange: vi.fn(),
  onBiblioExternaTitleChange: vi.fn(),
  onBiblioExternaYearChange: vi.fn(),
  onBiblioExternaJournalChange: vi.fn(),
  onBiblioExternaPublisherChange: vi.fn(),
  onBiblioExternaIdentifierChange: vi.fn(),
  onBiblioExternaExtraChange: vi.fn(),
  onBiblioExternaFreeTextChange: vi.fn(),
  onRunBiblioExterna: vi.fn(),
  onToggleBiblioExternaConfig: vi.fn(),
  onSelectedLexicalBookChange: vi.fn(),
  onLexicalTermChange: vi.fn(),
  onLexicalMaxResultsChange: vi.fn(),
  onRunLexicalSearch: vi.fn(),
  onRunLexicalOverview: vi.fn(),
  onSelectedSemanticSearchIndexIdChange: vi.fn(),
  onSemanticSearchQueryChange: vi.fn(),
  onSemanticSearchMaxResultsChange: vi.fn(),
  onSemanticMinScoreChange: vi.fn(),
  onSemanticMinScoreDefaultChange: vi.fn(),
  onSemanticUseRagContextChange: vi.fn(),
  onSemanticExcludeLexicalDuplicatesChange: vi.fn(),
  onRunSemanticSearch: vi.fn(),
  onSemanticOverviewTermChange: vi.fn(),
  onSemanticOverviewMaxResultsChange: vi.fn(),
  onRunSemanticOverview: vi.fn(),
  onVerbeteSearchAuthorChange: vi.fn(),
  onVerbeteSearchTitleChange: vi.fn(),
  onVerbeteSearchAreaChange: vi.fn(),
  onVerbeteSearchTextChange: vi.fn(),
  onVerbeteSearchMaxResultsChange: vi.fn(),
  onRunVerbeteSearch: vi.fn(),
  onRunVerbetografiaOpenTable: vi.fn(),
  onRunVerbetografiaOpenTableWord: vi.fn(),
  onRunVerbeteDefinologia: vi.fn(),
  onRunVerbeteFraseEnfatica: vi.fn(),
  onRunVerbeteSinonimologia: vi.fn(),
  onRunVerbeteFatologia: vi.fn(),
  onVerbetografiaTitleChange: vi.fn(),
  onVerbetografiaSpecialtyChange: vi.fn(),
};

describe("verbetografia panels", () => {
  it("uses the top toolbar as selector only for the current verbetografia actions", () => {
    const onSelectVerbetografiaAction = vi.fn();
    const onRunAppAction = vi.fn();

    render(
      <ParameterPanelToolbar
        parameterPanelTarget={{ section: "secoes_verbete", id: null }}
        isLoading={false}
        isTermsConceptsConscienciografiaEnabled={false}
        onToggleAiActionsConfig={vi.fn()}
        onToggleTermsConceptsConscienciografia={vi.fn()}
        onOpenAiActionParameters={vi.fn()}
        onSelectVerbetografiaAction={onSelectVerbetografiaAction}
        onRunAppAction={onRunAppAction}
      />,
    );

    expect(screen.queryByRole("button", { name: /tabela verbete/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /definologia/i }));

    expect(onSelectVerbetografiaAction).toHaveBeenCalledWith("definologia");
    expect(onRunAppAction).not.toHaveBeenCalled();
  });

  it("shows only tabela actions inside Tabela Verbete", () => {
    render(
      <ParameterPanelToolbar
        parameterPanelTarget={{ section: "tabela_verbete", id: "abre_tab_html" }}
        isLoading={false}
        isTermsConceptsConscienciografiaEnabled={false}
        onToggleAiActionsConfig={vi.fn()}
        onToggleTermsConceptsConscienciografia={vi.fn()}
        onOpenAiActionParameters={vi.fn()}
        onSelectVerbetografiaAction={vi.fn()}
        onRunAppAction={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /definologia/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sinonimologia/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /abre tabela no editor/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /abre tabela no word/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /configurações ia/i })).not.toBeInTheDocument();
  });

  it("shows the shared verbetografia fields before a section button is selected", () => {
    render(
      <AppsParameterSection
        hasDocumentOpen={false}
        {...baseAppsProps}
        appId={null} appPanelScope="secoes_verbete"      />,
    );

    expect(screen.getByDisplayValue("Autopesquisa")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Parapercepciologia")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tabela automatizada/i })).not.toBeInTheDocument();
  });

  it("shows only the selected tabela verbete action inside the parameters body", () => {
    const onRunVerbetografiaOpenTable = vi.fn();

    render(
      <AppsParameterSection
        hasDocumentOpen={false}
        {...baseAppsProps}
        appPanelScope="tabela_verbete"
        appId="abre_tab_html"
        onRunVerbetografiaOpenTable={onRunVerbetografiaOpenTable}      />,
    );

    expect(screen.getByDisplayValue("Autopesquisa")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Parapercepciologia")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /abre tabela no editor/i })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /abre tabela no word/i })).not.toBeInTheDocument();
    const actionButton = screen.getByRole("button", { name: /abre tabela no editor/i });
    expect(actionButton.className).toContain("border-green-300");

    fireEvent.click(actionButton);
    expect(onRunVerbetografiaOpenTable).toHaveBeenCalledTimes(1);
  });

  it("runs the word action only after selecting the word button", () => {
    const onRunVerbetografiaOpenTable = vi.fn();
    const onRunVerbetografiaOpenTableWord = vi.fn();

    render(
      <AppsParameterSection
        hasDocumentOpen={false}
        {...baseAppsProps}
        appPanelScope="tabela_verbete"
        appId="abre_tabword"
        onRunVerbetografiaOpenTable={onRunVerbetografiaOpenTable}
        onRunVerbetografiaOpenTableWord={onRunVerbetografiaOpenTableWord}
      />,
    );

    expect(screen.queryByRole("button", { name: /abre tabela no editor/i })).not.toBeInTheDocument();
    const actionButton = screen.getByRole("button", { name: /abre tabela no word/i });
    fireEvent.click(actionButton);

    expect(onRunVerbetografiaOpenTableWord).toHaveBeenCalledTimes(1);
    expect(onRunVerbetografiaOpenTable).not.toHaveBeenCalled();
  });

  it("enables verbetografia section actions with title only", () => {
    const onRunVerbeteDefinologia = vi.fn();

    render(
      <AppsParameterSection
        hasDocumentOpen={false}
        {...baseAppsProps}
        appId="definologia"
        appPanelScope="secoes_verbete"
        verbetografiaSpecialty=""
        onRunVerbeteDefinologia={onRunVerbeteDefinologia}
      />,
    );

    const actionButton = screen.getByRole("button", { name: /definologia/i });
    expect(actionButton).toBeEnabled();

    fireEvent.click(actionButton);
    expect(onRunVerbeteDefinologia).toHaveBeenCalledTimes(1);
  });

  it("shows semantic search fields only after clicking the main panel button", () => {
    render(
      <AppsParameterSection
        hasDocumentOpen={false}
        {...baseAppsProps}
        appId="busca_semantica"
        appPanelScope="semantic_search"
        semanticSearchIndexes={[{
          id: "idx-1",
          label: "Indice 1",
          sourceRows: 10,
          model: "text-embedding-3-large",
          dimensions: 3072,
          embeddingDtype: "float32",
          sourceFile: "",
          suggestedMinScore: 0.5,
        }]}
        selectedSemanticSearchIndexId="idx-1"
      />,
    );

    expect(screen.getByText("Base Vetorial")).toBeInTheDocument();
    expect(screen.getByText("Query")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search|buscar/i })).toBeInTheDocument();
  });

  it("initializes Semantic Search score with half the calibrated base", () => {
    const onSemanticMinScoreDefaultChange = vi.fn();

    render(
      <AppsParameterSection
        hasDocumentOpen={false}
        {...baseAppsProps}
        appId="busca_semantica"
        appPanelScope="semantic_search"
        semanticMinScore={null}
        onSemanticMinScoreDefaultChange={onSemanticMinScoreDefaultChange}
        semanticSearchIndexes={[{
          id: "idx-1",
          label: "Indice 1",
          sourceRows: 10,
          model: "text-embedding-3-large",
          dimensions: 3072,
          embeddingDtype: "float32",
          sourceFile: "",
          suggestedMinScore: 0.72,
        }]}
        selectedSemanticSearchIndexId="idx-1"
      />,
    );

    expect(onSemanticMinScoreDefaultChange).toHaveBeenCalledWith(0.36);
  });

  it("initializes Semantic Overview score with half the lowest calibrated base", () => {
    const onSemanticMinScoreDefaultChange = vi.fn();

    render(
      <AppsParameterSection
        hasDocumentOpen={false}
        {...baseAppsProps}
        appId="semantic_overview"
        appPanelScope="semantic_search"
        semanticMinScore={null}
        onSemanticMinScoreDefaultChange={onSemanticMinScoreDefaultChange}
        semanticSearchIndexes={[
          {
            id: "idx-1",
            label: "Indice 1",
            sourceRows: 10,
            model: "text-embedding-3-large",
            dimensions: 3072,
            embeddingDtype: "float32",
            sourceFile: "",
            suggestedMinScore: 0.72,
          },
          {
            id: "idx-2",
            label: "Indice 2",
            sourceRows: 20,
            model: "text-embedding-3-large",
            dimensions: 3072,
            embeddingDtype: "float32",
            sourceFile: "",
            suggestedMinScore: 0.8,
          },
        ]}
      />,
    );

    expect(onSemanticMinScoreDefaultChange).toHaveBeenCalledWith(0.36);
  });

  it("recomputes the Semantic Search auto score when the selected base changes", () => {
    const onSemanticMinScoreDefaultChange = vi.fn();

    const { rerender } = render(
      <AppsParameterSection
        hasDocumentOpen={false}
        {...baseAppsProps}
        appId="busca_semantica"
        appPanelScope="semantic_search"
        semanticMinScore={0.36}
        semanticMinScoreMode="auto"
        onSemanticMinScoreDefaultChange={onSemanticMinScoreDefaultChange}
        semanticSearchIndexes={[
          {
            id: "idx-1",
            label: "Indice 1",
            sourceRows: 10,
            model: "text-embedding-3-large",
            dimensions: 3072,
            embeddingDtype: "float32",
            sourceFile: "",
            suggestedMinScore: 0.72,
          },
          {
            id: "idx-2",
            label: "Indice 2",
            sourceRows: 20,
            model: "text-embedding-3-large",
            dimensions: 3072,
            embeddingDtype: "float32",
            sourceFile: "",
            suggestedMinScore: 0.8,
          },
        ]}
        selectedSemanticSearchIndexId="idx-1"
      />,
    );

    onSemanticMinScoreDefaultChange.mockClear();

    rerender(
      <AppsParameterSection
        hasDocumentOpen={false}
        {...baseAppsProps}
        appId="busca_semantica"
        appPanelScope="semantic_search"
        semanticMinScore={0.36}
        semanticMinScoreMode="auto"
        onSemanticMinScoreDefaultChange={onSemanticMinScoreDefaultChange}
        semanticSearchIndexes={[
          {
            id: "idx-1",
            label: "Indice 1",
            sourceRows: 10,
            model: "text-embedding-3-large",
            dimensions: 3072,
            embeddingDtype: "float32",
            sourceFile: "",
            suggestedMinScore: 0.72,
          },
          {
            id: "idx-2",
            label: "Indice 2",
            sourceRows: 20,
            model: "text-embedding-3-large",
            dimensions: 3072,
            embeddingDtype: "float32",
            sourceFile: "",
            suggestedMinScore: 0.8,
          },
        ]}
        selectedSemanticSearchIndexId="idx-2"
      />,
    );

    expect(onSemanticMinScoreDefaultChange).toHaveBeenCalledWith(0.4);
  });

  it("toggles lexical duplicate filtering in Semantic Search", () => {
    const onSemanticExcludeLexicalDuplicatesChange = vi.fn();

    render(
      <AppsParameterSection
        hasDocumentOpen={false}
        {...baseAppsProps}
        appId="busca_semantica"
        appPanelScope="semantic_search"
        onSemanticExcludeLexicalDuplicatesChange={onSemanticExcludeLexicalDuplicatesChange}
        semanticSearchIndexes={[{
          id: "idx-1",
          label: "Indice 1",
          sourceRows: 10,
          model: "text-embedding-3-large",
          dimensions: 3072,
          embeddingDtype: "float32",
          sourceFile: "",
          suggestedMinScore: 0.72,
        }]}
        selectedSemanticSearchIndexId="idx-1"
      />,
    );

    fireEvent.click(screen.getAllByRole("switch")[1]);

    expect(onSemanticExcludeLexicalDuplicatesChange).toHaveBeenCalledWith(true);
  });
});


