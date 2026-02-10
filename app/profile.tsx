import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, LogOut, Camera, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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
      console.error('Erro ao buscar perfil:', error);
      Alert.alert('Erro', 'Não foi possível carregar seu perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async () => {
    try {
      // Solicitar permissão e selecionar imagem
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setUploading(true);

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Gerar nome único para o arquivo
      const fileExt = asset.uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Converter base64 para ArrayBuffer
      const base64Data = asset.base64;
      if (!base64Data) throw new Error('Imagem inválida');

      // Decodificar base64
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Fazer upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Atualizar perfil com nova URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Atualizar estado local
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      Alert.alert('Sucesso', 'Foto de perfil atualizada!');

    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      Alert.alert('Erro', 'Não foi possível atualizar sua foto de perfil.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editingName.trim() })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, full_name: editingName.trim() } : null);
      Alert.alert('Sucesso', 'Seu nome foi atualizado!');

    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar suas alterações.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
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
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-gray-500 mt-2">Carregando...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2 rounded-lg bg-gray-100">
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          
          <Text className="text-xl font-bold text-gray-900">Meu Perfil</Text>
          
          <TouchableOpacity onPress={handleLogout} className="p-2 rounded-lg bg-red-50">
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Avatar */}
        <View className="items-center mb-8">
          <TouchableOpacity 
            onPress={handleImageUpload}
            className="relative"
            disabled={uploading}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <View className="w-24 h-24 bg-gray-300 rounded-full items-center justify-center">
                <Text className="text-2xl font-bold text-gray-600">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </Text>
              </View>
            )}
            
            {/* Ícone de câmera sobreposto */}
            <View className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 border-2 border-white">
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Camera size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>
          
          <Text className="text-gray-600 text-sm mt-3">
            Toque para alterar a foto
          </Text>
        </View>

        {/* Formulário de Dados */}
        <View className="bg-white rounded-xl p-4 border border-gray-200">
          <Text className="text-gray-900 font-semibold text-lg mb-4">Dados Pessoais</Text>
          
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-2">Nome Completo</Text>
            <TextInput
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Seu nome completo"
              className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-gray-50"
            />
          </View>

          <TouchableOpacity
            onPress={handleSaveProfile}
            className="bg-blue-600 rounded-lg py-3 items-center"
          >
            <Text className="text-white font-semibold">Salvar Alterações</Text>
          </TouchableOpacity>
        </View>

        {/* Informações da Conta */}
        <View className="bg-white rounded-xl p-4 border border-gray-200 mt-4">
          <Text className="text-gray-900 font-semibold text-lg mb-4">Informações da Conta</Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Status</Text>
              <Text className="text-green-600 font-medium">Ativo</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Membro desde</Text>
              <Text className="text-gray-900 font-medium">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
