import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Plus, Trash2, Settings, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useDepartmentSettings } from '@/features/departments/useDepartmentSettings';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function DepartmentSettingsScreen() {
  const router = useRouter();
  const { departmentId } = useLocalSearchParams<{ departmentId: string }>();
  const { colorScheme } = useColorScheme();
  
  const iconColor = colorScheme === 'dark' ? '#e4e4e7' : '#374151';
  const placeholderColor = colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af';

  const {
    functions,
    members,
    newFunctionName,
    setNewFunctionName,
    loading,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmConfig,
    addFunction,
    requestDeleteFunction,
    executeDeleteFunction,
    toggleMemberFunction
  } = useDepartmentSettings(departmentId);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      
      <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 pt-12 pb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Settings size={24} color="#3b82f6" className="mr-3" />
          <Text className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Configurações</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full">
          <X size={20} color={iconColor} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        
        <View className="bg-white dark:bg-zinc-900 rounded-2xl p-5 mb-6 shadow-sm border border-gray-200 dark:border-zinc-800">
          <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-4">Gerenciar Funções</Text>

          <View className="flex-row items-center mb-6">
            <TextInput
              value={newFunctionName}
              onChangeText={setNewFunctionName}
              placeholder="Ex: Baixo, Violino..."
              placeholderTextColor={placeholderColor}
              className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-xl px-4 py-3 mr-3 text-gray-900 dark:text-zinc-100"
            />
            <TouchableOpacity
              onPress={addFunction}
              disabled={loading || !newFunctionName.trim()}
              className={`bg-blue-600 rounded-xl p-3 items-center justify-center ${(!newFunctionName.trim() || loading) ? 'opacity-50' : ''}`}
            >
              {loading ? <ActivityIndicator size="small" color="white" /> : <Plus size={24} color="white" />}
            </TouchableOpacity>
          </View>

          {functions.length > 0 ? (
            functions.map((func, index) => (
              <View
                key={func.id}
                className={`flex-row items-center justify-between py-3 ${index !== functions.length - 1 ? 'border-b border-gray-100 dark:border-zinc-800' : ''}`}
              >
                <Text className="text-gray-800 dark:text-zinc-200 font-semibold text-base flex-1">{func.name}</Text>
                <TouchableOpacity
                  onPress={() => requestDeleteFunction(func.id, func.name)}
                  className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg ml-3"
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text className="text-gray-500 dark:text-zinc-400 text-center py-4 italic">
              Nenhuma função cadastrada.
            </Text>
          )}
        </View>

        <View className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-zinc-800 mb-10">
          <View className="flex-row items-center mb-4">
            <Users size={20} color="#3b82f6" className="mr-2" />
            <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100">
              Atribuir Funções
            </Text>
          </View>
          <Text className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
            Selecione o que cada membro está habilitado a fazer na escala.
          </Text>

          {members.length > 0 ? (
            members.map((member, index) => (
              <View
                key={member.user_id}
                className={`py-4 ${index !== members.length - 1 ? 'border-b border-gray-100 dark:border-zinc-800' : ''}`}
              >
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center mr-3">
                    <Text className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                      {member.profiles.full_name.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-gray-900 dark:text-zinc-100 font-bold text-base">
                      {member.profiles.full_name}
                    </Text>
                    {member.profiles.email && (
                      <Text className="text-gray-500 dark:text-zinc-400 text-xs">
                        {member.profiles.email}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View className="flex-row flex-wrap gap-2 pl-13">
                  {functions.map((func) => {
                    const hasFunction = member.member_functions.some(
                      (mf) => mf.function_id === func.id
                    );
                    return (
                      <TouchableOpacity
                        key={func.id}
                        onPress={() => toggleMemberFunction(member.user_id, func.id, hasFunction)}
                        className={`px-4 py-2 rounded-xl border ${
                          hasFunction
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                        }`}
                      >
                        <Text
                          className={`font-semibold text-xs ${
                            hasFunction
                              ? 'text-white'
                              : 'text-gray-600 dark:text-zinc-400'
                          }`}
                        >
                          {func.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          ) : (
            <Text className="text-gray-500 dark:text-zinc-400 text-center py-6 italic">
              Nenhum membro no departamento.
            </Text>
          )}
        </View>
      </ScrollView>

      <ConfirmModal 
        visible={confirmModalVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={true}
        loading={confirmConfig.loading}
        onConfirm={executeDeleteFunction}
        onCancel={() => setConfirmModalVisible(false)}
      />

    </View>
  );
}