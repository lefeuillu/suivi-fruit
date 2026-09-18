import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Email technique unique utilisé par tout le monde en coulisses.
// La personne qui utilise l'app ne voit et ne tape jamais cet email :
// seul le mot de passe lui est demandé.
export const TEAM_EMAIL = "equipe@suivi-fruits.local";
