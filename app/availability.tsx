import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Calendar, Save, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useDeadlineCheck } from '@/hooks/useDeadlineCheck';

export default function AvailabilityScreen() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  // Buscar dados do usuário
  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setOrganizationId(profile.organization_id);

        // Buscar departamentos do usuário
        const { data: deptMembers } = await supabase
          .from('department_members')
          .select('department_id, departments(id, name)')
          .eq('user_id', user.id);

        if (deptMembers) {
          const depts = deptMembers.map((dm: any) => ({
            id: dm.department_id,
            name: dm.departments.name,
          }));
          setDepartments(depts);
          if (depts.length > 0) {
            setSelectedDepartment(depts[0].id);
            setDepartmentId(depts[0].id);
          }
        }
      }
    }

    loadUserData();
  }, []);

  // Verificar deadline
  const deadlineCheck = useDeadlineCheck(selectedDepartment, organizationId);

  // Carregar disponibilidade do mês
  useEffect(() => {
    async function loadAvailability() {
      if (!organizationId || !selectedDepartment) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const { data } = await supabase
        .from('availability')
        .select('date, status')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .gte('date', firstDay.toISOString().split('T')[0])
        .lte('date', lastDay.toISOString().split('T')[0]);

      if (data) {
        const availMap: Record<string, boolean> = {};
        data.forEach((item) => {
          availMap[item.date] = item.status;
        });
        setAvailability(availMap);
      }
    }

    loadAvailability();
  }, [selectedMonth, organizationId, selectedDepartment]);

  const toggleAvailability = (date: Date) => {
    if (deadlineCheck.isPastDeadline) {
      Alert.alert('Prazo Encerrado', 'O prazo para informar disponibilidade já passou.');
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    setAvailability((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  const saveAvailability = async () => {
    if (!organizationId || deadlineCheck.isPastDeadline) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const updates = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const status = availability[dateStr] ?? false;

        updates.push({
          user_id: user.id,
          organization_id: organizationId,
          date: dateStr,
          status,
        });
      }

      // Upsert em lote
      const { error } = await supabase.from('availability').upsert(updates, {
        onConflict: 'user_id,organization_id,date',
      });

      if (error) throw error;

      Alert.alert('Sucesso', 'Disponibilidade salva com sucesso!');
      router.back();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao salvar disponibilidade');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    // Dias vazios no início
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">Disponibilidade</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Seleção de Departamento */}
        {departments.length > 1 && (
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">Departamento:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {departments.map((dept) => (
                <TouchableOpacity
                  key={dept.id}
                  onPress={() => {
                    setSelectedDepartment(dept.id);
                    setDepartmentId(dept.id);
                  }}
                  className={`px-4 py-2 rounded-lg mr-2 ${
                    selectedDepartment === dept.id
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={
                      selectedDepartment === dept.id
                        ? 'text-white font-semibold'
                        : 'text-gray-700'
                    }
                  >
                    {dept.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Aviso de Deadline */}
        {deadlineCheck.isPastDeadline && (
          <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <Text className="text-yellow-800 text-sm">
              ⚠️ O prazo para informar disponibilidade encerrou no dia{' '}
              {deadlineCheck.deadlineDay} deste mês.
            </Text>
          </View>
        )}

        {!deadlineCheck.isPastDeadline && deadlineCheck.daysRemaining !== null && (
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <Text className="text-blue-800 text-sm">
              📅 Você tem {deadlineCheck.daysRemaining} dias para informar sua disponibilidade.
            </Text>
          </View>
        )}
      </View>

      <ScrollView className="flex-1 p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </Text>

        {/* Calendário */}
        <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <View className="flex-row justify-between mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <Text key={day} className="text-xs text-gray-500 text-center flex-1">
                {day}
              </Text>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {getDaysInMonth().map((date, index) => {
              if (!date) {
                return <View key={index} className="w-[14.28%] aspect-square" />;
              }

              const dateStr = date.toISOString().split('T')[0];
              const isAvailable = availability[dateStr] ?? false;
              const isPastDeadline = deadlineCheck.isPastDeadline;

              return (
                <TouchableOpacity
                  key={dateStr}
                  onPress={() => toggleAvailability(date)}
                  disabled={isPastDeadline}
                  className={`w-[14.28%] aspect-square items-center justify-center ${
                    isPastDeadline ? 'opacity-50' : ''
                  }`}
                >
                  <Text className="text-xs text-gray-600 mb-1">{date.getDate()}</Text>
                  <View
                    className={`w-6 h-6 rounded-full ${
                      isAvailable ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="flex-row items-center justify-center mt-4 space-x-4">
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded-full bg-green-500 mr-2" />
              <Text className="text-xs text-gray-600">Disponível</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded-full bg-gray-200 mr-2" />
              <Text className="text-xs text-gray-600">Indisponível</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {!deadlineCheck.isPastDeadline && (
        <View className="bg-white border-t border-gray-200 p-4">
          <TouchableOpacity
            onPress={saveAvailability}
            disabled={loading}
            className="bg-blue-500 rounded-xl p-4 items-center"
          >
            <Text className="text-white font-semibold text-lg">
              {loading ? 'Salvando...' : 'Salvar Disponibilidade'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
