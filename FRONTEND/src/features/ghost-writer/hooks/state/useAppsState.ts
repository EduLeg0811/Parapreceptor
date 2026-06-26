import { useState } from "react";
import { DEFAULT_BOOK_SEARCH_MAX_RESULTS } from "@/features/ghost-writer/config/constants";
import { ALL_OVERVIEW_SOURCE_IDS, DEFAULT_OVERVIEW_SOURCE_IDS } from "@/features/ghost-writer/config/overviewSources";
import type { LexicalBookOption, SemanticIndexOption, SemanticSearchRagContext } from "@/features/ghost-writer/types";
export const useGhostWriterAppsState = () => {
  const [selectedRefBook, setSelectedRefBook] = useState("LO");
  const [refBookMode, setRefBookMode] = useState<"bee" | "simples">("bee");
  const [refBookPages, setRefBookPages] = useState("");
  const [isRunningInsertRefBook, setIsRunningInsertRefBook] = useState(false);
  const [verbeteInput, setVerbeteInput] = useState("");
  const [isRunningInsertRefVerbete, setIsRunningInsertRefVerbete] = useState(false);
  const [biblioGeralAuthor, setBiblioGeralAuthor] = useState("");
  const [biblioGeralTitle, setBiblioGeralTitle] = useState("");
  const [biblioGeralYear, setBiblioGeralYear] = useState("");
  const [biblioGeralExtra, setBiblioGeralExtra] = useState("");
  const [isRunningBiblioGeral, setIsRunningBiblioGeral] = useState(false);
  const [biblioExternaAuthor, setBiblioExternaAuthor] = useState("");
  const [biblioExternaTitle, setBiblioExternaTitle] = useState("");
  const [biblioExternaYear, setBiblioExternaYear] = useState("");
  const [biblioExternaJournal, setBiblioExternaJournal] = useState("");
  const [biblioExternaPublisher, setBiblioExternaPublisher] = useState("");
  const [biblioExternaIdentifier, setBiblioExternaIdentifier] = useState("");
  const [biblioExternaExtra, setBiblioExternaExtra] = useState("");
  const [biblioExternaFreeText, setBiblioExternaFreeText] = useState("");
  const [isRunningBiblioExterna, setIsRunningBiblioExterna] = useState(false);
  const [lexicalBooks, setLexicalBooks] = useState<LexicalBookOption[]>([]);
  const [selectedLexicalBook, setSelectedLexicalBook] = useState<string>("LO");
  const [lexicalTerm, setLexicalTerm] = useState("");
  const [lexicalCitationText, setLexicalCitationText] = useState("");
  const [lexicalMaxResults, setLexicalMaxResults] = useState(DEFAULT_BOOK_SEARCH_MAX_RESULTS);
  const [selectedLexicalOverviewSourceIds, setSelectedLexicalOverviewSourceIds] = useState<string[]>(DEFAULT_OVERVIEW_SOURCE_IDS);
  const [isRunningLexicalSearch, setIsRunningLexicalSearch] = useState(false);
  const [isRunningLexicalCitationLookup, setIsRunningLexicalCitationLookup] = useState(false);
  const [isRunningLexicalOverview, setIsRunningLexicalOverview] = useState(false);
  const [semanticSearchQuery, setSemanticSearchQuery] = useState("");
  const [semanticSearchMaxResults, setSemanticSearchMaxResults] = useState(DEFAULT_BOOK_SEARCH_MAX_RESULTS);
  const [semanticMinScore, setSemanticMinScore] = useState<number | null>(null);
  const [semanticMinScoreMode, setSemanticMinScoreMode] = useState<"auto" | "manual">("auto");
  const [semanticUseRagContext, setSemanticUseRagContext] = useState(false);
  const [semanticExcludeLexicalDuplicates, setSemanticExcludeLexicalDuplicates] = useState(false);
  const [semanticSearchLastRagContext, setSemanticSearchLastRagContext] = useState<SemanticSearchRagContext | null>(null);
  const [semanticOverviewLastRagContext, setSemanticOverviewLastRagContext] = useState<SemanticSearchRagContext | null>(null);
  const [semanticSearchIndexes, setSemanticSearchIndexes] = useState<SemanticIndexOption[]>([]);
  const [selectedSemanticSearchIndexId, setSelectedSemanticSearchIndexId] = useState("");
  const [isLoadingSemanticSearchIndexes, setIsLoadingSemanticSearchIndexes] = useState(false);
  const [isRunningSemanticSearch, setIsRunningSemanticSearch] = useState(false);
  const [semanticOverviewTerm, setSemanticOverviewTerm] = useState("");
  const [semanticOverviewMaxResults, setSemanticOverviewMaxResults] = useState(DEFAULT_BOOK_SEARCH_MAX_RESULTS);
  const [selectedSemanticOverviewSourceIds, setSelectedSemanticOverviewSourceIds] = useState<string[]>(DEFAULT_OVERVIEW_SOURCE_IDS);
  const [isRunningSemanticOverview, setIsRunningSemanticOverview] = useState(false);
  const [verbeteSearchAuthor, setVerbeteSearchAuthor] = useState("");
  const [verbeteSearchTitle, setVerbeteSearchTitle] = useState("");
  const [verbeteSearchArea, setVerbeteSearchArea] = useState("");
  const [verbeteSearchText, setVerbeteSearchText] = useState("");
  const [verbeteSearchMaxResults, setVerbeteSearchMaxResults] = useState(DEFAULT_BOOK_SEARCH_MAX_RESULTS);
  const [isRunningVerbeteSearch, setIsRunningVerbeteSearch] = useState(false);
  const [verbetografiaTitle, setVerbetografiaTitle] = useState("");
  const [verbetografiaSpecialty, setVerbetografiaSpecialty] = useState("");
  const [isRunningVerbetografiaOpenTable, setIsRunningVerbetografiaOpenTable] = useState(false);
  const [isRunningVerbetografiaOpenTableWord, setIsRunningVerbetografiaOpenTableWord] = useState(false);
  const [isRunningVerbeteDefinologia, setIsRunningVerbeteDefinologia] = useState(false);
  const [isRunningVerbeteFraseEnfatica, setIsRunningVerbeteFraseEnfatica] = useState(false);
  const [isRunningVerbeteSinonimologia, setIsRunningVerbeteSinonimologia] = useState(false);
  const [isRunningVerbeteFatologia, setIsRunningVerbeteFatologia] = useState(false);

  return {
    selectedRefBook,
    setSelectedRefBook,
    refBookMode,
    setRefBookMode,
    refBookPages,
    setRefBookPages,
    isRunningInsertRefBook,
    setIsRunningInsertRefBook,
    verbeteInput,
    setVerbeteInput,
    isRunningInsertRefVerbete,
    setIsRunningInsertRefVerbete,
    biblioGeralAuthor,
    setBiblioGeralAuthor,
    biblioGeralTitle,
    setBiblioGeralTitle,
    biblioGeralYear,
    setBiblioGeralYear,
    biblioGeralExtra,
    setBiblioGeralExtra,
    isRunningBiblioGeral,
    setIsRunningBiblioGeral,
    biblioExternaAuthor,
    setBiblioExternaAuthor,
    biblioExternaTitle,
    setBiblioExternaTitle,
    biblioExternaYear,
    setBiblioExternaYear,
    biblioExternaJournal,
    setBiblioExternaJournal,
    biblioExternaPublisher,
    setBiblioExternaPublisher,
    biblioExternaIdentifier,
    setBiblioExternaIdentifier,
    biblioExternaExtra,
    setBiblioExternaExtra,
    biblioExternaFreeText,
    setBiblioExternaFreeText,
    isRunningBiblioExterna,
    setIsRunningBiblioExterna,
    lexicalBooks,
    setLexicalBooks,
    selectedLexicalBook,
    setSelectedLexicalBook,
    lexicalTerm,
    setLexicalTerm,
    lexicalCitationText,
    setLexicalCitationText,
    lexicalMaxResults,
    setLexicalMaxResults,
    selectedLexicalOverviewSourceIds,
    setSelectedLexicalOverviewSourceIds,
    isRunningLexicalSearch,
    setIsRunningLexicalSearch,
    isRunningLexicalCitationLookup,
    setIsRunningLexicalCitationLookup,
    isRunningLexicalOverview,
    setIsRunningLexicalOverview,
    semanticSearchQuery,
    setSemanticSearchQuery,
    semanticSearchMaxResults,
    setSemanticSearchMaxResults,
    semanticMinScore,
    setSemanticMinScore,
    semanticMinScoreMode,
    setSemanticMinScoreMode,
    semanticUseRagContext,
    setSemanticUseRagContext,
    semanticExcludeLexicalDuplicates,
    setSemanticExcludeLexicalDuplicates,
    semanticSearchLastRagContext,
    setSemanticSearchLastRagContext,
    semanticOverviewLastRagContext,
    setSemanticOverviewLastRagContext,
    semanticSearchIndexes,
    setSemanticSearchIndexes,
    selectedSemanticSearchIndexId,
    setSelectedSemanticSearchIndexId,
    isLoadingSemanticSearchIndexes,
    setIsLoadingSemanticSearchIndexes,
    isRunningSemanticSearch,
    setIsRunningSemanticSearch,
    semanticOverviewTerm,
    setSemanticOverviewTerm,
    semanticOverviewMaxResults,
    setSemanticOverviewMaxResults,
    selectedSemanticOverviewSourceIds,
    setSelectedSemanticOverviewSourceIds,
    isRunningSemanticOverview,
    setIsRunningSemanticOverview,
    verbeteSearchAuthor,
    setVerbeteSearchAuthor,
    verbeteSearchTitle,
    setVerbeteSearchTitle,
    verbeteSearchArea,
    setVerbeteSearchArea,
    verbeteSearchText,
    setVerbeteSearchText,
    verbeteSearchMaxResults,
    setVerbeteSearchMaxResults,
    isRunningVerbeteSearch,
    setIsRunningVerbeteSearch,
    verbetografiaTitle,
    setVerbetografiaTitle,
    verbetografiaSpecialty,
    setVerbetografiaSpecialty,
    isRunningVerbetografiaOpenTable,
    setIsRunningVerbetografiaOpenTable,
    isRunningVerbetografiaOpenTableWord,
    setIsRunningVerbetografiaOpenTableWord,
    isRunningVerbeteDefinologia,
    setIsRunningVerbeteDefinologia,
    isRunningVerbeteFraseEnfatica,
    setIsRunningVerbeteFraseEnfatica,
    isRunningVerbeteSinonimologia,
    setIsRunningVerbeteSinonimologia,
    isRunningVerbeteFatologia,
    setIsRunningVerbeteFatologia,
  };
};


