import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = 'https://moojuqphvhrhasxhaahd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vb2p1cXBodmhyaGFzeGhhYWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDExMzEsImV4cCI6MjA3MjYxNzEzMX0.GR3YIs0QWsZP3Rdvw_-vCOPVtH2KCaoVO2pKeo1-WPs';

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type SupabaseClient = typeof supabaseClient;
