import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Calendar, AlertCircle, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getUpcomingRosters } from '@/services/rosterService';
import { useDeadlineCheck } from '@/hooks/useDeadlineCheck';

export default function DashboardScreen() {
  const router = useRouter();
  const [upcomingRosters, setUpcomingRosters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  // Buscar organização e departamento do usuário
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

        // Buscar primeiro departamento do usuário
        const { data: deptMember } = await supabase
          .from('department_members')
          .select('department_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (deptMember) {
          setDepartmentId(deptMember.department_id);
        }
      }
    }

    loadUserData();
  }, []);

  // Verificar deadline
  const deadlineCheck = useDeadlineCheck(departmentId, organizationId);

  // Buscar próximas escalas
  useEffect(() => {
    async function loadRosters() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organizationId) return;

      try {
        const rosters = await getUpcomingRosters(user.id, organizationId, 5);
        setUpcomingRosters(rosters || []);
      } catch (error) {
        console.error('Erro ao carregar escalas:', error);
      } finally {
        setLoading(false);
      }
    }

    if (organizationId) {
      loadRosters();
    }
  }, [organizationId]);

  const nextRoster = upcomingRosters[0];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Card Principal: Próxima Escala */}
        {nextRoster && (
          <View className="bg-white rounded-xl p-6 mb-4 shadow-sm border border-gray-200">
            <Text className="text-sm text-gray-500 mb-2">Sua próxima escala</Text>
            <Text className="text-2xl font-bold text-gray-900 mb-1">
              {new Date(nextRoster.date).toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
            <Text className="text-lg text-gray-700">
              {nextRoster.function?.name} ({nextRoster.department?.name})
            </Text>
          </View>
        )}

        {/* Widget de Calendário Semanal */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Calendário Semanal
          </Text>
          <View className="flex-row justify-between">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => {
              const hasRoster = upcomingRosters.some(
                (r) => new Date(r.date).getDay() === index
              );
              return (
                <View key={day} className="items-center">
                  <Text className="text-xs text-gray-500 mb-2">{day}</Text>
                  <View
                    className={`w-8 h-8 rounded-full ${
                      hasRoster ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Botão de Ação Rápida */}
        {deadlineCheck.canEdit && (
          <TouchableOpacity
            onPress={() => router.push('/availability')}
            className="bg-blue-500 rounded-xl p-4 mb-4"
          >
            <View className="flex-row items-center justify-center">
              <Calendar size={20} color="white" className="mr-2" />
              <Text className="text-white font-semibold text-lg">
                Informar Disponibilidade
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {deadlineCheck.isPastDeadline && (
          <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <View className="flex-row items-center">
              <AlertCircle size={20} color="#f59e0b" className="mr-2" />
              <Text className="text-yellow-800 flex-1">
                O prazo para informar disponibilidade encerrou. Aguarde o próximo mês.
              </Text>
            </View>
          </View>
        )}

        {/* Lista de Próximas Escalas */}
        {upcomingRosters.length > 0 && (
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Próximas Escalas
            </Text>
            {upcomingRosters.map((roster) => (
              <View
                key={roster.id}
                className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    {new Date(roster.date).toLocaleDateString('pt-BR')}
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    {roster.function?.name} - {roster.department?.name}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Botão Minha Disponibilidade */}
        <TouchableOpacity
          onPress={() => router.push('/availability/routine')}
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 mb-4 shadow-md border border-blue-200"
        >
          <View className="flex-row items-center justify-center">
            <Clock size={20} color="white" className="mr-2" />
            <Text className="text-white font-semibold text-lg">
              Minha Disponibilidade
            </Text>
          </View>
          <Text className="text-blue-100 text-center text-sm mt-2">
            Defina seus dias disponíveis para escalas
          </Text>
        </TouchableOpacity>

        {loading && (
          <View className="items-center py-8">
            <Text className="text-gray-500">Carregando...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
