import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useSettings() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const router = useRouter();

  const isDark = colorScheme === 'dark';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const openPortfolio = () => {
    Linking.openURL('https://johnrodrigues.xyz');
  };

  const handleToggleTheme = async () => {
    const newTheme = isDark ? 'light' : 'dark';
    
    setColorScheme(newTheme);
    
    try {
      await AsyncStorage.setItem('user-theme', newTheme);
    } catch (e) {
      console.error(e);
    }
  };

  return {
    isDark,
    handleToggleTheme,
    handleSignOut,
    openPortfolio
  };
}