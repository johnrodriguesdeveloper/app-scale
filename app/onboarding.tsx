import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { ChevronRight, Calendar, Phone, CheckCircle, ArrowLeft, CheckSquare, Square } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useOnboarding } from '@/features/onboarding/useOnboarding';
import { FeedbackModal } from '@/components/FeedbackModal';

export default function OnboardingScreen() {
  const { colorScheme } = useColorScheme();
  
  const {
    loading,
    saving,
    step,
    departments,
    subDepartments,
    functions,
    phone,
    birthDate,
    selectedDepartment,
    selectedSubDepartment,
    selectedFunctions,
    modalConfig,
    handleDateChange,
    handlePhoneChange,
    handleSelectDepartment,
    setSelectedSubDepartment,
    goNextStep,
    goBackStep,
    toggleFunction,
    handleFinish,
    handleCloseModal
  } = useOnboarding();

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="p-6 pt-12">
        
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            {step === 1 ? 'Seus Dados' : step === 4 ? 'Suas Funções' : 'Onde você serve?'}
          </Text>
          <Text className="text-lg text-gray-600 dark:text-zinc-400">
            Passo {step} de {subDepartments.length > 0 ? 4 : 3}
          </Text>
          <View className="h-2 bg-gray-200 dark:bg-zinc-800 rounded-full mt-4 overflow-hidden">
             <View className="h-full bg-blue-600" style={{ width: `${(step / (subDepartments.length > 0 ? 4 : 3)) * 100}%` }} />
          </View>
        </View>

        {step === 1 && (
          <View>
            <View className="mb-4">
               <Text className="mb-2 font-semibold text-gray-700 dark:text-zinc-300">Data de Nascimento</Text>
               <View className="flex-row items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3">
                  <Calendar size={20} color={colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af'} />
                  <TextInput 
                    className="flex-1 ml-3 text-base text-gray-900 dark:text-zinc-100"
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={colorScheme === 'dark' ? '#52525b' : '#9ca3af'}
                    keyboardType="numeric"
                    value={birthDate}
                    onChangeText={handleDateChange}
                    maxLength={10}
                  />
               </View>
            </View>

            <View className="mb-6">
               <Text className="mb-2 font-semibold text-gray-700 dark:text-zinc-300">WhatsApp / Celular</Text>
               <View className="flex-row items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3">
                  <Phone size={20} color={colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af'} />
                  <TextInput 
                    className="flex-1 ml-3 text-base text-gray-900 dark:text-zinc-100"
                    placeholder="(DD) 99999-9999"
                    placeholderTextColor={colorScheme === 'dark' ? '#52525b' : '#9ca3af'}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    maxLength={15}
                  />
               </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            {departments.map((dept) => (
              <TouchableOpacity
                key={dept.id}
                onPress={() => handleSelectDepartment(dept)}
                className={`flex-row items-center justify-between p-4 mb-3 rounded-xl border-2 ${
                  selectedDepartment?.id === dept.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                    : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                }`}
              >
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100">{dept.name}</Text>
                  {dept.description && <Text className="text-gray-500 dark:text-zinc-400 text-xs">{dept.description}</Text>}
                </View>
                <ChevronRight size={20} color="#6b7280" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 3 && (
          <View>
            <Text className="mb-4 text-gray-600 dark:text-zinc-400">
                Dentro de <Text className="font-bold text-gray-900 dark:text-zinc-200">{selectedDepartment?.name}</Text>, qual sua área?
            </Text>
            {subDepartments.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                onPress={() => setSelectedSubDepartment(sub)}
                className={`flex-row items-center justify-between p-4 mb-3 rounded-xl border-2 ${
                  selectedSubDepartment?.id === sub.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                    : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                }`}
              >
                <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100">{sub.name}</Text>
                {selectedSubDepartment?.id === sub.id && <CheckCircle size={24} color="#2563eb" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 4 && (
          <View>
            <Text className="mb-4 text-gray-600 dark:text-zinc-400">
                O que você faz em <Text className="font-bold text-gray-900 dark:text-zinc-200">{selectedSubDepartment?.name || selectedDepartment?.name}</Text>?
            </Text>
            {functions.length > 0 ? functions.map((func) => {
                const isSelected = selectedFunctions.includes(func.id);
                return (
                  <TouchableOpacity
                    key={func.id}
                    onPress={() => toggleFunction(func.id)}
                    className={`flex-row items-center p-4 mb-3 rounded-xl border-2 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                        : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <View className="mr-3">
                        {isSelected 
                            ? <CheckSquare size={24} color="#2563eb" /> 
                            : <Square size={24} color={colorScheme === 'dark' ? '#71717a' : '#d1d5db'} />
                        }
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{func.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
            }) : (
                <View className="items-center py-10">
                    <Text className="text-gray-500 dark:text-zinc-400">Nenhuma função encontrada para este departamento.</Text>
                </View>
            )}
          </View>
        )}

        <View className="flex-row justify-between mt-8 mb-10">
            {step > 1 ? (
                <TouchableOpacity 
                    onPress={goBackStep}
                    className="bg-gray-200 dark:bg-zinc-800 px-6 py-4 rounded-xl flex-row items-center"
                >
                    <ArrowLeft size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                </TouchableOpacity>
            ) : <View />}

            {step === 4 ? (
                <TouchableOpacity 
                    onPress={handleFinish}
                    disabled={saving}
                    className="flex-1 ml-4 bg-green-600 rounded-xl py-4 items-center flex-row justify-center shadow-lg"
                    style={{ opacity: saving ? 0.7 : 1 }}
                >
                    {saving ? <ActivityIndicator color="white" /> : (
                        <>
                            <CheckCircle size={20} color="white" style={{marginRight:8}} />
                            <Text className="text-white font-bold text-lg">Concluir</Text>
                        </>
                    )}
                </TouchableOpacity>
            ) : (
                <TouchableOpacity 
                    onPress={goNextStep}
                    className="flex-1 ml-4 bg-blue-600 rounded-xl py-4 items-center flex-row justify-center shadow-lg"
                >
                    <Text className="text-white font-bold text-lg mr-2">Próximo</Text>
                    <ChevronRight size={20} color="white" />
                </TouchableOpacity>
            )}
        </View>

      </View>

      <FeedbackModal 
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={handleCloseModal}
      />

    </ScrollView>
  );
}