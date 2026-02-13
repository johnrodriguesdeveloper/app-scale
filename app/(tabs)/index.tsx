import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Calendar, Clock, MapPin, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name?.split(' ')[0] || 'Membro');
        setAvatarUrl(profile.avatar_url);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-950 items-center justify-center">
        <Text className="text-gray-500 dark:text-zinc-400">Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white dark:bg-zinc-900 px-6 py-8 border-b border-gray-200 dark:border-zinc-800">
          <View className="flex-row items-center justify-between">
            <View className='flex-row items-center'>
              <Text className="text-gray-600 dark:text-zinc-400 text-lg">Olá,</Text>
              <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">{''} {userName} 👋</Text>
            </View>
            
            {/* Avatar clicável */}
            <TouchableOpacity 
              onPress={() => router.push('/profile')}
              className="relative"
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <View className="w-12 h-12 bg-gray-300 dark:bg-zinc-700 rounded-full items-center justify-center">
                  <User size={20} color="#6b7280" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Conteúdo */}
        <View className="p-6">
          {/* Cards de Ação Principal */}
          <View className="space-y-4 mb-8">
            {/* Card 1: Minha Agenda */}
            <TouchableOpacity 
              className="bg-blue-600 rounded-xl p-6 shadow-lg"
              onPress={() => router.push('/my-scales')}
            >
              <View className="flex-row items-center">
                <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mr-4">
                  <Calendar size={28} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-xl mb-1">Minha Agenda</Text>
                  <Text className="text-blue-100">Ver dias que estou escalado</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Card 2: Minha Disponibilidade */}
            <TouchableOpacity 
              className="bg-orange-500 rounded-xl p-6 shadow-lg"
              onPress={() => router.push('/availability')}
            >
              <View className="flex-row items-center">
                <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mr-4">
                  <Clock size={28} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-xl mb-1">Minha Disponibilidade</Text>
                  <Text className="text-orange-100">Avisar que não posso ir</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Rodapé: Ver Departamentos */}
          <View className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-800 shadow-sm">
            <TouchableOpacity 
              className="flex-row items-center justify-between p-3"
              onPress={() => router.push('/(tabs)/departments')}
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-lg items-center justify-center mr-3">
                  <MapPin size={20} color="#2563eb" />
                </View>
                <View>
                  <Text className="text-gray-900 dark:text-zinc-100 font-semibold text-lg">Ver Departamentos</Text>
                  <Text className="text-gray-500 dark:text-zinc-400 text-sm">Acesse todos os seus departamentos</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
