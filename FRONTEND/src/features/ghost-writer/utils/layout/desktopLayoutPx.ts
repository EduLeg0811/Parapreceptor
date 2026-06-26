import { DESKTOP_CONTENT_EDGE_GUTTER_PX, DESKTOP_RESIZE_HANDLE_WIDTH_PX } from "@/features/ghost-writer/config/constants";

export type DesktopFixedPanelWidthsPx = {
  left: number;
  parameter: number;
  editor: number;
  json: number;
};

export type DesktopResizablePanelKey = keyof DesktopFixedPanelWidthsPx;

interface GetRightPanelWidthPxParams {
  containerWidthPx: number;
  leftWidthPx: number;
  parameterWidthPx: number;
  editorWidthPx: number;
  jsonWidthPx: number;
  hasCenterPanel: boolean;
  hasEditorPanel: boolean;
  hasJsonPanel: boolean;
  rightMinPx: number;
}

export const clampToMin = (widthPx: number, minPx: number) => Math.max(minPx, Math.round(widthPx));

const getDesktopResizeHandleCount = ({
  hasCenterPanel,
  hasEditorPanel,
  hasJsonPanel,
}: Pick<GetRightPanelWidthPxParams, "hasCenterPanel" | "hasEditorPanel" | "hasJsonPanel">) => (
  1
  + (hasCenterPanel ? 1 : 0)
  + (hasEditorPanel ? 1 : 0)
  + (hasJsonPanel ? 1 : 0)
);

export const getRightPanelWidthPx = ({
  containerWidthPx,
  leftWidthPx,
  parameterWidthPx,
  editorWidthPx,
  jsonWidthPx,
  hasCenterPanel,
  hasEditorPanel,
  hasJsonPanel,
  rightMinPx,
}: GetRightPanelWidthPxParams) => {
  const resizeHandlesWidthPx = getDesktopResizeHandleCount({ hasCenterPanel, hasEditorPanel, hasJsonPanel }) * DESKTOP_RESIZE_HANDLE_WIDTH_PX;
  const fixedWidthPx = leftWidthPx
    + (hasCenterPanel ? parameterWidthPx : 0)
    + (hasEditorPanel ? editorWidthPx : 0)
    + (hasJsonPanel ? jsonWidthPx : 0)
    + resizeHandlesWidthPx
    + DESKTOP_CONTENT_EDGE_GUTTER_PX;

  return Math.max(rightMinPx, containerWidthPx - fixedWidthPx);
};

export const getDesktopMinimumContentWidthPx = ({
  leftWidthPx,
  parameterWidthPx,
  editorWidthPx,
  jsonWidthPx,
  hasCenterPanel,
  hasEditorPanel,
  hasJsonPanel,
  rightMinPx,
}: Omit<GetRightPanelWidthPxParams, "containerWidthPx">) => {
  const resizeHandlesWidthPx = getDesktopResizeHandleCount({ hasCenterPanel, hasEditorPanel, hasJsonPanel }) * DESKTOP_RESIZE_HANDLE_WIDTH_PX;

  return leftWidthPx
    + (hasCenterPanel ? parameterWidthPx : 0)
    + (hasEditorPanel ? editorWidthPx : 0)
    + (hasJsonPanel ? jsonWidthPx : 0)
    + rightMinPx
    + resizeHandlesWidthPx
    + DESKTOP_CONTENT_EDGE_GUTTER_PX;
};
