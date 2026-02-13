import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'nativewind'; // <--- Importante para o tema
import AsyncStorage from '@react-native-async-storage/async-storage'; // <--- Importante para salvar
import '../global.css';

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme(); // Hook do tema
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  // --- NOVO: Carregar o Tema Salvo ao Iniciar ---
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('user-theme');
        
        if (savedTheme === 'dark' || savedTheme === 'light') {
          // Se o usuário já escolheu antes, usa a escolha dele
          setColorScheme(savedTheme);
        } else {
          // Se é a primeira vez (ou limpou dados), força DARK
          setColorScheme('dark'); 
        }
      } catch (error) {
        console.log('Erro ao carregar tema:', error);
      }
    };

    loadTheme();
  }, []);
  // ----------------------------------------------

  useEffect(() => {
    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated === null) return; // Aguardar verificação inicial


    const inLoginScreen = segments[0] === 'login';
    const inSignUpScreen = segments[0] === 'signup';

    if (!isAuthenticated) {
      // Não autenticado - redirecionar para login se não estiver em login ou signup
      if (!inLoginScreen && !inSignUpScreen) {
        router.replace('/login');
      }
    } else {
      // Autenticado - redirecionar para tabs se estiver na tela de login ou signup
      if (inLoginScreen || inSignUpScreen) {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colorScheme === 'dark' ? '#09090b' : '#f9fafb' }
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="create-roster" />
      <Stack.Screen name="department-settings" />
    </Stack>
  );
}