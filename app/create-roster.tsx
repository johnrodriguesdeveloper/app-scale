import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Calendar, MapPin, Briefcase } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCreateRoster } from '@/features/roster/useCreateRoster';

export default function CreateRosterScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#a1a1aa' : '#6b7280';
  
  const {
    selectedDate,
    selectedDepartment,
    setSelectedDepartment,
    selectedFunction,
    setSelectedFunction,
    availableMembers,
    departments,
    functions,
    loading,
    handleCreateRoster
  } = useCreateRoster();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      
      <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 pt-12 pb-4">
        <View className="flex-row items-center justify-between mb-2 max-w-4xl mx-auto w-full">
          <Text className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Criar Escala</Text>
          <TouchableOpacity onPress={() => router.back()} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full">
            <X size={20} color={colorScheme === 'dark' ? '#e4e4e7' : '#374151'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="max-w-4xl mx-auto w-full">
          
          <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-zinc-800">
            <View className="flex-row items-center mb-3">
              <Calendar size={18} color="#3b82f6" className="mr-2" />
              <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100">Data</Text>
            </View>
            <Text className="text-gray-700 dark:text-zinc-300 font-medium text-base mb-2 capitalize">
              {selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <TouchableOpacity>
              <Text className="text-blue-600 dark:text-blue-400 font-medium">Alterar data</Text>
            </TouchableOpacity>
          </View>

          {departments.length > 0 && (
            <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-zinc-800">
              <View className="flex-row items-center mb-3">
                <MapPin size={18} color="#3b82f6" className="mr-2" />
                <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100">Departamento</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {departments.map((dept) => {
                  const isSelected = selectedDepartment === dept.id;
                  return (
                    <TouchableOpacity
                      key={dept.id}
                      onPress={() => setSelectedDepartment(dept.id)}
                      className={`px-4 py-2.5 rounded-xl border ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                      }`}
                    >
                      <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-700 dark:text-zinc-300'}`}>
                        {dept.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {functions.length > 0 && (
            <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 dark:border-zinc-800">
              <View className="flex-row items-center mb-3">
                <Briefcase size={18} color="#3b82f6" className="mr-2" />
                <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                  Função
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {functions.map((func) => {
                  const isSelected = selectedFunction === func.id;
                  return (
                    <TouchableOpacity
                      key={func.id}
                      onPress={() => setSelectedFunction(func.id)}
                      className={`px-4 py-2.5 rounded-xl border ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                      }`}
                    >
                      <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-700 dark:text-zinc-300'}`}>
                        {func.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-zinc-800 mb-8">
            <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-4">
              Membros Disponíveis
            </Text>

            {loading ? (
              <View className="py-8 items-center">
                 <ActivityIndicator size="large" color="#3b82f6" />
                 <Text className="text-gray-500 dark:text-zinc-400 mt-2">Analisando agendas...</Text>
              </View>
            ) : availableMembers.length === 0 ? (
              <View className="py-6 items-center">
                <Text className="text-gray-500 dark:text-zinc-400 text-center font-medium">
                  Nenhum membro disponível para esta função.
                </Text>
              </View>
            ) : (
              availableMembers.map((member, index) => (
                <TouchableOpacity
                  key={member.user_id}
                  onPress={() => handleCreateRoster(member.user_id)}
                  disabled={loading}
                  className={`flex-row items-center justify-between py-3 ${
                    index !== availableMembers.length - 1 ? 'border-b border-gray-100 dark:border-zinc-800' : ''
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-3">
                      <Text className="text-blue-600 dark:text-blue-400 font-bold">
                        {member.full_name?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <View className="flex-1 pr-2">
                      <Text className="text-gray-900 dark:text-zinc-100 font-semibold text-base" numberOfLines={1}>
                        {member.full_name || 'Sem nome'}
                      </Text>
                      {member.email && (
                        <Text className="text-gray-500 dark:text-zinc-400 text-sm" numberOfLines={1}>{member.email}</Text>
                      )}
                    </View>
                  </View>
                  <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800">
                    <Text className="text-green-700 dark:text-green-400 text-xs font-bold">DISPONÍVEL</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}