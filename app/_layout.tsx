import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import '../global.css';

export default function RootLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

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

    const inAuthGroup = segments[0] === '(tabs)';
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
