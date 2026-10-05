// iOS / Android : `localStorage` adossé à SQLite, dans lequel Supabase conserve la session.
// Version web : session-storage.web.ts (le navigateur a déjà son propre localStorage).
import 'expo-sqlite/localStorage/install';

export const sessionStorage = localStorage;
