import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LogOut, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    }

    loadProfile();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Confirmar', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Configurações</Text>

        {/* Perfil */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
          <View className="flex-row items-center mb-4">
            <User size={24} color="#374151" />
            <Text className="text-lg font-semibold text-gray-900 ml-3">Perfil</Text>
          </View>
          {profile && (
            <>
              <View className="mb-2">
                <Text className="text-sm text-gray-500">Nome</Text>
                <Text className="text-gray-900 font-medium">
                  {profile.full_name || 'Não informado'}
                </Text>
              </View>
              <View className="mb-2">
                <Text className="text-sm text-gray-500">Email</Text>
                <Text className="text-gray-900 font-medium">
                  {profile.email || 'Não informado'}
                </Text>
              </View>
              <View>
                <Text className="text-sm text-gray-500">Função</Text>
                <Text className="text-gray-900 font-medium">
                  {profile.org_role === 'master'
                    ? 'Master'
                    : profile.org_role === 'admin'
                      ? 'Administrador'
                      : 'Membro'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Sair */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500 rounded-xl p-4 flex-row items-center justify-center"
        >
          <LogOut size={20} color="white" />
          <Text className="text-white font-semibold text-lg ml-2">Sair</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
