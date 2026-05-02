// ============================================================
// Police Fédérale Liège City RP — Configuration Supabase
// Ne pas exposer ce fichier publiquement.
// La clé anon Supabase est conçue côté client mais
// protégez vos données avec des politiques RLS dans Supabase.
// ============================================================

const SUPABASE_URL = 'https://gktawbaposndfxijkxdk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdGF3YmFwb3NuZGZ4aWpreGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzUyNDUsImV4cCI6MjA3OTY1MTI0NX0.tY-CHuyb2zr9s6hlGkwmrdTvg920VVNghI9S45CjwKk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } }
});
