import { View, Text, Switch, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Moon, Sun, User, Bell, ChevronRight, LogOut, Palette } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { colorScheme, toggleColorScheme, setColorScheme } = useColorScheme();
  const router = useRouter();

  // Garante que sabemos se está dark
  const isDark = colorScheme === 'dark';

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  // Função para forçar o Dark Mode se o usuário quiser "Padrão Dark"
  // (Dica: O app geralmente lembra a última escolha)
  const handleToggle = () => {
    toggleColorScheme();
  };

  return (
    // MUDANÇA: bg-zinc-950 é aquele preto "profundo" bonito
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      
      {/* Header */}
      <View className="bg-white dark:bg-zinc-900 px-4 pt-12 pb-4 border-b border-gray-200 dark:border-zinc-800">
        <Text className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Configurações</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        
        {/* Seção Aparência */}
        <Text className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase mb-3 mt-2 tracking-wider">Aparência</Text>
        <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isDark ? 'bg-indigo-500/10' : 'bg-orange-100'}`}>
                {isDark ? (
                  <Moon size={20} className="text-indigo-400" />
                ) : (
                  <Sun size={20} className="text-orange-500" />
                )}
              </View>
              <View>
                <Text className="text-gray-900 dark:text-zinc-100 font-semibold text-lg">Modo Escuro</Text>
                <Text className="text-gray-500 dark:text-zinc-400 text-xs">
                  {isDark ? 'Visual focado (Zinc)' : 'Visual claro padrão'}
                </Text>
              </View>
            </View>
            
            <Switch 
              value={isDark} 
              onValueChange={handleToggle} 
              trackColor={{ false: "#e5e7eb", true: "#6366f1" }} // Indigo para destacar no dark
              thumbColor={isDark ? "#ffffff" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Seção Conta */}
        <Text className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase mb-3 mt-8 tracking-wider">Conta</Text>
        <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
          
          <TouchableOpacity onPress={() => router.push('/profile')} className="flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800">
            <View className="flex-row items-center">
              <View className="w-9 h-9 bg-blue-50 dark:bg-blue-500/10 rounded-full items-center justify-center mr-3">
                <User size={18} className="text-blue-600 dark:text-blue-400" />
              </View>
              <Text className="text-gray-700 dark:text-zinc-200 font-medium">Editar Perfil</Text>
            </View>
            <ChevronRight size={20} className="text-gray-300 dark:text-zinc-600" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800">
            <View className="flex-row items-center">
              <View className="w-9 h-9 bg-green-50 dark:bg-green-500/10 rounded-full items-center justify-center mr-3">
                <Bell size={18} className="text-green-600 dark:text-green-400" />
              </View>
              <Text className="text-gray-700 dark:text-zinc-200 font-medium">Notificações</Text>
            </View>
            <Switch value={true} trackColor={{ false: "#767577", true: "#22c55e" }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSignOut} className="flex-row items-center justify-between p-4 active:bg-red-50 dark:active:bg-red-900/10">
             <View className="flex-row items-center">
              <View className="w-9 h-9 bg-red-50 dark:bg-red-500/10 rounded-full items-center justify-center mr-3">
                <LogOut size={18} className="text-red-600 dark:text-red-400" />
              </View>
              <Text className="text-red-600 dark:text-red-400 font-medium">Sair do App</Text>
            </View>
          </TouchableOpacity>

        </View>

        <Text className="text-center text-gray-400 dark:text-zinc-600 text-xs mt-10">Versão 1.0.0</Text>

      </ScrollView>
    </View>
  );
}