import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Save, X, Info } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCreateDepartment } from '@/features/departments/useCreateDepartment';
import { FeedbackModal } from '@/components/FeedbackModal';

export default function CreateDepartmentScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const placeholderColor = colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af';
  
  const {
    name,
    setName,
    priority,
    setPriority,
    deadlineDay,
    setDeadlineDay,
    loading,
    modalConfig,
    handleSave,
    handleCloseModal
  } = useCreateDepartment();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <ScrollView className="flex-1">
        <View className="p-4 pt-12">
          
          <View className="flex-row items-center justify-between mb-8">
            <Text className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
              Criar Departamento
            </Text>
            <TouchableOpacity onPress={() => router.back()} className="p-2 bg-gray-200 dark:bg-zinc-800 rounded-full">
              <X size={24} color={colorScheme === 'dark' ? '#e4e4e7' : '#4b5563'} />
            </TouchableOpacity>
          </View>

          <View>
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Nome do Departamento</Text>
              <TextInput
                className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-3 text-gray-900 dark:text-zinc-100 text-base"
                placeholder="Ex: Louvor, Diáconos..."
                placeholderTextColor={placeholderColor}
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Prioridade</Text>
              <TextInput
                className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-3 text-gray-900 dark:text-zinc-100 text-base"
                placeholder="Ex: 1, 2, 3..."
                placeholderTextColor={placeholderColor}
                value={priority}
                onChangeText={setPriority}
                keyboardType="numeric"
                editable={!loading}
              />
              <View className="flex-row items-start mt-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-900/30">
                <Info size={16} color="#3b82f6" style={{ marginRight: 8, marginTop: 2 }} />
                <Text className="text-blue-700 dark:text-blue-300 text-xs flex-1">
                  A prioridade define a ordem. Número 1 é a maior prioridade.
                </Text>
              </View>
            </View>

            <View className="mb-8">
              <Text className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Dia Limite de Escala</Text>
              <TextInput
                className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-3 text-gray-900 dark:text-zinc-100 text-base"
                placeholder="Ex: 15 (dia do mês)"
                placeholderTextColor={placeholderColor}
                value={deadlineDay}
                onChangeText={setDeadlineDay}
                keyboardType="numeric"
                editable={!loading}
              />
              <Text className="text-gray-500 dark:text-zinc-500 text-xs mt-2 ml-1">
                Dia do mês (1-31) que encerra o prazo de disponibilidade.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              className={`bg-blue-600 rounded-xl py-4 px-6 shadow-sm mb-4 ${loading ? 'opacity-50' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center justify-center">
                  <Save size={20} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white font-bold text-base">Salvar Departamento</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <FeedbackModal 
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={handleCloseModal}
      />
    </View>
  );
}