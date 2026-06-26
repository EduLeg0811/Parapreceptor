import { buttonsPrimaryBgClass, buttonsSecondaryBgClass } from "@/styles/backgroundColors";

// ============================================================================
// CONFIGURACAO DESTACADA: tipo visual dos botoes de navegacao/selecao de paineis.
// Valores: "icone" remove apenas a moldura dos botoes; "botao" mantem o layout atual.
// ============================================================================
export const TIPO_BOTAO_NAVEGA: "icone" | "botao" = "icone";

export const primaryActionButtonClass =
  `h-9 w-full rounded-lg border border-green-300 ${buttonsPrimaryBgClass} px-3 text-sm font-medium text-green-900 shadow-sm ` +
  "transition-colors hover:bg-green-100 hover:border-green-400 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/30 focus-visible:ring-offset-1 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const sectionActionButtonClass =
  `h-auto w-full items-start justify-start whitespace-normal rounded-lg border border-border ${buttonsSecondaryBgClass} px-3 py-2 text-left shadow-sm ` +
  "transition-colors hover:bg-muted/60 hover:border-primary/30 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const navigationSelectionButtonClass = (extraClass = "") => (
  TIPO_BOTAO_NAVEGA === "icone"
    ? `${sectionActionButtonClass} border-transparent bg-transparent shadow-none hover:border-transparent hover:bg-blue-50/60 ${extraClass}`
    : `${sectionActionButtonClass} ${extraClass}`
);

export const navigationSelectionTitleClass = (selected = false) => (
  `block break-words text-sm font-medium ${selected ? "text-blue-600" : "text-foreground"}`
);
