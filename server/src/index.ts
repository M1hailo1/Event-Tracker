import "dotenv/config";
import app from "./app";
import { sendDueEventReminders } from "./utils/eventReminders";
import { cleanupOldNotifications } from "./utils/notificationCleanup";

const PORT = process.env.PORT || 3000;

const REMINDER_CHECK_INTERVAL_MS = 15 * 60 * 1000;

app.listen(PORT, () => {
  console.log("Server is running on PORT:", PORT);

  sendDueEventReminders().catch((err) =>
    console.error("Event reminder check failed:", err),
  );
  cleanupOldNotifications().catch((err) =>
    console.error("Notification cleanup failed:", err),
  );
  setInterval(() => {
    sendDueEventReminders().catch((err) =>
      console.error("Event reminder check failed:", err),
    );
    cleanupOldNotifications().catch((err) =>
      console.error("Notification cleanup failed:", err),
    );
  }, REMINDER_CHECK_INTERVAL_MS);
});
