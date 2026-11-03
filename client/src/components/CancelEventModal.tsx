import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import type { Event } from "../types";

export default function CancelEventModal({ event, onCancel, onConfirm }: {
  event: Event; onCancel: () => void; onConfirm: (scope: "OCCURRENCE" | "SERIES") => Promise<void>;
}) {
  const [scope, setScope] = useState<"OCCURRENCE" | "SERIES">(event.cancelledAt ? "SERIES" : "OCCURRENCE");
  return <ConfirmDialog title={scope === "SERIES" ? "Cancel recurring series?" : "Cancel event?"} confirmLabel="Confirm cancellation" danger onCancel={onCancel}
    action={() => onConfirm(scope)} message={<div className="space-y-4">
      <p>Cancel <strong>{event.name}</strong>? Its page and discussion will remain available. Registration and reminders will stop, and confirmed attendees will be notified. Cancellation is permanent.</p>
      {event.isRecurring && !event.recurrenceStopped && <div className="space-y-2">
        <label className="flex gap-2"><input type="radio" name="cancel-scope" checked={scope === "OCCURRENCE"} disabled={!!event.cancelledAt} onChange={() => setScope("OCCURRENCE")} />Only this occurrence; later occurrences continue</label>
        <label className="flex gap-2"><input type="radio" name="cancel-scope" checked={scope === "SERIES"} onChange={() => setScope("SERIES")} />Cancel all upcoming/ongoing occurrences and stop the series</label>
      </div>}
    </div>} />;
}
