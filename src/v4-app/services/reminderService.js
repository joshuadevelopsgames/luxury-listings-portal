/** Reminder service stub for V4 — V3 reminder features can be re-implemented later. */
export const reminderService = {
  getReminders: async () => [],
  setReminder: async () => ({ success: true }),
  clearReminder: async () => ({ success: true }),
  checkDueReminders: async () => [],
};
export default reminderService;
