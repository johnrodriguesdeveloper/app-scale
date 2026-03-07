import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, isBefore, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ServiceDay, AvailabilityRoutine, AvailabilityException } from '@/types';

export const fullDayNames = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export function useAvailability() {
  const minDate = startOfMonth(addMonths(new Date(), 1));
  const [currentDate, setCurrentDate] = useState(minDate);
  const [serviceDays, setServiceDays] = useState<ServiceDay[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRoutine[]>([]);
  const [monthExceptions, setMonthExceptions] = useState<AvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  async function loadData() {
    try {
      const { data: serviceData, error: serviceError } = await supabase
        .from('service_days')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (serviceError) throw serviceError;
      if (serviceData) setServiceDays(serviceData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: availabilityData, error: availabilityError } = await supabase
        .from('availability_routine')
        .select('*')
        .eq('user_id', user.id);

      if (availabilityError) throw availabilityError;
      if (availabilityData) setAvailability(availabilityData);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMonthExceptions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startOfMonthDate = startOfMonth(currentDate);
      const endOfMonthDate = endOfMonth(currentDate);

      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('availability_exceptions')
        .select('*')
        .eq('user_id', user.id)
        .gte('specific_date', format(startOfMonthDate, 'yyyy-MM-dd'))
        .lte('specific_date', format(endOfMonthDate, 'yyyy-MM-dd'));

      if (exceptionsError) throw exceptionsError;
      if (exceptionsData) setMonthExceptions(exceptionsData);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as exceções.');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (serviceDays.length > 0) {
      loadMonthExceptions();
    }
  }, [currentDate, serviceDays]);

  const handlePrevMonth = () => {
    const prevMonth = subMonths(currentDate, 1);
    if (isBefore(prevMonth, minDate)) {
      Alert.alert("Bloqueado", "Você só pode alterar a disponibilidade a partir do próximo mês.");
      return;
    }
    setCurrentDate(prevMonth);
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const isAvailable = (serviceDayId: string) => {
    const dayAvailability = availability.find(a => a.service_day_id === serviceDayId);
    return dayAvailability ? dayAvailability.is_available : true;
  };

  const getDayAvailabilityForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const exception = monthExceptions.find(e => e.specific_date === dateStr);
    

    if (exception) return exception.is_available;
    

    const dayOfWeek = getDay(date);
    const dayServiceDays = serviceDays.filter(sd => sd.day_of_week === dayOfWeek);
    
    if (dayServiceDays.length === 0) return true;

    return dayServiceDays.some(sd => isAvailable(sd.id));
  };

  const getFilteredDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const allDays = eachDayOfInterval({ start, end });
    const serviceDayOfWeeks = serviceDays.map(sd => sd.day_of_week);
    return allDays.filter(day => serviceDayOfWeeks.includes(getDay(day)));
  };

  const handleToggleRoutine = async (serviceDayId: string, newValue: boolean) => {
    setSaving(prev => ({ ...prev, [serviceDayId]: true }));

    const targetService = serviceDays.find(sd => sd.id === serviceDayId);
    if (!targetService) {
      setSaving(prev => ({ ...prev, [serviceDayId]: false }));
      return;
    }

    const targetDayOfWeek = targetService.day_of_week;


    setAvailability(prev => {
      const filtered = prev.filter(a => a.service_day_id !== serviceDayId);
      return [...filtered, { user_id: 'temp', service_day_id: serviceDayId, is_available: newValue }];
    });

    setMonthExceptions(prev => prev.filter(e => {
  
      const exceptionDate = parse(e.specific_date, 'yyyy-MM-dd', new Date());
      return getDay(exceptionDate) !== targetDayOfWeek;
    }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

   
      const { error: routineError } = await supabase
        .from('availability_routine')
        .upsert({ user_id: user.id, service_day_id: serviceDayId, is_available: newValue }, { onConflict: 'user_id,service_day_id' });

      if (routineError) throw routineError;


      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const { data: futureExceptions } = await supabase
        .from('availability_exceptions')
        .select('specific_date')
        .eq('user_id', user.id)
        .gte('specific_date', todayStr);

      if (futureExceptions && futureExceptions.length > 0) {
 
        const datesToDelete = futureExceptions
          .filter(e => {
            const exceptionDate = parse(e.specific_date, 'yyyy-MM-dd', new Date());
            return getDay(exceptionDate) === targetDayOfWeek;
          })
          .map(e => e.specific_date);


        if (datesToDelete.length > 0) {
          await supabase
            .from('availability_exceptions')
            .delete()
            .eq('user_id', user.id)
            .in('specific_date', datesToDelete);
        }
      }

    } catch (error) {

      await loadData();
    } finally {
      await loadMonthExceptions();
      setSaving(prev => ({ ...prev, [serviceDayId]: false }));
    }
  };

  const handleToggleException = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const currentAvailability = getDayAvailabilityForDate(date);
    const newAvailability = !currentAvailability;
    
    setSaving(prev => ({ ...prev, [dateStr]: true }));
    

    setMonthExceptions(prev => {
      const filtered = prev.filter(e => e.specific_date !== dateStr);
      return [...filtered, { user_id: 'temp', specific_date: dateStr, is_available: newAvailability }];
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('availability_exceptions')
        .upsert({ user_id: user.id, specific_date: dateStr, is_available: newAvailability }, { onConflict: 'user_id,specific_date' });

      if (error) throw error;
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a alteração.');
    } finally {
      await loadMonthExceptions();
      setSaving(prev => ({ ...prev, [dateStr]: false }));
    }
  };

  return {
    currentDate,
    minDate,
    serviceDays,
    loading,
    saving,
    isAtMinDate: isSameDay(startOfMonth(currentDate), minDate),
    handlePrevMonth,
    handleNextMonth,
    isAvailable,
    getDayAvailabilityForDate,
    getFilteredDaysInMonth,
    handleToggleRoutine,
    handleToggleException
  };
}