import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, LogOut, User, Phone, Calendar } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useProfile } from '@/features/profile/useProfile';
import { FeedbackModal } from '@/components/FeedbackModal';

export default function ProfileScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  const {
    profile,
    loading,
    saving,
    editingName,
    setEditingName,
    editingPhone,
    editingBirthDate,
    modalConfig,
    handleDateChange,
    handlePhoneChange,
    handleSaveProfile,
    handleLogout,
    getInitials,
    closeModal
  } = useProfile();

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

      <FeedbackModal 
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={closeModal}
      />
    </View>
  );
}