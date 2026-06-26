/**
 * Centralizador de cores de fundo do projeto.
 *
 * Objetivo:
 * - Manter em um único ponto os valores de background usados nos principais blocos da interface.
 * - Facilitar ajustes visuais globais sem precisar "caçar" classes em múltiplos componentes.
 *
 * Como usar:
 * - Em componentes com classes utilitárias (Tailwind), use as constantes `*BgClass`.
 *
 * Observação:
 * - Este arquivo apenas define constantes.
 * - A adoção dessas constantes nos componentes pode ser feita gradualmente.
 */

/**
 * Scroll Area do Histórico (Viewport)
 * Referência atual no projeto: `bg-gray-50`.
 * Ajuste aqui caso deseje clarear/escurecer o fundo padrão de áreas com scroll.
 */
export const scrollAreaViewportBgClass = "bg-gray-50";

/**
 * Painéis principais (Left, Right, Parameters, Histórico)
 * Use um mesmo fundo para manter consistência visual entre as colunas/painéis.
 */
export const panelsBgClass = "bg-white";

/**
 * Barras de menu no topo dos painéis
 * Área de cabeçalho/toolbar superior dos painéis (faixa horizontal no topo).
 * Mantida separada do fundo do painel para permitir contraste e hierarquia visual.
 */
export const panelsTopMenuBarBgClass = "bg-blue-50";

/**
 * Cards (blocos de conteúdo)
 * Fundo padrão para cartões internos, priorizando legibilidade e contraste com áreas externas.
 */
export const cardsBgClass = "bg-white";

/**
 * Seção "Aplicativos IA"
 * Valor dedicado para permitir destaque visual independente dos painéis gerais.
 */
export const aiAppsSectionBgClass = "bg-gray-50";


/**
 * Botão "Upload de Documento"
 */
export const uploadDocBgClass = "bg-green-50";

/**
 * Seção "Fundo Chat"
 * Valor dedicado para permitir destaque visual independente dos painéis gerais.
 */
export const chatSectionBgClass = "bg-blue-50";

/**
 * Botões - fundos por contexto
 * Separados para facilitar ajuste de identidade visual sem alterar estrutura dos botões.
 */
export const buttonsPrimaryBgClass = "bg-green-50";
export const buttonsPrimarySolidBgClass = "bg-green-300";

export const buttonsSecondaryBgClass = "bg-white";

export const buttonsGhostBgClass = "bg-transparent";
