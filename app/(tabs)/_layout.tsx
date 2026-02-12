import { Tabs } from 'expo-router';
import { Calendar, Home, Settings, Users } from 'lucide-react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { View, Text, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';

export default function TabLayout() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const { colorScheme } = useColorScheme();
  
  const isDark = colorScheme === 'dark';

  useFocusEffect(
    useCallback(() => {
      checkUserDepartment();
    }, [])
  );

  const checkUserDepartment = async () => {
    try {
      console.log('--- INICIANDO VERIFICAÇÃO DE MEMBRO ---');
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User ID:', user?.id);
      
      if (!user) {
        console.log('Usuário não encontrado');
        setIsChecking(false);
        return;
      }

      const { data, error } = await supabase
        .from('department_members')
        .select('*')
        .eq('user_id', user.id);

      console.log('Erro Supabase:', error);
      console.log('Dados encontrados:', data);
      console.log('Quantidade:', data?.length);
      console.log('--- FIM DA VERIFICAÇÃO ---');

      if (error) {
        console.error('Erro na query:', error);
        setIsChecking(false);
        return;
      }

      if (!data || data.length === 0) {
        console.log('Nenhum membro encontrado - Redirecionando para onboarding');
        setIsChecking(false);
        router.replace('/onboarding');
      } else {
        console.log('Membro encontrado - Permitindo acesso');
        setIsChecking(false);
      }
    } catch (error) {
      console.error('Erro ao verificar departamento do usuário:', error);
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-500 dark:text-zinc-400 mt-2">Verificando...</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6', // Azul padrão
        tabBarInactiveTintColor: isDark ? '#a1a1aa' : '#6b7280', // Zinc-400 vs Gray-500
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#18181b' : '#ffffff', // Zinc-900 vs White
          borderTopColor: isDark ? '#27272a' : '#e5e7eb', // Zinc-800 vs Gray-200
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendário',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="departments"
        options={{
          title: 'Departamentos',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="departments/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="departments/member-list"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings/schedule"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configurações',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}