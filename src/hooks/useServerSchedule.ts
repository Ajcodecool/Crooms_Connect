import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import type {
  BellSchedule,
  BellScheduleType,
  CustomPeriods,
  LunchType,
} from '../utils/databaseDefinitions';

export function useServerSchedule(session: Session): {
  periodName: string;
  rawPeriodName: string;
  timeLeft: string;
  scheduleData: BellSchedule;
  scheduleType: BellScheduleType;
  lunchType: LunchType;
  setLunchType: (newLunchType: LunchType) => Promise<void>;
} {
  const [periodName, setPeriodName] = useState('Loading...');
  const [rawPeriodName, setRawPeriodName] = useState('Loading...'); // Used for progress bar math
  const [timeLeft, setTimeLeft] = useState('--:--');
  const [scheduleData, setScheduleData] = useState<BellSchedule>([]);
  const [scheduleType, setScheduleType] =
    useState<BellScheduleType>('Standard');
  const [lunchType, setLunchType] = useState<LunchType>('A');

  const lunchTypeRef = useRef('A');
  const customPeriodsRef = useRef<CustomPeriods>({});

  const getMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return h * 60 + m;
  };

  const changeLunchType = async (newType: LunchType): Promise<void> => {
    setLunchType(newType);
    lunchTypeRef.current = newType;

    if (session?.user) {
      await supabase
        .from('profiles')
        .update({ lunch_type: newType })
        .eq('id', session.user.id);
    }
  };

  useEffect(() => {
    const fetchAndCalculate = async (): Promise<void> => {
      const now = new Date();
      const todayStr = now.toLocaleDateString('en-CA');
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });

      let myLunch: LunchType = 'A';
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('lunch_type, custom_periods')
          .eq('id', session.user.id)
          .maybeSingle();

        if (data?.lunch_type) myLunch = data.lunch_type;
        if (data?.custom_periods)
          customPeriodsRef.current = data.custom_periods;
      }
      setLunchType(myLunch);
      lunchTypeRef.current = myLunch;

      let activeType: BellScheduleType = 'Standard';
      if (dayName === 'Wednesday') activeType = 'Wednesday';
      else if (dayName === 'Thursday') activeType = 'Thursday';
      else if (dayName === 'Saturday' || dayName === 'Sunday')
        activeType = 'No School';

      try {
        const { data: override } = await supabase
          .from('schedule_overrides')
          .select('schedule_type')
          .eq('date', todayStr)
          .maybeSingle();

        if (override) activeType = override.schedule_type;
      } catch (err) {
        console.error('Override fetch error', err);
      }

      if (activeType === 'No School') {
        setPeriodName('No School');
        setRawPeriodName('No School');
        setTimeLeft('');
        setScheduleData([]);
        setScheduleType('No School');
        return;
      }

      const { data: bells, error } = await supabase
        .from('bell_schedules')
        .select('*')
        .eq('schedule_type', activeType)
        .order('order_index', { ascending: true });

      if (error || !bells) {
        setPeriodName('Error');
        setRawPeriodName('Error');
        return;
      }

      setScheduleData(bells);
      setScheduleType(activeType);
      calculateTime(bells);
    };

    const calculateTime = (bells: BellSchedule): void => {
      if (!bells || bells.length === 0) return;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const currentSeconds = now.getSeconds();

      const activeLunch = lunchTypeRef.current;
      const relevantBells = bells.filter((b) => {
        if (activeLunch === 'A' && b.period_name.includes('(B)')) return false;
        if (activeLunch === 'B' && b.period_name.includes('(A)')) return false;
        return true;
      });

      const currentBlock = relevantBells.find((b) => {
        const start = getMinutes(b.start_time);
        const end = getMinutes(b.end_time);
        return currentMinutes >= start && currentMinutes < end;
      });

      if (currentBlock) {
        const cleanName = currentBlock.period_name
          .replace(/\(A\)|\(B\)/g, '')
          .trim();
        setRawPeriodName(cleanName);

        // Use custom mapping if it exists, otherwise use original name
        const mappedName =
          customPeriodsRef.current[cleanName] &&
          customPeriodsRef.current[cleanName].trim() !== ''
            ? customPeriodsRef.current[cleanName]
            : cleanName;
        setPeriodName(mappedName);

        const endTotal = getMinutes(currentBlock.end_time);
        const diffInSeconds =
          endTotal * 60 - (currentMinutes * 60 + currentSeconds);

        const m = Math.floor(diffInSeconds / 60);
        const s = diffInSeconds % 60;
        setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
      } else {
        const nextBlock = relevantBells.find(
          (b) => getMinutes(b.start_time) > currentMinutes,
        );

        if (nextBlock) {
          const cleanName = nextBlock.period_name
            .replace(/\(A\)|\(B\)/g, '')
            .trim();
          const mappedName =
            customPeriodsRef.current[cleanName] &&
            customPeriodsRef.current[cleanName].trim() !== ''
              ? customPeriodsRef.current[cleanName]
              : cleanName;

          setRawPeriodName(`Passing to ${cleanName}`);
          setPeriodName(`Passing to ${mappedName}`);
          const startTotal = getMinutes(nextBlock.start_time);
          const diff = startTotal * 60 - (currentMinutes * 60 + currentSeconds);

          const m = Math.floor(diff / 60);
          const s = diff % 60;
          setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
        } else {
          const firstBlock = relevantBells[0];
          if (currentMinutes < getMinutes(firstBlock.start_time)) {
            setPeriodName('Before School');
            setRawPeriodName('Before School');
            setTimeLeft('');
          } else {
            setPeriodName('After School');
            setRawPeriodName('After School');
            setTimeLeft('');
          }
        }
      }
    };

    fetchAndCalculate();

    const timer = setInterval(() => {
      setScheduleData((currentData) => {
        if (currentData.length > 0) calculateTime(currentData);
        return currentData;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  return {
    periodName,
    rawPeriodName,
    timeLeft,
    scheduleData,
    scheduleType,
    lunchType,
    setLunchType: changeLunchType,
  };
}
