import { View, Text, FlatList, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface ServiceDay {
  id: string;
  day_of_week: number;
  name: string;
}

const weekDays = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
];

const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function ScheduleScreen() {
  const router = useRouter();
  const [serviceDays, setServiceDays] = useState<ServiceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDay, setEditingDay] = useState<ServiceDay | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [eventName, setEventName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadServiceDays();
  }, []);

  const loadServiceDays = async () => {
    try {
      const { data, error } = await supabase
        .from('service_days')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (error) {
        console.error('Erro ao carregar dias de culto:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dias de culto');
        return;
      }

      if (data) {
        setServiceDays(data);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!eventName.trim()) {
      Alert.alert('Erro', 'Digite o nome do evento');
      return;
    }

    if (selectedDay === null || selectedDay === undefined) {
      Alert.alert('Erro', 'Selecione um dia da semana');
      return;
    }

    setSaving(true);
    try {
      if (editingDay) {
        const { error } = await supabase
          .from('service_days')
          .update({
            day_of_week: selectedDay,
            name: eventName.trim()
          })
          .eq('id', editingDay.id);

        if (error) {
          Alert.alert('Erro', 'Não foi possível atualizar o dia de culto');
          return;
        }

        Alert.alert('Sucesso', 'Dia de culto atualizado com sucesso!');
      } else {
        // Adicionar novo dia
        const { error } = await supabase
          .from('service_days')
          .insert({
            day_of_week: selectedDay,
            name: eventName.trim()
          });

        if (error) {
          Alert.alert('Erro', 'Não foi possível adicionar o dia de culto');
          return;
        }

        Alert.alert('Sucesso', 'Dia de culto adicionado com sucesso!');
      }

      setShowModal(false);
      resetForm();
      await loadServiceDays();
    } catch (error) {
      console.error('Erro ao salvar dia de culto:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (day: ServiceDay) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir "${day.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('service_days')
                .delete()
                .eq('id', day.id);

              if (error) {
                Alert.alert('Erro', 'Não foi possível excluir o dia de culto');
                return;
              }

              Alert.alert('Sucesso', 'Dia de culto excluído com sucesso!');
              await loadServiceDays();
            } catch (error) {
              console.error('Erro ao excluir dia de culto:', error);
              Alert.alert('Erro', 'Ocorreu um erro inesperado');
            }
          },
        },
      ]
    );
  };

  const openAddModal = () => {
    setEditingDay(null);
    setSelectedDay(0);
    setEventName('');
    setShowModal(true);
  };

  const openEditModal = (day: ServiceDay) => {
    setEditingDay(day);
    setSelectedDay(day.day_of_week);
    setEventName(day.name);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingDay(null);
    setSelectedDay(0);
    setEventName('');
  };

  const getDayLabel = (dayOfWeek: number) => {
    const day = weekDays.find(d => d.value === dayOfWeek);
    return day?.label || 'Dia inválido';
  };

  const getFullDayLabel = (dayOfWeek: number) => {
  const fullDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return fullDays[dayOfWeek] || 'Dia inválido';
};

  const renderServiceDay = ({ item }: { item: ServiceDay }) => (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-200">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <View className="bg-blue-100 px-3 py-1 rounded-full mr-3">
              <Text className="text-blue-600 font-semibold text-sm">
                {getDayLabel(item.day_of_week)}
              </Text>
            </View>
          </View>
          <Text className="text-gray-900 font-semibold text-lg">
            {item.name}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => openEditModal(item)}
            className="p-2 bg-blue-50 rounded-lg"
          >
            <Edit2 size={16} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            className="p-2 bg-red-50 rounded-lg"
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">Carregando...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Agenda da Igreja</Text>
        </View>
      </View>

      {/* Lista de Dias de Culto */}
      <View className="flex-1 p-4">
        {serviceDays.length > 0 ? (
          <FlatList
            data={serviceDays}
            renderItem={renderServiceDay}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-500 text-center">
              Nenhum dia de culto cadastrado ainda.
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-2">
              Toque no botão + para adicionar um novo dia de culto.
            </Text>
          </View>
        )}
      </View>

      {/* Botão Flutuante */}
      <TouchableOpacity
        onPress={openAddModal}
        className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                {editingDay ? 'Editar Dia de Culto' : 'Adicionar Dia de Culto'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text className="text-gray-500 text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            {/* --- Conteúdo do Formulário --- */}
            <View className="my-4">
              
              {/* Seletor de Dias */}
              <Text className="text-gray-600 font-semibold mb-2">Dia da Semana</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {daysOfWeek.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedDay(index)}
                    className={`px-3 py-2 rounded-full border ${
                      selectedDay === index 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'bg-gray-100 border-gray-200'
                    }`}
                  >
                    <Text className={`text-xs font-bold ${
                      selectedDay === index ? 'text-white' : 'text-gray-600'
                    }`}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Input de Nome */}
              <Text className="text-gray-600 font-semibold mb-2">Nome do Culto</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-800"
                placeholder="Ex: Culto de Ensino"
                placeholderTextColor="#9CA3AF"
                value={eventName}
                onChangeText={setEventName}
              />
            </View>

            {/* Botões */}
            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                className="flex-1 bg-gray-100 rounded-lg py-3"
              >
                <Text className="text-gray-700 font-semibold text-center">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 rounded-lg py-3"
                style={{ opacity: saving ? 0.5 : 1 }}
              >
                {saving ? (
                  <Text className="text-white font-semibold text-center">Salvando...</Text>
                ) : (
                  <Text className="text-white font-semibold text-center">
                    {editingDay ? 'Atualizar' : 'Adicionar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
