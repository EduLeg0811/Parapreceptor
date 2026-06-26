import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SourceBlockCheckboxList from "@/features/ghost-writer/components/common/SourceBlockCheckboxList";
import SourceRadioList from "@/features/ghost-writer/components/common/SourceRadioList";

describe("source selection controls", () => {
  it("renders a shared radio list and emits the selected id", () => {
    const onChange = vi.fn();

    render(
      <SourceRadioList
        name="source-radio"
        items={[
          { id: "lo", label: "LO" },
          { id: "dac", label: "DAC" },
        ]}
        selectedId="lo"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("radio", { name: "LO" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "DAC" }));
    expect(onChange).toHaveBeenCalledWith("dac");
  });

  it("expands a source block checkbox to all child ids", () => {
    const onToggleItem = vi.fn();

    render(
      <SourceBlockCheckboxList
        groups={[
          {
            title: "Manuais",
            items: [
              { id: "tnp", label: "Tenepes" },
              { id: "proexis", label: "Proexis" },
              { id: "dupla", label: "Dupla" },
            ],
          },
        ]}
        selectedIds={[]}
        onToggleItem={onToggleItem}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /manuais: tenepes, proexis, dupla/i }));

    expect(onToggleItem).toHaveBeenCalledTimes(3);
    expect(onToggleItem).toHaveBeenNthCalledWith(1, "tnp", true);
    expect(onToggleItem).toHaveBeenNthCalledWith(2, "proexis", true);
    expect(onToggleItem).toHaveBeenNthCalledWith(3, "dupla", true);
  });
});
