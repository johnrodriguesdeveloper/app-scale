import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { X, Search, CheckSquare, Square } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Profile, DepartmentFunction } from '@/types';

interface AddMemberModalProps {
  visible: boolean;
  mode: 'add_member' | 'add_function';
  availableProfiles: Profile[];
  availableFunctions: DepartmentFunction[];
  onClose: () => void;
  onSaveMember: (userId: string, functionIds: string[]) => Promise<void>;
  onSaveFunctions: (functionIds: string[]) => Promise<void>;
}

export function AddMemberModal({
  visible,
  mode,
  availableProfiles,
  availableFunctions,
  onClose,
  onSaveMember,
  onSaveFunctions,
}: AddMemberModalProps) {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af';

  const [step, setStep] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      setStep(mode === 'add_member' ? 1 : 2);
      setSearchText('');
      setSelectedProfileId(null);
      setSelectedFunctionIds([]);
      setErrorMsg('');
    }
  }, [visible, mode]);

  const filteredProfiles = availableProfiles.filter(p => 
    p.full_name.toLowerCase().includes(searchText.toLowerCase())
  );

  const toggleFunction = (id: string) => {
    setSelectedFunctionIds(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleNextStep = () => {
    if (!selectedProfileId) {
      setErrorMsg('Selecione uma pessoa para continuar.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handleSave = async () => {
    if (selectedFunctionIds.length === 0) {
      setErrorMsg('Selecione pelo menos uma função.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      if (mode === 'add_member') {
        if (!selectedProfileId) throw new Error('Usuário não selecionado.');
        await onSaveMember(selectedProfileId, selectedFunctionIds);
      } else {
        await onSaveFunctions(selectedFunctionIds);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden h-[70%] max-h-[600px]">
          
          <View className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex-row justify-between items-center bg-gray-50 dark:bg-zinc-900">
            <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100">
              {mode === 'add_member' ? (step === 1 ? 'Selecionar Membro' : 'Atribuir Funções') : 'Adicionar Funções'}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-white dark:bg-zinc-800 rounded-full">
              <X size={20} color={iconColor} />
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View className="bg-red-50 dark:bg-red-900/30 px-6 py-3 border-b border-red-100 dark:border-red-800">
              <Text className="text-red-600 dark:text-red-400 text-sm font-medium text-center">{errorMsg}</Text>
            </View>
          ) : null}

          <View className="flex-1 px-6 py-4">
            {step === 1 && mode === 'add_member' && (
              <>
                <View className="flex-row items-center bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 mb-4">
                  <Search size={18} color={iconColor} className="mr-3" />
                  <TextInput
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Buscar por nome..."
                    placeholderTextColor={iconColor}
                    className="flex-1 text-gray-900 dark:text-zinc-100 text-base outline-none bg-transparent"
                    style={{ backgroundColor: 'transparent' }}
                  />
                </View>
                <FlatList 
                  data={filteredProfiles}
                  keyExtractor={i => i.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({item}) => (
                    <TouchableOpacity 
                      onPress={() => setSelectedProfileId(item.id)} 
                      className={`p-4 rounded-xl mb-2 border ${
                        selectedProfileId === item.id 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400' 
                          : 'bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700'
                      }`}
                    >
                      <Text className={`font-semibold ${selectedProfileId === item.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-zinc-100'}`}>
                        {item.full_name}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">{item.email}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text className="p-4 text-gray-400 text-center">Nenhum usuário encontrado.</Text>}
                />
              </>
            )}

            {step === 2 && (
              <FlatList 
                data={availableFunctions}
                keyExtractor={i => i.id}
                showsVerticalScrollIndicator={false}
                renderItem={({item}) => {
                  const isSelected = selectedFunctionIds.includes(item.id);
                  return (
                    <TouchableOpacity 
                      onPress={() => toggleFunction(item.id)} 
                      className={`p-4 rounded-xl mb-2 border flex-row items-center justify-between ${
                        isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400' 
                          : 'bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700'
                      }`}
                    >
                      <Text className={`font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-zinc-100'}`}>
                        {item.name}
                      </Text>
                      {isSelected ? (
                        <CheckSquare size={20} color={colorScheme === 'dark' ? '#60a5fa' : '#3b82f6'} />
                      ) : (
                        <Square size={20} color={iconColor} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text className="p-4 text-gray-400 text-center">Nenhuma função disponível.</Text>}
              />
            )}
          </View>

          <View className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            {step === 1 && mode === 'add_member' ? (
              <TouchableOpacity onPress={handleNextStep} className="bg-blue-600 rounded-xl py-4 items-center">
                <Text className="text-white font-bold text-base">Avançar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleSave} disabled={saving} className={`rounded-xl py-4 items-center ${saving ? 'bg-blue-400' : 'bg-blue-600'}`}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text className="text-white font-bold text-base">Confirmar</Text>}
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}