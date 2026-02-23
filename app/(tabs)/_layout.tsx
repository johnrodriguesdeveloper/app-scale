import { Tabs } from 'expo-router';
import { Calendar, Home, Settings, Users } from 'lucide-react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsChecking(false);
        return;
      }

      const { data, error } = await supabase
        .from('department_members')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        setIsChecking(false);
        return;
      }

      if (!data || data.length === 0) {
        setIsChecking(false);
        router.replace('/onboarding');
      } else {
        setIsChecking(false);
      }
    } catch (error) {
      console.error('Erro ao verificar departamento:', error);
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

  // Cor das divisórias (ajusta conforme o tema)
  const dividerColor = isDark ? '#27272a' : '#e5e7eb'; // zinc-800 ou gray-200

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: isDark ? '#52525b' : '#9ca3af',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#18181b' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: dividerColor,
          height: 85, // Mantém a altura total da barra
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 8,
          // ❌ Sem paddingBottom aqui
        },
        // Opcional: Você pode tentar empurrar todos os ícones de uma vez aqui
        tabBarIconStyle: {
          marginBottom: 15, // Ajuste esse valor para subir os ícones o quanto precisar
        }
      }}
    >
      {/* 1. HOME */}
      <Tabs.Screen
        name="index"
        options={{
          // Ícone maior (size 30)
          tabBarIcon: ({ color }) => <Home size={30} color={color} />,
          // Adiciona a divisória na direita
          tabBarItemStyle: {
            borderRightWidth: 1,
            borderRightColor: dividerColor,
          }
        }}
      />

      {/* 2. AGENDA */}
      <Tabs.Screen
        name="my-scales"
        options={{
          tabBarIcon: ({ color }) => <Calendar size={30} color={color} />,
          tabBarItemStyle: {
            borderRightWidth: 1,
            borderRightColor: dividerColor,
          }
        }}
      />

      {/* 3. DEPARTAMENTOS */}
      <Tabs.Screen
        name="departments"
        options={{
          tabBarIcon: ({ color }) => <Users size={30} color={color} />,
          tabBarItemStyle: {
            borderRightWidth: 1,
            borderRightColor: dividerColor,
          }
        }}
      />

      {/* --- TELAS OCULTAS --- */}
      <Tabs.Screen
        name="departments/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="departments/member-list"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="settings/schedule"
        options={{ href: null }}
      />
      {/* ------------------- */}

      {/* 4. CONFIGURAÇÕES (O último não tem borda na direita) */}
      <Tabs.Screen
        name="settings"
       options={{
          tabBarIcon: ({ color }) => <Settings size={30} color={color} />,
          tabBarItemStyle: {
            borderRightWidth: 1,
            borderRightColor: dividerColor,
          }
        }}
      />
    </Tabs>
  );
}