import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { format, startOfDay } from 'date-fns';
import { Scale, TeamMember } from '@/types';

export function useMyScales() {
  const [scales, setScales] = useState<Scale[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedScale, setSelectedScale] = useState<Scale | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const fetchMyScales = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('department_members')
        .select('id')
        .eq('user_id', user.id);

      if (!memberData || memberData.length === 0) {
        setLoading(false);
        return;
      }

      const memberIds = memberData.map(m => m.id);
      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

      const { data: scaleData } = await supabase
        .from('rosters')
        .select(`
          id,
          schedule_date,
          department_id,
          service_day_id,
          department_functions ( name ),
          departments ( name ),
          service_days ( name )
        `)
        .in('member_id', memberIds)
        .gte('schedule_date', today)
        .order('schedule_date', { ascending: true });

      if (scaleData) {
        setScales(scaleData as Scale[]);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyScales();
  }, [fetchMyScales]);

  const handleOpenScaleDetails = async (scale: Scale) => {
    setSelectedScale(scale);
    setModalVisible(true);
    setLoadingTeam(true);

    try {
      const { data } = await supabase
        .from('rosters')
        .select(`
          id,
          department_functions ( name ),
          department_members (
            profiles ( full_name, phone )
          )
        `)
        .eq('department_id', scale.department_id)
        .eq('schedule_date', scale.schedule_date)
        .eq('service_day_id', scale.service_day_id);

      if (data) {
        const team: TeamMember[] = data.map((item: any) => {
          const funcName = Array.isArray(item.department_functions) ? item.department_functions[0]?.name : item.department_functions?.name;
          const profile = Array.isArray(item.department_members?.profiles) ? item.department_members.profiles[0] : item.department_members?.profiles;
          
          return {
            id: item.id,
            function_name: funcName || 'Sem função',
            member_name: profile?.full_name || 'Usuário',
            member_phone: profile?.phone || null
          };
        });

        team.sort((a, b) => a.function_name.localeCompare(b.function_name));
        setTeamMembers(team);
      }
    } catch (error) {
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleOpenWhatsApp = (phone: string | null, name: string) => {
    if (!phone) return;
    const cleanNumber = phone.replace(/\D/g, '');
    const message = `Olá ${name}, vi que estamos escalados juntos!`;
    const url = `whatsapp://send?phone=55${cleanNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://wa.me/55${cleanNumber}?text=${encodeURIComponent(message)}`);
      }
    }).catch(() => {});
  };

  const getSafeName = (obj: any) => Array.isArray(obj) ? obj[0]?.name : obj?.name;

  return {
    scales,
    loading,
    modalVisible,
    setModalVisible,
    selectedScale,
    teamMembers,
    loadingTeam,
    handleOpenScaleDetails,
    handleOpenWhatsApp,
    getSafeName
  };
}