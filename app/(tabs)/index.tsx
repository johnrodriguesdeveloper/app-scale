import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Calendar, Clock, MapPin, User, ChevronRight } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHome } from '@/features/home/useHome';

export default function HomeScreen() {
  const router = useRouter();
  
  const {
    userName,
    avatarUrl,
    nextScale,
    loadingScale,
    fetchUserData,
    fetchNextScale
  } = useHome();

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      fetchNextScale();
    }, [fetchUserData, fetchNextScale])
  );

  const formatScaleDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "EEE, dd 'de' MMM", { locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        
        <View className="px-6 pt-8 pb-4 flex-row justify-between items-start mb-8 border-b border-gray-200 dark:border-zinc-800">
          <View className="flex-row items-center">
            <Text className="text-gray-500 dark:text-zinc-400 text-base font-medium">Olá,</Text>
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
              {' '} {userName} 👋
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.push('/profile')}
            className="rounded-full shadow-sm"
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="w-12 h-12 rounded-full border border-gray-200 dark:border-zinc-800"
              />
            ) : (
              <View className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full items-center justify-center">
                <User size={24} className="text-gray-500 dark:text-zinc-500" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View className="px-6 gap-4">
          
          <TouchableOpacity 
            onPress={() => router.push('/my-scales')}
            className="flex-row items-center bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm active:bg-gray-50 dark:active:bg-zinc-800 transition-all"
          >
            <View className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 rounded-2xl items-center justify-center mr-5">
              <Calendar size={26} className="text-blue-600 dark:text-blue-400" />
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Minha Agenda</Text>
              
              {loadingScale ? (
                  <Text className="text-gray-400 dark:text-zinc-500 text-sm mt-0.5">Buscando...</Text>
              ) : nextScale ? (
                  <View className="mt-1">
                      <Text className="text-gray-400 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                          Sua próxima escala
                      </Text>
                      <Text className="text-blue-600 dark:text-blue-400 font-semibold text-sm capitalize">
                          {formatScaleDate(nextScale.schedule_date)}
                      </Text>
                      <Text className="text-gray-500 dark:text-zinc-400 text-xs mt-0.5" numberOfLines={1}>
                          {nextScale.departments?.name} • {nextScale.department_functions?.name}
                      </Text>
                  </View>
              ) : (
                  <Text className="text-gray-500 dark:text-zinc-400 text-sm mt-0.5">Nenhuma escala próxima</Text>
              )}
            </View>
            <ChevronRight size={20} className="text-gray-300 dark:text-zinc-600" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/availability')}
            className="flex-row items-center bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm active:bg-gray-50 dark:active:bg-zinc-800 transition-all"
          >
            <View className="w-14 h-14 bg-orange-50 dark:bg-orange-500/10 rounded-2xl items-center justify-center mr-5">
              <Clock size={26} className="text-orange-500 dark:text-orange-400" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Disponibilidade</Text>
              <Text className="text-gray-500 dark:text-zinc-400 text-sm mt-0.5">Informe ausências</Text>
            </View>
            <ChevronRight size={20} className="text-gray-300 dark:text-zinc-600" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/departments')}
            className="flex-row items-center bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm active:bg-gray-50 dark:active:bg-zinc-800 transition-all"
          >
            <View className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-2xl items-center justify-center mr-5">
              <MapPin size={26} className="text-gray-700 dark:text-zinc-300" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Departamentos</Text>
              <Text className="text-gray-500 dark:text-zinc-400 text-sm mt-0.5">Gerencie seus grupos</Text>
            </View>
            <ChevronRight size={20} className="text-gray-300 dark:text-zinc-600" />
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}