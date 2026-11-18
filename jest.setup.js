// Variables de prueba para que el cliente de Supabase se pueda importar en los tests.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://prueba.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_KEY = 'sb_publishable_prueba';

// El almacenamiento del celular no existe en las pruebas: se usa el simulado de la librería.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
