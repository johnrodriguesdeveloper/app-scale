import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export interface FeedbackModalProps {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

export function FeedbackModal({ visible, type, title, message, onClose }: FeedbackModalProps) {
  const { colorScheme } = useColorScheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl transform transition-all">
          <View className="items-center mb-4">
            <View className={`w-14 h-14 rounded-full items-center justify-center mb-4 ${type === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {type === 'success' ? (
                <CheckCircle size={32} color={colorScheme === 'dark' ? '#4ade80' : '#16a34a'} />
              ) : (
                <AlertTriangle size={32} color={colorScheme === 'dark' ? '#ef4444' : '#dc2626'} />
              )}
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 text-center mb-2">
              {title}
            </Text>
            <Text className="text-gray-500 dark:text-zinc-400 text-center text-base px-2">
              {message}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={onClose}
            className={`py-3 rounded-xl w-full ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          >
            <Text className="text-white font-bold text-center text-lg">
              {type === 'success' ? 'Continuar' : 'Tentar Novamente'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}