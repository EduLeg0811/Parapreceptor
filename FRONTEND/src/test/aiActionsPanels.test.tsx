import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ParameterPanelToolbar from "@/features/ghost-writer/components/parameters/ParameterPanelToolbar";
import AiActionsParameterSection from "@/features/ghost-writer/components/parameters/AiActionsParameterSection";

const buildSectionProps = () => ({
  section: "actions" as const,
  actionId: null,
  actionText: "",
  aiCommandQuery: "",
  translateLanguage: "Ingles" as const,
  isLoading: false,
  hasDocumentOpen: true,
  onActionTextChange: vi.fn(),
  onAiCommandQueryChange: vi.fn(),
  onTranslateLanguageChange: vi.fn(),
  onRetrieveSelectedText: vi.fn(),
  onApplyAction: vi.fn(),
});

describe("AI actions panels", () => {
  it("uses the command toolbar button inside Customized Prompts without a dedicated panel", () => {
    const onOpenAiActionParameters = vi.fn();

    render(
      <ParameterPanelToolbar
        parameterPanelTarget={{ section: "customized_prompts", id: "ai_command" }}
        isLoading={false}
        isTermsConceptsConscienciografiaEnabled={false}
        onToggleAiActionsConfig={vi.fn()}
        onToggleTermsConceptsConscienciografia={vi.fn()}
        onOpenAiActionParameters={onOpenAiActionParameters}
        onSelectVerbetografiaAction={vi.fn()}
        onRunAppAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /comando ia/i }));

    expect(onOpenAiActionParameters).toHaveBeenCalledTimes(1);
    expect(onOpenAiActionParameters).toHaveBeenCalledWith("ai_command");
  });

  it("shows translate first and consulta dict second in the translation toolbar", () => {
    render(
      <ParameterPanelToolbar
        parameterPanelTarget={{ section: "translation", id: "translate" }}
        isLoading={false}
        isTermsConceptsConscienciografiaEnabled={false}
        onToggleAiActionsConfig={vi.fn()}
        onToggleTermsConceptsConscienciografia={vi.fn()}
        onOpenAiActionParameters={vi.fn()}
        onSelectVerbetografiaAction={vi.fn()}
        onRunAppAction={vi.fn()}
      />,
    );

    const translateButton = screen.getByRole("button", { name: /^traduzir\b/i });
    const dictButton = screen.getByRole("button", { name: /^dicion/i });

    expect(translateButton.compareDocumentPosition(dictButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps Termos & Conceitos only with lexicologia actions", () => {
    render(
      <ParameterPanelToolbar
        parameterPanelTarget={{ section: "actions", id: null }}
        isLoading={false}
        isTermsConceptsConscienciografiaEnabled={false}
        onToggleAiActionsConfig={vi.fn()}
        onToggleTermsConceptsConscienciografia={vi.fn()}
        onOpenAiActionParameters={vi.fn()}
        onSelectVerbetografiaAction={vi.fn()}
        onRunAppAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^defin/i })).toBeInTheDocument();
    const synonymsButton = screen.getByRole("button", { name: /^sinon/i });
    const antonymsButton = screen.getByRole("button", { name: /^anton/i });
    expect(screen.getByRole("button", { name: /^etimologia\b/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^cognatos\b/i })).toBeInTheDocument();
    expect(synonymsButton.compareDocumentPosition(antonymsButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows the Conscienciografia pill in Termos & Conceitos", () => {
    render(
      <ParameterPanelToolbar
        parameterPanelTarget={{ section: "actions", id: null }}
        isLoading={false}
        isTermsConceptsConscienciografiaEnabled={true}
        onToggleAiActionsConfig={vi.fn()}
        onToggleTermsConceptsConscienciografia={vi.fn()}
        onOpenAiActionParameters={vi.fn()}
        onSelectVerbetografiaAction={vi.fn()}
        onRunAppAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /conscienciografia/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /conscienciografia/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the Conscienciografia pill in Traducao & Dicionario", () => {
    render(
      <ParameterPanelToolbar
        parameterPanelTarget={{ section: "translation", id: "translate" }}
        isLoading={false}
        isTermsConceptsConscienciografiaEnabled={true}
        onToggleAiActionsConfig={vi.fn()}
        onToggleTermsConceptsConscienciografia={vi.fn()}
        onOpenAiActionParameters={vi.fn()}
        onSelectVerbetografiaAction={vi.fn()}
        onRunAppAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /conscienciografia/i })).toBeInTheDocument();
  });

  it("shows the Conscienciografia pill in Customized Prompts", () => {
    render(
      <ParameterPanelToolbar
        parameterPanelTarget={{ section: "customized_prompts", id: "analogies" }}
        isLoading={false}
        isTermsConceptsConscienciografiaEnabled={true}
        onToggleAiActionsConfig={vi.fn()}
        onToggleTermsConceptsConscienciografia={vi.fn()}
        onOpenAiActionParameters={vi.fn()}
        onSelectVerbetografiaAction={vi.fn()}
        onRunAppAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /conscienciografia/i })).toBeInTheDocument();
  });

  it("shows the AI config button when consulta dict is selected", () => {
    render(
      <ParameterPanelToolbar
        parameterPanelTarget={{ section: "translation", id: "dict_lookup" }}
        isLoading={false}
        isTermsConceptsConscienciografiaEnabled={false}
        onToggleAiActionsConfig={vi.fn()}
        onToggleTermsConceptsConscienciografia={vi.fn()}
        onOpenAiActionParameters={vi.fn()}
        onSelectVerbetografiaAction={vi.fn()}
        onRunAppAction={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/configura/i)).toBeInTheDocument();
  });

  it("shows the shared import and text area before an AI action is selected", () => {
    render(<AiActionsParameterSection {...buildSectionProps()} />);

    expect(screen.getByRole("button", { name: /select & import/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows the command form when Comando IA is selected in Customized Prompts", () => {
    render(
      <AiActionsParameterSection
        {...buildSectionProps()}
        section="customized_prompts"
        actionId="ai_command"
        aiCommandQuery="Teste"
      />,
    );

    expect(screen.getByText("Query")).toBeInTheDocument();
    const submitButton = screen.getByRole("button", { name: /comando ia/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton.className).toContain("border-green-300");
  });

  it("renders dicionarios without language select in the action panel", () => {
    render(
      <AiActionsParameterSection
        {...buildSectionProps()}
        section="translation"
        actionId="dict_lookup"
        actionText="casa"
        isConfigOpen={true}
      />,
    );

    expect(screen.getByRole("button", { name: /dicion/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("casa")).toBeInTheDocument();
    expect(screen.queryByText(/idioma/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/system prompt/i)).not.toBeInTheDocument();
  });

  it("keeps AI config out of the action renderer", () => {
    render(
      <AiActionsParameterSection
        {...buildSectionProps()}
        section="translation"
        actionId="translate"
        actionText="texto"
      />,
    );

    expect(screen.queryByDisplayValue("CONS PROMPT")).not.toBeInTheDocument();
  });

  it("renders the green action button after the text input area", () => {
    render(
      <AiActionsParameterSection
        {...buildSectionProps()}
        section="actions"
        actionId="rewrite"
        actionText="Texto base"
      />,
    );

    const textarea = screen.getByDisplayValue("Texto base");
    const submitButton = screen.getByRole("button", { name: /reescrever/i });

    expect(textarea.compareDocumentPosition(submitButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

