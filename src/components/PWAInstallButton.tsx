import { TouchableOpacity, Text, View } from 'react-native';
import { Download } from 'lucide-react-native';
import { usePWAInstall } from '@/features/pwa/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, handleInstall } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <View className="mt-2 mb-4">
      <TouchableOpacity 
        onPress={handleInstall}
        className="flex-row items-center justify-center py-3 px-6 rounded-lg bg-gray-100 dark:bg-zinc-800 active:bg-gray-200 dark:active:bg-zinc-700"
      >
        <Download size={18} className="text-gray-600 dark:text-zinc-300 mr-2" />
        <Text className="text-gray-700 dark:text-zinc-300 font-medium text-sm">
          Instalar Aplicativo no Dispositivo
        </Text>
      </TouchableOpacity>
    </View>
  );
}