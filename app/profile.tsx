import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, LogOut, User, Phone, Calendar, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'nativewind';

interface Profile {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  birth_date: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit States
  const [editingName, setEditingName] = useState('');
  const [editingPhone, setEditingPhone] = useState('');
  const [editingBirthDate, setEditingBirthDate] = useState('');

  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'success' as 'success' | 'error', title: '', message: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, phone, birth_date')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        setEditingName(data.full_name || '');
        setEditingPhone(data.phone || '');
        
        // Converter data do banco (YYYY-MM-DD) para exibição (DD/MM/YYYY)
        if (data.birth_date) {
            const [year, month, day] = data.birth_date.split('-');
            setEditingBirthDate(`${day}/${month}/${year}`);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // --- MÁSCARAS DE INPUT ---
  const handleDateChange = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 8) cleaned = cleaned.substring(0, 8);
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    if (cleaned.length > 4) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    setEditingBirthDate(formatted);
  };

  const handlePhoneChange = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 11) cleaned = cleaned.substring(0, 11);
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length > 7) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    setEditingPhone(formatted);
  };

  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalConfig({ type, title, message });
    setModalVisible(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let isoDate = null;
      // Validação simples da data antes de formatar para o banco
      if (editingBirthDate.length === 10) {
        const [day, month, year] = editingBirthDate.split('/');
        isoDate = `${year}-${month}-${day}`;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
            full_name: editingName.trim(),
            phone: editingPhone.trim(),
            birth_date: isoDate
        })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      showModal('success', 'Sucesso!', 'Seus dados foram atualizados com sucesso.');
      
    } catch (error: any) {
      showModal('error', 'Erro', error.message || 'Falha ao salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) return <ActivityIndicator size="large" color="#2563eb" className="flex-1 bg-gray-50 dark:bg-zinc-950" />;

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
          </View>
          <Text className="text-gray-400 text-xs mt-3">(Alteração de foto temporariamente indisponível)</Text>
        </View>

        <View className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-gray-200 dark:border-zinc-800 mb-8">
          <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4">Dados Pessoais</Text>
          
          {/* Campo Nome */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Nome Completo</Text>
            <View className="flex-row items-center bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg px-4 py-3">
              <User size={20} className="text-gray-400 dark:text-zinc-500 mr-3" />
              <TextInput
                value={editingName}
                onChangeText={setEditingName}
                placeholderTextColor={colorScheme === 'dark' ? '#52525b' : '#9ca3af'}
                className="flex-1 text-base text-gray-900 dark:text-zinc-100"
              />
            </View>
          </View>

          {/* Campo Data de Nascimento */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Data de Nascimento</Text>
            <View className="flex-row items-center bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg px-4 py-3">
              <Calendar size={20} className="text-gray-400 dark:text-zinc-500 mr-3" />
              <TextInput
                value={editingBirthDate}
                onChangeText={handleDateChange}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
                placeholderTextColor={colorScheme === 'dark' ? '#52525b' : '#9ca3af'}
                className="flex-1 text-base text-gray-900 dark:text-zinc-100"
              />
            </View>
          </View>

          {/* Campo Telefone */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">WhatsApp / Celular</Text>
            <View className="flex-row items-center bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg px-4 py-3">
              <Phone size={20} className="text-gray-400 dark:text-zinc-500 mr-3" />
              <TextInput
                value={editingPhone}
                onChangeText={handlePhoneChange}
                placeholder="(DD) 99999-9999"
                keyboardType="phone-pad"
                maxLength={15}
                placeholderTextColor={colorScheme === 'dark' ? '#52525b' : '#9ca3af'}
                className="flex-1 text-base text-gray-900 dark:text-zinc-100"
              />
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleSaveProfile} 
            disabled={saving}
            className={`py-3 rounded-lg flex-row items-center justify-center ${saving ? 'bg-blue-400' : 'bg-blue-600'}`}
          >
            {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Salvar Alterações</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- MODAL DE FEEDBACK --- */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl">
            
            <View className="items-center mb-4">
              <View className={`w-14 h-14 rounded-full items-center justify-center mb-4 ${
                modalConfig.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {modalConfig.type === 'success' ? (
                  <CheckCircle size={32} color={colorScheme === 'dark' ? '#4ade80' : '#16a34a'} />
                ) : (
                  <AlertTriangle size={32} color={colorScheme === 'dark' ? '#ef4444' : '#dc2626'} />
                )}
              </View>

              <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 text-center mb-2">
                {modalConfig.title}
              </Text>
              
              <Text className="text-gray-500 dark:text-zinc-400 text-center text-base px-2">
                {modalConfig.message}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              className={`py-3 rounded-xl w-full ${
                modalConfig.type === 'success' ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              <Text className="text-white font-bold text-center text-lg">
                Ok
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}