import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GridColumn } from '@/types';

export function useDepartmentRosterGrid(departmentId: string | string[] | undefined) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);

  const [allServiceDays, setAllServiceDays] = useState<any[]>([]);
  const [functions, setFunctions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const [gridColumns, setGridColumns] = useState<GridColumn[]>([]);
  const [rosterEntries, setRosterEntries] = useState<any[]>([]);

  const [unavailableUsers, setUnavailableUsers] = useState<any[]>([]);
  const [busyUsers, setBusyUsers] = useState<any[]>([]);

  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    functionId: string;
    functionName: string;
    serviceId: string;
    date: Date;
    currentRosterId?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadStructure = useCallback(async () => {
    if (!departmentId) return;

    const [servicesRes, funcsRes, membersRes] = await Promise.all([
      supabase.from('service_days').select('*').order('day_of_week'),
      supabase.from('department_functions').select('*').eq('department_id', String(departmentId)).order('name'),
      supabase.from('department_members').select(`
        id, user_id,
        member_functions ( function_id ),
        profiles:user_id ( full_name, avatar_url )
      `).eq('department_id', String(departmentId))
    ]);

    if (servicesRes.data) setAllServiceDays(servicesRes.data);
    if (funcsRes.data) setFunctions(funcsRes.data);
    
    if (membersRes.data) {
      const formattedMembers = membersRes.data.map((m: any) => ({
        ...m,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      }));
      setMembers(formattedMembers);
    }
  }, [departmentId]);

  const loadMonthData = useCallback(async () => {
    if (!departmentId || allServiceDays.length === 0) return;
    setLoading(true);

    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const days = eachDayOfInterval({ start, end });
      const cols: GridColumn[] = [];
      days.forEach(day => {
        const dayOfWeek = getDay(day);
        const servicesForDay = allServiceDays.filter(sd => sd.day_of_week === dayOfWeek);
        servicesForDay.forEach(service => {
          cols.push({ date: day, dateStr: format(day, 'yyyy-MM-dd'), service });
        });
      });
      setGridColumns(cols);

      const { data: rosters } = await supabase
        .from('rosters')
        .select(`
          id, function_id, member_id, service_day_id, schedule_date,
          department_members:member_id ( user_id, profiles:user_id ( full_name ) )
        `)
        .eq('department_id', String(departmentId))
        .gte('schedule_date', startStr)
        .lte('schedule_date', endStr);

      if (rosters) {
        const formattedRosters = rosters.map((r: any) => {
          const profiles = r.department_members?.profiles;
          const fullName = Array.isArray(profiles) ? profiles[0]?.full_name : profiles?.full_name;
          return {
            ...r,
            member_name: fullName || 'Escalado'
          };
        });
        setRosterEntries(formattedRosters);
      }

      const { data: exceptions } = await supabase
        .from('availability_exceptions')
        .select('user_id, service_day_id, specific_date')
        .eq('is_available', false)
        .gte('specific_date', startStr)
        .lte('specific_date', endStr);

      if (exceptions) setUnavailableUsers(exceptions);

      const { data: conflicts } = await supabase
        .from('rosters')
        .select('schedule_date, service_day_id, department_members!inner ( user_id )')
        .gte('schedule_date', startStr)
        .lte('schedule_date', endStr);

      if (conflicts) {
        setBusyUsers(conflicts.map((c: any) => ({
          user_id: c.department_members?.user_id,
          service_day_id: c.service_day_id,
          schedule_date: c.schedule_date
        })));
      }

    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [departmentId, currentMonth, allServiceDays]);

  useEffect(() => {
    loadStructure();
  }, [loadStructure]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getRosterInCell = (functionId: string, dateStr: string, serviceId: string) => {
    return rosterEntries.find(e =>
      e.function_id === functionId &&
      e.schedule_date === dateStr &&
      e.service_day_id === serviceId
    );
  };

  const getFilteredMembers = () => {
    if (!selectedCell) return [];
    const dateStr = format(selectedCell.date, 'yyyy-MM-dd');

    return members.filter(member => {
      const hasFunction = member.member_functions?.some(
        (mf: any) => mf.function_id === selectedCell.functionId
      );

      const isUnavailable = unavailableUsers.some(
        u => u.user_id === member.user_id &&
        u.specific_date === dateStr &&
        (u.service_day_id === selectedCell.serviceId || u.service_day_id === null)
      );

      const isBusy = busyUsers.some(
        b => b.user_id === member.user_id &&
        b.schedule_date === dateStr &&
        b.service_day_id === selectedCell.serviceId
      );

      return hasFunction && !isUnavailable && !isBusy;
    });
  };

  const handleAddMember = async (memberDbId: string) => {
    if (!selectedCell) return;
    setSaving(true);
    try {
      if (selectedCell.currentRosterId) {
        await supabase.from('rosters').delete().eq('id', selectedCell.currentRosterId);
      }

      const { error } = await supabase.from('rosters').insert({
        department_id: String(departmentId),
        function_id: selectedCell.functionId,
        member_id: memberDbId,
        service_day_id: selectedCell.serviceId,
        schedule_date: format(selectedCell.date, 'yyyy-MM-dd')
      });

      if (error) throw error;
      setShowMemberSelect(false);
      await loadMonthData();
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert(err.message);
      else Alert.alert("Erro", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDirectly = async (rosterId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('rosters').delete().eq('id', rosterId);
      if (error) throw error;
      setShowMemberSelect(false);
      await loadMonthData();
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert(err.message);
      else Alert.alert("Erro", err.message);
    } finally {
      setSaving(false);
    }
  };

  return {
    currentMonth,
    loading,
    gridColumns,
    functions,
    showMemberSelect,
    setShowMemberSelect,
    selectedCell,
    setSelectedCell,
    saving,
    prevMonth,
    nextMonth,
    getRosterInCell,
    getFilteredMembers,
    handleAddMember,
    handleRemoveDirectly
  };
}