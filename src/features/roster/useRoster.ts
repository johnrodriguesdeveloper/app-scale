import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { RosterFunction, RosterMember, RosterEntry } from '@/types';

export function useRoster(departmentId: string | string[] | undefined) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [functions, setFunctions] = useState<RosterFunction[]>([]);
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [rosters, setRosters] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!departmentId) return;

    try {
      const { data: functionsData, error: functionsError } = await supabase
        .from('department_functions')
        .select('*')
        .eq('department_id', String(departmentId))
        .order('name');

      if (functionsError) throw functionsError;
      if (functionsData) setFunctions(functionsData);

      const { data: membersData, error: membersError } = await supabase
        .from('department_members')
        .select(`
          id,
          user_id,
          profiles!department_members_user_id_fkey ( name, email )
        `)
        .eq('department_id', String(departmentId));

      if (membersError) throw membersError;

      if (membersData) {
        const formattedMembers = membersData.map((member: any) => ({
          id: member.id,
          user_id: member.user_id,
          name: member.profiles?.name || 'Sem nome',
          email: member.profiles?.email
        }));
        setMembers(formattedMembers);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  const loadRosters = useCallback(async () => {
    if (!departmentId) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { data: rostersData, error: rostersError } = await supabase
        .from('rosters')
        .select(`
          id,
          department_id,
          function_id,
          member_id,
          schedule_date,
          profiles!rosters_member_id_fkey ( name, email )
        `)
        .eq('department_id', String(departmentId))
        .eq('schedule_date', dateStr);

      if (rostersError) throw rostersError;

      if (rostersData) {
        const formattedRosters = rostersData.map((roster: any) => ({
          id: roster.id,
          department_id: roster.department_id,
          function_id: roster.function_id,
          member_id: roster.member_id,
          schedule_date: roster.schedule_date,
          member: roster.profiles ? {
            id: roster.member_id,
            user_id: roster.member_id,
            name: roster.profiles.name,
            email: roster.profiles.email
          } : undefined
        }));
        setRosters(formattedRosters);
      }
    } catch (error) {
    }
  }, [departmentId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadRosters();
  }, [loadRosters]);

  const getRosterForFunction = (functionId: string) => {
    return rosters.find(r => r.function_id === functionId);
  };

  const addMemberToRoster = async (memberUserId: string, functionId: string) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const { error } = await supabase
      .from('rosters')
      .insert({
        department_id: String(departmentId),
        function_id: functionId,
        member_id: memberUserId,
        schedule_date: dateStr
      });

    if (error) throw new Error('Não foi possível adicionar o membro à escala');
    await loadRosters();
  };

  const removeMemberFromRoster = async (rosterId: string) => {
    const { error } = await supabase
      .from('rosters')
      .delete()
      .eq('id', rosterId);

    if (error) throw new Error('Não foi possível remover da escala');
    await loadRosters();
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return {
    currentDate,
    selectedDate,
    setSelectedDate,
    functions,
    members,
    loading,
    prevMonth,
    nextMonth,
    getDaysInMonth,
    getRosterForFunction,
    addMemberToRoster,
    removeMemberFromRoster,
    isSameDay
  };
}