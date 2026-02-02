import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name?.split(' ')[0] || 'Membro');
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white px-6 py-8 border-b border-gray-200">
          <Text className="text-gray-600 text-lg">Olá,</Text>
          <Text className="text-2xl font-bold text-gray-900">{userName} 👋</Text>
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
          <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <TouchableOpacity 
              className="flex-row items-center justify-between p-3"
              onPress={() => router.push('/(tabs)/departments')}
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-blue-100 rounded-lg items-center justify-center mr-3">
                  <MapPin size={20} color="#2563eb" />
                </View>
                <View>
                  <Text className="text-gray-900 font-semibold text-lg">Ver Departamentos</Text>
                  <Text className="text-gray-500 text-sm">Acesse todos os seus departamentos</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
