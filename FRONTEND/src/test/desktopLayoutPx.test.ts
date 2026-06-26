import { describe, expect, it } from "vitest";
import { getDesktopMinimumContentWidthPx, getRightPanelWidthPx } from "@/features/ghost-writer/utils/layout/desktopLayoutPx";

describe("desktopLayoutPx", () => {
  it("lets right fill the remaining width with only left visible", () => {
    expect(getRightPanelWidthPx({
      containerWidthPx: 1400,
      leftWidthPx: 250,
      parameterWidthPx: 300,
      editorWidthPx: 400,
      jsonWidthPx: 200,
      hasCenterPanel: false,
      hasEditorPanel: false,
      hasJsonPanel: false,
      rightMinPx: 300,
    })).toBe(1134);
  });

  it("shrinks right when parameters, editor and json are visible", () => {
    expect(getRightPanelWidthPx({
      containerWidthPx: 1400,
      leftWidthPx: 250,
      parameterWidthPx: 300,
      editorWidthPx: 400,
      jsonWidthPx: 200,
      hasCenterPanel: true,
      hasEditorPanel: true,
      hasJsonPanel: true,
      rightMinPx: 300,
    })).toBe(300);
  });

  it("keeps right at min when fixed panels exceed the viewport", () => {
    expect(getRightPanelWidthPx({
      containerWidthPx: 900,
      leftWidthPx: 250,
      parameterWidthPx: 300,
      editorWidthPx: 400,
      jsonWidthPx: 200,
      hasCenterPanel: true,
      hasEditorPanel: true,
      hasJsonPanel: true,
      rightMinPx: 300,
    })).toBe(300);
  });

  it("computes the minimum desktop content width for overflow handling", () => {
    expect(getDesktopMinimumContentWidthPx({
      leftWidthPx: 250,
      parameterWidthPx: 300,
      editorWidthPx: 400,
      jsonWidthPx: 200,
      hasCenterPanel: true,
      hasEditorPanel: true,
      hasJsonPanel: true,
      rightMinPx: 300,
    })).toBe(1490);
  });
});

