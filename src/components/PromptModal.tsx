import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import type { PromptModalProps } from '@/types/ui';

export function PromptModal({
  visible,
  title,
  label,
  placeholder,
  value,
  onChangeText,
  loading = false,
  onConfirm,
  onCancel,
  confirmButtonColor = 'bg-blue-600',
}: PromptModalProps) {
  const { colorScheme } = useColorScheme();
  const placeholderColor = colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">{title}</Text>
            <TouchableOpacity onPress={onCancel}>
              <X size={24} color={placeholderColor} />
            </TouchableOpacity>
          </View>
          
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">{label}</Text>
            <TextInput 
              className="bg-gray-50 dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-3 text-gray-900 dark:text-zinc-100 text-base" 
              placeholder={placeholder} 
              placeholderTextColor={placeholderColor} 
              value={value} 
              onChangeText={onChangeText} 
            />
          </View>

          <TouchableOpacity onPress={onConfirm} disabled={loading} className={`${confirmButtonColor} rounded-xl py-3 w-full items-center flex-row justify-center`}>
            {loading ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold text-base">Criar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}