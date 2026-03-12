import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { DepartmentFunction, DepartmentMemberSetting } from '@/types';

export function useDepartmentSettings(departmentId: string | string[] | undefined) {
  const [functions, setFunctions] = useState<DepartmentFunction[]>([]);
  const [members, setMembers] = useState<DepartmentMemberSetting[]>([]);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [loading, setLoading] = useState(false);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    targetId: '',
    loading: false
  });

  const loadFunctions = useCallback(async () => {
    if (!departmentId) return;
    const { data } = await supabase
      .from('department_functions')
      .select('id, name')
      .eq('department_id', String(departmentId))
      .order('name');

    if (data) setFunctions(data);
  }, [departmentId]);

  const loadMembers = useCallback(async () => {
    if (!departmentId) return;
    const { data } = await supabase
      .from('department_members')
      .select(`
        user_id,
        profiles!inner(id, full_name, email),
        member_functions(function_id, department_functions(id, name))
      `)
      .eq('department_id', String(departmentId));

    if (data) {
      const formattedMembers = data.map((m: any) => ({
        user_id: m.user_id,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
        member_functions: m.member_functions || []
      }));
      setMembers(formattedMembers as DepartmentMemberSetting[]);
    }
  }, [departmentId]);

  useEffect(() => {
    loadFunctions();
    loadMembers();
  }, [loadFunctions, loadMembers]);

  const addFunction = async () => {
    if (!newFunctionName.trim() || !departmentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('department_functions')
        .insert({
          department_id: String(departmentId),
          name: newFunctionName.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      setFunctions(prev => [...prev, data]);
      setNewFunctionName('');
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert(error.message);
      else Alert.alert('Erro', error.message || 'Erro ao adicionar função');
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteFunction = (functionId: string, functionName: string) => {
    setConfirmConfig({
      title: 'Remover Função',
      message: `Tem certeza que deseja remover a função "${functionName}"? Isso não afetará as escalas já criadas.`,
      targetId: functionId,
      loading: false
    });
    setConfirmModalVisible(true);
  };

  const executeDeleteFunction = async () => {
    setConfirmConfig(prev => ({ ...prev, loading: true }));
    try {
      const { error } = await supabase
        .from('department_functions')
        .delete()
        .eq('id', confirmConfig.targetId);

      if (error) throw error;
      setFunctions(prev => prev.filter(f => f.id !== confirmConfig.targetId));
      await loadMembers();
      setConfirmModalVisible(false);
    } catch (error: any) {
      if (Platform.OS === 'web') window.alert(error.message);
      else Alert.alert('Erro', error.message);
      setConfirmModalVisible(false);
    } finally {
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };

  const toggleMemberFunction = async (memberId: string, functionId: string, hasFunction: boolean) => {
    try {
      if (hasFunction) {
        const { error } = await supabase
          .from('member_functions')
          .delete()
          .eq('user_id', memberId)
          .eq('function_id', functionId);
        if (!error) await loadMembers();
      } else {
        const { error } = await supabase
          .from('member_functions')
          .insert({
            user_id: memberId,
            function_id: functionId,
          });
        if (!error) await loadMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return {
    functions,
    members,
    newFunctionName,
    setNewFunctionName,
    loading,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmConfig,
    addFunction,
    requestDeleteFunction,
    executeDeleteFunction,
    toggleMemberFunction
  };
}