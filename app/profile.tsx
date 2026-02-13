import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, LogOut, Camera, User } from 'lucide-react-native';
// import * as ImagePicker from 'expo-image-picker'; // Desativado temporariamente
// import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data);
        setEditingName(data.full_name || '');
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  /* FUNCIONALIDADE DE UPLOAD PAUSADA (ERRO DE CORS NA WEB)
  const handleImageUpload = async () => {
     // ... código antigo ...
  };
  */

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ full_name: editingName.trim() }).eq('user_id', user.id);
      Alert.alert('Sucesso', 'Nome atualizado!');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) return <ActivityIndicator size="large" className="flex-1" />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="bg-white dark:bg-zinc-900 px-4 pt-12 pb-4 border-b border-gray-200 dark:border-zinc-800">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
            <ArrowLeft size={20} className="text-gray-700 dark:text-zinc-300" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Meu Perfil</Text>
          <TouchableOpacity onPress={handleLogout} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <LogOut size={20} className="text-red-600 dark:text-red-400" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-6">
        <View className="items-center mb-8">
          {/* Botão desativado visualmente */}
          <View className="relative opacity-80">
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} className="w-24 h-24 rounded-full border-4 border-white dark:border-zinc-800" />
            ) : (
              <View className="w-24 h-24 bg-gray-200 dark:bg-zinc-800 rounded-full items-center justify-center border-4 border-white dark:border-zinc-800">
                <Text className="text-2xl font-bold text-gray-500 dark:text-zinc-400">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </Text>
              </View>
            )}
            {/* Ícone de câmera removido temporariamente */}
          </View>
          <Text className="text-gray-400 text-xs mt-3">(Alteração de foto temporariamente indisponível)</Text>
        </View>

        <View className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-800">
          <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4">Dados Pessoais</Text>
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Nome Completo</Text>
            <View className="flex-row items-center bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg px-4 py-3">
              <User size={20} className="text-gray-400 dark:text-zinc-500 mr-3" />
              <TextInput
                value={editingName}
                onChangeText={setEditingName}
                className="flex-1 text-base text-gray-900 dark:text-zinc-100"
              />
            </View>
          </View>
          <TouchableOpacity onPress={handleSaveProfile} className="bg-blue-600 py-3 rounded-lg items-center">
            <Text className="text-white font-semibold">Salvar Alterações</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}