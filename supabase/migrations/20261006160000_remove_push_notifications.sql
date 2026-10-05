-- Retrait des notifications push (phase 7) : expo-notifications fait planter l'app dans Expo Go et
-- le club n'a pas encore de build. Les emails transactionnels (email_log) sont conservés.
--
-- Supprime les appareils, les préférences, le journal des envois et le paramètre général
-- push_notifications_enabled (la page Paramètres du back-office reste, vide pour l'instant).
-- Le code reste dans l'historique git (migrations 20261006130000 et 20261006150000).

drop table public.push_tokens;
drop table public.notification_preferences;
drop table public.notification_log;
drop function public.register_push_token(text, text);
drop type public.notification_category;

drop table public.app_settings;
drop function public.set_updated_by();
