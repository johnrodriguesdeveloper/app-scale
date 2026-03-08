import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, getDate, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTargetMonthDate } from '@/utils/getTargetMonthDate';
import { ServiceDay, AvailabilityRoutine, AvailabilityException } from '@/types';

export const fullDayNames = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export function useAvailability() {
  const minDate = getTargetMonthDate(); 

  const [currentMonth, setCurrentMonth] = useState(minDate);
  const [serviceDays, setServiceDays] = useState<ServiceDay[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRoutine[]>([]);
  const [monthExceptions, setMonthExceptions] = useState<AvailabilityException[]>([]);
  
  const [expandedCalendar, setExpandedCalendar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  const loadData = useCallback(async () => {
    try {
      const { data: serviceData } = await supabase
        .from('service_days')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (serviceData) setServiceDays(serviceData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: routineData } = await supabase
        .from('availability_routine')
        .select('*')
        .eq('user_id', user.id);

      if (routineData) setAvailability(routineData);

    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonthExceptions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const { data } = await supabase
        .from('availability_exceptions')
        .select('*')
        .eq('user_id', user.id)
        .gte('specific_date', start.toISOString())
        .lte('specific_date', end.toISOString());

      if (data) setMonthExceptions(data);

    } catch (error) {
    }
  }, [currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (serviceDays.length > 0) {
      loadMonthExceptions();
    }
  }, [currentMonth, serviceDays, loadMonthExceptions]);

  useEffect(() => {
    if (serviceDays.length > 0) {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const daysInterval = eachDayOfInterval({ start, end });
      const calendarItems: any[] = [];

      daysInterval.forEach(date => {
        const dayOfWeek = getDay(date);
        const daysServices = serviceDays.filter(s => s.day_of_week === dayOfWeek);

        daysServices.forEach(service => {
          const routine = availability.find(r => r.service_day_id === service.id);
          const isRoutineAvailable = routine ? routine.is_available : true; 

          const dateStr = format(date, 'yyyy-MM-dd');
          const exception = monthExceptions.find(e => 
            e.specific_date === dateStr && 
            (e.service_day_id === service.id || e.service_day_id === null)
          );

          const finalStatus = exception ? exception.is_available : isRoutineAvailable;

          calendarItems.push({
            date: date,
            dateStr: dateStr,
            service: service,
            isAvailable: finalStatus,
            isException: !!exception,
            key: `${dateStr}-${service.id}`
          });
        });
      });

      setExpandedCalendar(calendarItems);
    }
  }, [availability, monthExceptions, currentMonth, serviceDays]);

  const handleToggleRoutine = async (serviceDayId: string, value: boolean) => {
    setSaving(prev => ({ ...prev, [serviceDayId]: true }));
    
    const targetService = serviceDays.find(sd => sd.id === serviceDayId);
    if (!targetService) {
      setSaving(prev => ({ ...prev, [serviceDayId]: false }));
      return;
    }

    const targetDayOfWeek = targetService.day_of_week;

    
    setAvailability(prev => {
      const filtered = prev.filter(a => a.service_day_id !== serviceDayId);
      return [...filtered, { user_id: 'temp', service_day_id: serviceDayId, is_available: value }];
    });


    setMonthExceptions(prev => prev.filter(e => {

      const exceptionDate = parse(e.specific_date, 'yyyy-MM-dd', new Date());
      return getDay(exceptionDate) !== targetDayOfWeek;
    }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;


      const { error: routineError } = await supabase.from('availability_routine').upsert({
        user_id: user.id, service_day_id: serviceDayId, is_available: value
      }, { onConflict: 'user_id,service_day_id' });

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

    } catch (e) { 
      Alert.alert("Erro", "Não foi possível sincronizar a rotina.");
      await loadData();
    } finally {
      await loadMonthExceptions();
      setSaving(prev => ({ ...prev, [serviceDayId]: false }));
    }
  };

  const handleToggleException = async (item: any, newValue: boolean) => {
    const itemKey = item.key;
    setSaving(prev => ({ ...prev, [itemKey]: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const optimisticException = {
        user_id: user.id,
        specific_date: item.dateStr,
        service_day_id: item.service.id,
        is_available: newValue
      };

      setMonthExceptions(prev => {
        const filtered = prev.filter(e => 
          !(e.specific_date === item.dateStr && e.service_day_id === item.service.id)
        );
        return [...filtered, optimisticException];
      });

      const { error } = await supabase
        .from('availability_exceptions')
        .upsert(optimisticException, {
          onConflict: 'user_id,specific_date,service_day_id'
        });

      if (error) throw error;

    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar.");
      loadMonthExceptions();
    } finally {
      setSaving(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return {
    currentMonth,
    serviceDays,
    availability,
    expandedCalendar,
    loading,
    saving,
    isAtMinDate: isSameDay(startOfMonth(currentMonth), minDate),
    dayOfMonth: getDate(new Date()),
    handlePrevMonth,
    handleNextMonth,
    handleToggleException,
    handleToggleRoutine
  };
}