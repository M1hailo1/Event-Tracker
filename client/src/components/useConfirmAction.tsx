import { useState } from "react";
import { ConfirmDialog, type Confirmation } from "./ConfirmDialog";

export function useConfirmAction() {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  return { confirm: setConfirmation, confirmationDialog: confirmation && <ConfirmDialog {...confirmation} onCancel={() => setConfirmation(null)} /> };
}
