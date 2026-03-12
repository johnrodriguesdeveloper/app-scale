import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { DepartmentLeader, LeaderSearchResult } from '@/types/department-leaders';


export function useDepartmentLeaders(departmentId: string | string[] | undefined) {
  const [leaders, setLeaders] = useState<DepartmentLeader[]>([]);
  const [searchResults, setSearchResults] = useState<LeaderSearchResult[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    targetId: '',
    loading: false
  });

  const fetchOrganizationId = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.organization_id) {
        setCurrentOrgId(profile.organization_id);
      }
    } catch (error) {}
  }, []);

  const fetchLeaders = useCallback(async () => {
    if (!departmentId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('department_leaders')
        .select(`
          id,
          user_id,
          profiles:user_id (id, full_name, email, avatar_url)
        `)
        .eq('department_id', String(departmentId))
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setLeaders(data as DepartmentLeader[]);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchOrganizationId();
    fetchLeaders();
  }, [fetchOrganizationId, fetchLeaders]);

  const searchUsers = async (text: string) => {
    setSearchText(text);
    
    if (text.length < 3 || !currentOrgId) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('organization_id', currentOrgId)
        .ilike('full_name', `%${text}%`)
        .neq('org_role', 'master')
        .limit(10);

      if (error) throw error;

      const leaderUserIds = leaders.map(leader => leader.user_id);
      const availableUsers = (data || []).filter(
        user => !leaderUserIds.includes(user.id)
      );

      setSearchResults(availableUsers as LeaderSearchResult[]);
    } catch (error) {
    } finally {
      setSearching(false);
    }
  };

  const handleAddLeader = async (userId: string) => {
    if (!departmentId) return;
    try {
      const { error } = await supabase
        .from('department_leaders')
        .insert({
          department_id: String(departmentId),
          user_id: userId
        });

      if (error) {
        if (error.code === '23505') {
          if (Platform.OS === 'web') window.alert('Este usuário já é líder deste departamento.');
          else Alert.alert('Aviso', 'Este usuário já é líder deste departamento.');
        } else {
          throw error;
        }
        return;
      }

      setSearchText('');
      setSearchResults([]);
      await fetchLeaders();
    } catch (error: any) {
      const msg = error.message || 'Não foi possível adicionar o líder.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Erro', msg);
    }
  };

  const requestRemoveLeader = (leaderId: string, userName: string) => {
    setConfirmConfig({
      title: 'Remover Líder',
      message: `Tem certeza que deseja remover ${userName} como líder deste departamento?`,
      targetId: leaderId,
      loading: false
    });
    setConfirmModalVisible(true);
  };

  const executeRemoveLeader = async () => {
    setConfirmConfig(prev => ({ ...prev, loading: true }));
    try {
      const { error } = await supabase
        .from('department_leaders')
        .delete()
        .eq('id', confirmConfig.targetId);

      if (error) throw error;
      await fetchLeaders();
      setConfirmModalVisible(false);
    } catch (error) {
      if (Platform.OS === 'web') window.alert('Não foi possível remover o líder.');
      else Alert.alert('Erro', 'Não foi possível remover o líder.');
      setConfirmModalVisible(false);
    } finally {
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };

  return {
    leaders,
    searchResults,
    searchText,
    loading,
    searching,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmConfig,
    searchUsers,
    handleAddLeader,
    requestRemoveLeader,
    executeRemoveLeader
  };
}