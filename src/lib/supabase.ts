import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const clavePublica = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !clavePublica) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_KEY. Copia .env.example como .env y llénalo.',
  );
}

/** Cliente de Supabase. Usa solo la clave pública: la seguridad la ponen las reglas RLS de la base de datos. */
export const supabase = createClient<Database>(url, clavePublica, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renueva la sesión solo mientras la app está abierta en pantalla.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
