import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { NextScale } from '@/types';

export function useHome() {
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [nextScale, setNextScale] = useState<NextScale | null>(null);
  const [loadingScale, setLoadingScale] = useState(true);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name?.split(' ')[0] || 'Membro');
        setAvatarUrl(profile.avatar_url);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNextScale = useCallback(async () => {
    try {
      setLoadingScale(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberRecords } = await supabase
        .from('department_members')
        .select('id')
        .eq('user_id', user.id);

      if (!memberRecords || memberRecords.length === 0) {
        setNextScale(null);
        return;
      }

      const memberIds = memberRecords.map(m => m.id);
      const today = new Date().toISOString().split('T')[0];

      const { data: rosterData } = await supabase
        .from('rosters')
        .select(`
          schedule_date,
          department_functions ( name ),
          departments ( name ),
          service_days ( name )
        `)
        .in('member_id', memberIds)
        .gte('schedule_date', today)
        .order('schedule_date', { ascending: true })
        .limit(1)
        .single();

      if (rosterData) {
        setNextScale(rosterData as unknown as NextScale);
      } else {
        setNextScale(null);
      }

    } catch (error) {
      setNextScale(null);
    } finally {
      setLoadingScale(false);
    }
  }, []);

  return {
    userName,
    avatarUrl,
    loading,
    nextScale,
    loadingScale,
    fetchUserData,
    fetchNextScale
  };
}