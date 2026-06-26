import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SystemConfirmationDialog = {
  title: string;
  description: string;
};

type SystemConfirmationContextValue = {
  requestSystemConfirmation: (dialog: SystemConfirmationDialog) => Promise<boolean>;
};

const SystemConfirmationContext = createContext<SystemConfirmationContextValue | null>(null);

export const SystemConfirmationProvider = ({ children }: { children: ReactNode }) => {
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [dialog, setDialog] = useState<SystemConfirmationDialog | null>(null);

  const resolveConfirmation = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const requestSystemConfirmation = useCallback((nextDialog: SystemConfirmationDialog): Promise<boolean> => {
    resolverRef.current?.(false);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog(nextDialog);
    });
  }, []);

  return (
    <SystemConfirmationContext.Provider value={{ requestSystemConfirmation }}>
      {children}
      <AlertDialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) resolveConfirmation(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog?.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialog?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolveConfirmation(false)}>No</AlertDialogCancel>
            <AlertDialogAction onClick={() => resolveConfirmation(true)}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SystemConfirmationContext.Provider>
  );
};

export const useSystemConfirmation = () => {
  const context = useContext(SystemConfirmationContext);
  if (!context) {
    throw new Error("useSystemConfirmation must be used inside SystemConfirmationProvider.");
  }
  return context;
};
