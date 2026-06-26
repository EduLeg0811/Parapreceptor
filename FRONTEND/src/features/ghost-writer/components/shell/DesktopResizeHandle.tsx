import { useCallback, useEffect, useRef } from "react";
import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from "react";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

interface DesktopResizeHandleProps extends HTMLAttributes<HTMLDivElement> {
  onResizeDelta: (deltaX: number) => void;
}

const DesktopResizeHandle = ({ className, onResizeDelta, ...props }: DesktopResizeHandleProps) => {
  const cleanupRef = useRef<(() => void) | null>(null);

  const cleanupListeners = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => cleanupListeners, [cleanupListeners]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    let previousClientX = event.clientX;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - previousClientX;
      if (deltaX !== 0) {
        onResizeDelta(deltaX);
        previousClientX = moveEvent.clientX;
      }
    };

    const handlePointerUp = () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      cleanupRef.current = null;
    };

    cleanupRef.current = handlePointerUp;

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }, [onResizeDelta]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={handlePointerDown}
      className={cn(
        "relative flex w-2 shrink-0 cursor-col-resize touch-none items-center justify-center bg-transparent",
        className,
      )}
      {...props}
    >
      <div className="h-full w-px bg-border" />
      <div className="absolute z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    </div>
  );
};

export default DesktopResizeHandle;
