import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OverviewSearchPanel from "@/features/ghost-writer/components/search/OverviewSearchPanel";

const renderPanel = (selectedSourceIds: string[] = []) => {
  const onToggleSource = vi.fn();
  render(
    <OverviewSearchPanel
      title="Lexical Overview"
      description="Busca em bases"
      term=""
      maxResults={10}
      selectedSourceIds={selectedSourceIds}
      onToggleSource={onToggleSource}
      onTermChange={vi.fn()}
      onMaxResultsChange={vi.fn()}
      onRunSearch={vi.fn()}
      isRunning={false}
      showPanelChrome={false}
    />,
  );
  return { onToggleSource };
};

describe("OverviewSearchPanel source blocks", () => {
  it("selects all sources in a block from one checkbox", () => {
    const { onToggleSource } = renderPanel([]);

    fireEvent.click(screen.getByRole("checkbox", { name: /manuais: tenepes, proexis, dupla/i }));

    expect(onToggleSource).toHaveBeenCalledTimes(3);
    expect(onToggleSource).toHaveBeenNthCalledWith(1, "tnp", true);
    expect(onToggleSource).toHaveBeenNthCalledWith(2, "proexis", true);
    expect(onToggleSource).toHaveBeenNthCalledWith(3, "dupla", true);
  });

  it("unselects all sources in a selected block from one checkbox", () => {
    const { onToggleSource } = renderPanel(["tnp", "proexis", "dupla"]);

    fireEvent.click(screen.getByRole("checkbox", { name: /manuais: tenepes, proexis, dupla/i }));

    expect(onToggleSource).toHaveBeenCalledTimes(3);
    expect(onToggleSource).toHaveBeenNthCalledWith(1, "tnp", false);
    expect(onToggleSource).toHaveBeenNthCalledWith(2, "proexis", false);
    expect(onToggleSource).toHaveBeenNthCalledWith(3, "dupla", false);
  });
});
