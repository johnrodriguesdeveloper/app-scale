import { View, Text, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUpcomingRosters } from '@/services/rosterService';

export default function CalendarScreen() {
  const [rosters, setRosters] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

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
      }
    }

    loadUserData();
  }, []);

  useEffect(() => {
    async function loadRosters() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organizationId) return;

      try {
        const data = await getUpcomingRosters(user.id, organizationId, 30);
        setRosters(data || []);
      } catch (error) {
        console.error('Erro ao carregar escalas:', error);
      }
    }

    if (organizationId) {
      loadRosters();
    }
  }, [organizationId]);

  const groupedRosters = rosters.reduce((acc, roster) => {
    const month = new Date(roster.date).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(roster);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Calendário</Text>

        {Object.entries(groupedRosters).map(([month, monthRosters]) => (
          <View key={month} className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">{month}</Text>
            <View className="bg-white rounded-xl shadow-sm border border-gray-200">
              {monthRosters.map((roster) => (
                <View
                  key={roster.id}
                  className="flex-row items-center justify-between py-4 px-4 border-b border-gray-100 last:border-b-0"
                >
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">
                      {new Date(roster.date).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      {roster.function?.name} - {roster.department?.name}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {rosters.length === 0 && (
          <View className="items-center py-8">
            <Text className="text-gray-500">Nenhuma escala encontrada</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
