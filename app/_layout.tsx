import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'nativewind'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import '../global.css';

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme(); 
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('user-theme');
        
        if (savedTheme === 'dark' || savedTheme === 'light') {
         
          setColorScheme(savedTheme);
        } else {

          setColorScheme('dark'); 
        }
      } catch (error) {
        console.log('Erro ao carregar tema:', error);
      }
    };

    loadTheme();
  }, []);
 

  useEffect(() => {

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });


    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated === null) return; 


    const inLoginScreen = segments[0] === 'login';
    const inSignUpScreen = segments[0] === 'signup';

    if (!isAuthenticated) {
      if (!inLoginScreen && !inSignUpScreen) {
        router.replace('/login');
      }
    } else {
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