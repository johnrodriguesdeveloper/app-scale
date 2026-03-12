import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, UserPlus, Trash2, ShieldCheck } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useDepartmentLeaders } from '@/features/departments/useDepartmentLeaders';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function ManageLeadersScreen() {
  const router = useRouter();
  const { departmentId, departmentName } = useLocalSearchParams<{ 
    departmentId: string; 
    departmentName: string; 
  }>();
  const { colorScheme } = useColorScheme();
  
  const iconColor = colorScheme === 'dark' ? '#e4e4e7' : '#374151';
  const placeholderColor = colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af';

  const {
    leaders,
    searchResults,
    searchText,
    loading,
    searching,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmConfig,
    searchUsers,
    handleAddLeader,
    requestRemoveLeader,
    executeRemoveLeader
  } = useDepartmentLeaders(departmentId);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-4">
        <View className="flex-row items-center mt-8">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
            <ArrowLeft size={20} color={iconColor} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">
              Gestão de Líderes
            </Text>
            <Text className="text-gray-600 dark:text-zinc-400 text-sm">
              {departmentName}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        
        <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-4">
          <View className="flex-row items-center bg-gray-100 dark:bg-zinc-800 p-3 rounded-xl">
            <Search size={20} color={placeholderColor} className="mr-2" />
            <TextInput
              placeholder="Buscar membro para adicionar como líder..."
              placeholderTextColor={placeholderColor}
              className="flex-1 text-base text-gray-900 dark:text-zinc-100 outline-none"
              style={{ backgroundColor: 'transparent' }}
              value={searchText}
              onChangeText={searchUsers}
            />
          </View>

          {searching && (
            <View className="mt-3 items-center">
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="text-gray-500 dark:text-zinc-400 text-sm mt-1">Buscando...</Text>
            </View>
          )}

          {searchResults.length > 0 && (
            <View className="mt-3">
              <Text className="text-gray-600 dark:text-zinc-400 text-sm font-medium mb-2">
                Resultados da busca ({searchResults.length})
              </Text>
              {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => handleAddLeader(user.id)}
                  className="flex-row items-center p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg mb-2"
                >
                  <View className="w-10 h-10 bg-blue-600 dark:bg-blue-700 rounded-full items-center justify-center mr-3">
                    <Text className="text-white font-bold">
                      {user.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-zinc-100 font-medium">
                      {user.full_name}
                    </Text>
                    {user.email && (
                      <Text className="text-gray-500 dark:text-zinc-400 text-sm">
                        {user.email}
                      </Text>
                    )}
                  </View>
                  <UserPlus size={20} color="#3b82f6" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4">
            Líderes Atuais ({leaders.length})
          </Text>

          {loading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-gray-500 dark:text-zinc-400 mt-2">Carregando líderes...</Text>
            </View>
          ) : leaders.length > 0 ? (
            leaders.map((leader) => (
              <View
                key={leader.id}
                className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 mb-3 border border-amber-200 dark:border-amber-800/50"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 bg-amber-500 rounded-full items-center justify-center mr-3">
                      <ShieldCheck size={16} color="white" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 dark:text-zinc-100 font-semibold">
                        {leader.profiles.full_name}
                      </Text>
                      {leader.profiles.email && (
                        <Text className="text-gray-500 dark:text-zinc-400 text-sm">
                          {leader.profiles.email}
                        </Text>
                      )}
                      <Text className="text-amber-600 dark:text-amber-500 text-xs mt-1">
                        Líder do departamento
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => requestRemoveLeader(leader.id, leader.profiles.full_name)}
                    className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 items-center border border-gray-200 dark:border-zinc-800">
              <ShieldCheck size={32} color={placeholderColor} />
              <Text className="text-gray-500 dark:text-zinc-400 mt-2 text-center">
                Nenhum líder definido ainda
              </Text>
              <Text className="text-gray-400 dark:text-zinc-500 text-sm text-center mt-1">
                Use a busca acima para adicionar líderes
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ConfirmModal 
        visible={confirmModalVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={true}
        loading={confirmConfig.loading}
        onConfirm={executeRemoveLeader}
        onCancel={() => setConfirmModalVisible(false)}
      />

    </View>
  );
}