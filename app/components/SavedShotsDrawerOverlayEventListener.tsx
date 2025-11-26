import { useEffect } from "react";

export default function SavedShotsDrawerOverlayEventListener({ onClearSelection }: { onClearSelection: (ids: string[]) => void }) {
  useEffect(() => {
    window.addEventListener("shots-cleared", (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        onClearSelection(e.detail);
      }
    });
    return () => {
      window.removeEventListener("shots-cleared", () => {});
    };
  }, [onClearSelection]);
  return null;
}