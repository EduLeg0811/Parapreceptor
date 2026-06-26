import { NO_VECTOR_STORE_ID } from "./constants";

export const BOOK_SOURCE = [
  { label: "Básicos: Nossa Evolução, O que é a Conscienciologia", id: "vs_69bb0db9d3548191adb0eeb435c95f54" },
  { label: "Conscienciograma", id: "vs_69bb10fdfa208191bdad6c97ecc48c57" },
  { label: "Manuais: Tenepes, Proéxis, Dupla", id: "vs_69bb0cf2a1b881918932390d13f8d6da" },
  { label: "700 Experimentos da Conscienciologia", id: "vs_69bb0d959ffc819189a3c24f2ebb2d1c" },
  { label: "Projeciologia", id: "vs_69bb0e0c6404819198424a86b887358f" },
  { label: "Homo sapiens: HSR, HSP", id: "vs_69bb0e57ec1c8191bb9da3760410d225" },
  { label: "Dicionário de Argumentos da Conscienciologia (DAC)", id: "vs_69bb116a458c8191bb52fad036476e8a" },
  { label: "Léxico de Ortopensatas (LO)", id: "vs_69bb11928ff08191b24e3e35a93b4d5b" },
] as const;

export const VECTOR_STORES_SOURCE = [
  { label: "None", id: NO_VECTOR_STORE_ID },
  { label: "WVBooks", id: "vs_6912908250e4819197e23fe725e04fae" },
  { label: "Verbetes Waldo Vieira", id: "vs_699d09de9ca48191b63fbbd4d195a696" },
  { label: "Blog Tert", id: "vs_6928989410dc8191bd9a838eb38876b7" },
  { label: "Mini", id: "vs_692890daa4248191afd3cf04a0c51ad5" },
  { label: "EduNotes", id: "vs_68f195fdeda08191815ec795ba1f57ba" },
  { label: "Revistas", id: "vs_69289c64b8308191806dcdd5856426d9" },
  { label: "Autores", id: "vs_692894b455188191a900282a80e16a44" },
] as const;

export const DEFAULT_BOOK_SOURCE_ID = VECTOR_STORES_SOURCE.find((item) => item.label.toUpperCase() === "WVBOOKS")?.id ?? "";

export const MACRO1_HIGHLIGHT_COLORS = [
  { id: "yellow", label: "Amarelo", swatch: "#fef08a" },
  { id: "green", label: "Verde", swatch: "#86efac" },
  { id: "cyan", label: "Ciano", swatch: "#a5f3fc" },
  { id: "magenta", label: "Magenta", swatch: "#f5d0fe" },
  { id: "blue", label: "Azul", swatch: "#bfdbfe" },
  { id: "red", label: "Vermelho", swatch: "#fecaca" },
] as const;

export const TRANSLATE_LANGUAGE_OPTIONS = [
  { value: "Ingles", label: "Ingles" },
  { value: "Espanhol", label: "Espanhol" },
  { value: "Frances", label: "Frances" },
  { value: "Alemao", label: "Alemao" },
  { value: "Italiano", label: "Italiano" },
  { value: "Portugues", label: "Portugues" },
  { value: "Mandarim", label: "Mandarim" },
  { value: "Japones", label: "Japones" },
  { value: "Arabe", label: "Arabe" },
  { value: "Russo", label: "Russo" },
] as const;

export const DEFAULT_SELECTED_REF_BOOK = "LO";
