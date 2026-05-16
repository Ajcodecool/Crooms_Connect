import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ScheduleEditor = ({ session }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data State
  const [allSchedules, setAllSchedules] = useState([]);
  const [selectedType, setSelectedType] = useState('Standard');
  const [scheduleTypes, setScheduleTypes] = useState([
    'Standard',
    'Wednesday',
    'Thursday',
    'Activity',
  ]);

  // Override State
  const [currentOverride, setCurrentOverride] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      // Simple verify check
      const { data } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', session.user.id)
        .single();
      if (!data?.is_verified) {
        navigate('/');
        return;
      }

      await Promise.all([fetchSchedules(), fetchCurrentOverride()]);
      setLoading(false);
    };

    checkAdmin();
  }, [session, navigate]);

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from('bell_schedules')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error) {
      setAllSchedules(data);
      // Extract unique types dynamically
      const types = [...new Set(data.map((item) => item.schedule_type))];
      if (types.length > 0) setScheduleTypes(types);
    }
  };

  const fetchCurrentOverride = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['schedule_override_date', 'schedule_override_type']);
    if (data) {
      const date = data.find((s) => s.key === 'schedule_override_date')?.value;
      const type = data.find((s) => s.key === 'schedule_override_type')?.value;
      if (date && type) setCurrentOverride({ date, type });
    }
  };

  // Generic Field Updater
  const handleFieldChange = (id, field, value) => {
    setAllSchedules((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Prepare updates for the current tab only
      const updates = allSchedules
        .filter((s) => s.schedule_type === selectedType)
        .map((s) => ({
          id: s.id,
          schedule_type: selectedType, // Ensure type stays consistent
          order_index: parseInt(s.order_index),
          period_name: s.period_name,
          start_time:
            s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time,
          end_time: s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time,
        }));

      const { error } = await supabase.from('bell_schedules').upsert(updates);
      if (error) throw error;

      // Re-fetch to sort by new order
      await fetchSchedules();
      alert('Schedule saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // === OVERRIDE LOGIC ===
  const setOverrideForToday = async () => {
    if (!window.confirm(`Force today to use "${selectedType}" schedule?`))
      return;

    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];

    try {
      const { error } = await supabase.from('system_settings').upsert([
        { key: 'schedule_override_date', value: todayStr },
        { key: 'schedule_override_type', value: selectedType },
      ]);
      if (error) throw error;
      setCurrentOverride({ date: todayStr, type: selectedType });
      alert(`Success! Today is now a ${selectedType} day.`);
    } catch {
      alert('Failed to set override.');
    }
  };

  const clearOverride = async () => {
    try {
      await supabase
        .from('system_settings')
        .delete()
        .in('key', ['schedule_override_date', 'schedule_override_type']);
      setCurrentOverride(null);
      alert('Override cleared.');
    } catch {
      alert('Failed to clear.');
    }
  };

  // Filter and Sort by the editable order_index for display
  const activeSchedule = allSchedules
    .filter((s) => s.schedule_type === selectedType)
    .sort((a, b) => a.order_index - b.order_index);

  const todayDisplay = new Date().toLocaleDateString('en-CA');

  if (loading)
    return (
      <div className='min-h-screen bg-slate-950 flex items-center justify-center text-slate-500'>
        Loading Editor...
      </div>
    );

  return (
    <div className='min-h-screen bg-slate-950 text-slate-200 font-sans p-6 pb-24'>
      {/* Header */}
      <div className='max-w-5xl mx-auto mb-6 flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => navigate('/admin')}
            className='w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors'
          >
            <i className='fa-solid fa-arrow-left'></i>
          </button>
          <div>
            <h1 className='text-2xl font-bold text-white'>Schedule Editor</h1>
            <p className='text-slate-500 text-sm'>
              Edit Names, Times, and Order
            </p>
          </div>
        </div>
      </div>

      <div className='max-w-5xl mx-auto space-y-6'>
        {/* OVERRIDE CARD */}
        <div className='bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex justify-between items-center relative overflow-hidden'>
          <div className='absolute top-0 left-0 w-1 h-full bg-blue-500'></div>
          <div>
            <h2 className='text-lg font-bold text-white flex items-center gap-2'>
              <i className='fa-solid fa-calendar-day text-blue-400'></i>{' '}
              Today&apos;s Schedule
            </h2>
            <div className='mt-2 flex items-center gap-3'>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${currentOverride?.date === todayDisplay ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
              >
                {currentOverride?.date === todayDisplay
                  ? `Override: ${currentOverride.type}`
                  : 'Standard Rotation'}
              </span>
              {currentOverride?.date === todayDisplay && (
                <button
                  onClick={clearOverride}
                  className='text-xs text-red-400 hover:text-red-300 underline'
                >
                  Reset to Normal
                </button>
              )}
            </div>
          </div>
          <button
            onClick={setOverrideForToday}
            className='px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-bold rounded-lg transition shadow-sm'
          >
            Force &quot;{selectedType}&quot; Today
          </button>
        </div>

        {/* TAB SELECTOR */}
        <div className='flex gap-2 overflow-x-auto pb-2'>
          {scheduleTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border ${
                selectedType === type
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* MAIN EDITOR TABLE */}
        <div className='bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden'>
          <div className='p-4 bg-black/20 border-b border-slate-800 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md'>
            <h3 className='font-bold text-slate-300 flex items-center gap-2'>
              <span className='text-white'>{selectedType}</span>
              <span className='text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full'>
                {activeSchedule.length} Periods
              </span>
            </h3>
            <button
              onClick={saveChanges}
              disabled={saving}
              className='px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2'
            >
              {saving ? (
                <i className='fa-solid fa-circle-notch fa-spin'></i>
              ) : (
                <i className='fa-solid fa-floppy-disk'></i>
              )}
              Save Changes
            </button>
          </div>

          {/* Table Header */}
          <div className='grid grid-cols-12 gap-2 p-3 bg-black/40 border-b border-slate-800 text-[10px] font-bold uppercase text-slate-500 tracking-wider'>
            <div className='col-span-1 text-center'>Order</div>
            <div className='col-span-5'>Period Name</div>
            <div className='col-span-3'>Start</div>
            <div className='col-span-3'>End</div>
          </div>

          {/* Table Body */}
          <div className='divide-y divide-slate-800'>
            {activeSchedule.length > 0 ? (
              activeSchedule.map((period) => (
                <div
                  key={period.id}
                  className='grid grid-cols-12 gap-4 p-3 items-center hover:bg-white/5 transition-colors group'
                >
                  {/* Order Input */}
                  <div className='col-span-1'>
                    <input
                      type='number'
                      value={period.order_index}
                      onChange={(e) =>
                        handleFieldChange(
                          period.id,
                          'order_index',
                          e.target.value,
                        )
                      }
                      className='w-full bg-slate-950 border border-slate-700 text-center rounded py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none'
                    />
                  </div>

                  {/* Name Input */}
                  <div className='col-span-5'>
                    <input
                      type='text'
                      value={period.period_name}
                      onChange={(e) =>
                        handleFieldChange(
                          period.id,
                          'period_name',
                          e.target.value,
                        )
                      }
                      className='w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 rounded-none py-1 text-white font-bold text-sm focus:outline-none transition-colors'
                    />
                  </div>

                  {/* Start Time */}
                  <div className='col-span-3'>
                    <input
                      type='time'
                      step='60'
                      value={period.start_time.slice(0, 5)}
                      onChange={(e) =>
                        handleFieldChange(
                          period.id,
                          'start_time',
                          e.target.value,
                        )
                      }
                      className='w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white text-xs focus:border-blue-500 focus:outline-none'
                    />
                  </div>

                  {/* End Time */}
                  <div className='col-span-3'>
                    <input
                      type='time'
                      step='60'
                      value={period.end_time.slice(0, 5)}
                      onChange={(e) =>
                        handleFieldChange(period.id, 'end_time', e.target.value)
                      }
                      className='w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white text-xs focus:border-blue-500 focus:outline-none'
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className='p-12 text-center text-slate-500 italic flex flex-col items-center'>
                <i className='fa-regular fa-calendar-xmark text-2xl mb-2 opacity-50'></i>
                No periods found for this schedule type.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleEditor;
