import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const PiDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const [targetFanSpeed, setTargetFanSpeed] = useState(0);

  useEffect(() => {
    const fetchInitialStats = async () => {
      const { data, error } = await supabase
        .from('pi_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setStats(data);
        setIsLive(true);
      }
      if (error) console.error('Error fetching stats:', error);
      setLoading(false);
    };

    const fetchFanSetting = async () => {
      const { data } = await supabase
        .from('pi_settings')
        .select('fan_speed')
        .single();
      if (data) setTargetFanSpeed(data.fan_speed);
    };

    fetchInitialStats();
    fetchFanSetting();

    const subscription = supabase
      .channel('pi_monitor_advanced')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pi_stats' },
        (payload) => {
          setStats(payload.new);
          setIsLive(true);

          setTimeout(() => setIsLive(false), 500);
          setTimeout(() => setIsLive(true), 600);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const handleFanChange = async (e) => {
    const newSpeed = parseInt(e.target.value, 10);
    setTargetFanSpeed(newSpeed);
    await supabase.from('pi_settings').upsert({ id: 1, fan_speed: newSpeed });
  };

  const setFanToDefault = async () => {
    setTargetFanSpeed(0);
    await supabase.from('pi_settings').upsert({ id: 1, fan_speed: 0 });
  };

  const calculatePowerAndCost = () => {
    if (!stats) return { power: '0.0', daily: '0.00', monthly: '0.00' };

    const IDLE_WATTS = 2.7;
    const MAX_CPU_ADDITIONAL_WATTS = 6.0;
    const MAX_FAN_WATTS = 0.5;
    const MAX_FAN_RPM = 8000;

    const cpuPower = (stats.cpu_usage / 100) * MAX_CPU_ADDITIONAL_WATTS;
    const fanPower =
      stats.fan_speed > 0
        ? Math.min(
            (stats.fan_speed / MAX_FAN_RPM) * MAX_FAN_WATTS,
            MAX_FAN_WATTS,
          )
        : 0;

    const totalWatts = IDLE_WATTS + cpuPower + fanPower;

    const COST_PER_KWH = 0.16;
    const dailyKwh = (totalWatts / 1000) * 24;
    const dailyCost = dailyKwh * COST_PER_KWH;
    const monthlyCost = dailyCost * 30;

    return {
      power: totalWatts.toFixed(1),
      daily: dailyCost.toFixed(2),
      monthly: monthlyCost.toFixed(2),
    };
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-[#020617] flex flex-col items-center justify-center text-slate-400 font-mono'>
        <p>ESTABLISHING SECURE CONNECTION...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className='min-h-screen bg-[#020617] flex items-center justify-center text-slate-500 font-mono'>
        NO TELEMETRY RECEIVED
      </div>
    );
  }

  const safeFormat = (val) => Number(val || 0).toFixed(1);
  const powerMetrics = calculatePowerAndCost();

  const handmadeCardStyle =
    'bg-[#1e293b] border-2 border-[#334155] shadow-[6px_6px_0px_#334155] rounded-xl p-6';

  return (
    <div className='min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 font-sans'>
      <div className='max-w-6xl mx-auto space-y-8'>
        {/* --- HEADER --- */}
        <div className='flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-[#334155] pb-6'>
          <div className='flex items-center gap-4'>
            <i className='fa-brands fa-raspberry-pi text-4xl text-slate-200'></i>
            <div>
              <h1 className='text-xl font-bold text-slate-200 tracking-wider'>
                CONNECT{' '}
                <span className='text-slate-500 font-mono text-lg'>
                  :: RPI-5
                </span>
              </h1>
              <p className='text-slate-500 font-mono text-sm mt-1'>
                api.croomsconnect.com / 192.168.0.248
              </p>
            </div>
          </div>

          <div className='flex items-center gap-6'>
            <div className='px-4 py-2 font-mono text-sm text-slate-300 border-2 border-[#334155] rounded bg-[#1e293b] shadow-[2px_2px_0px_#334155]'>
              STATUS: {stats.throttle_status || 'UNKNOWN'}
            </div>

            <div className='flex flex-col items-end'>
              <div className='flex items-center gap-2 text-xs font-mono text-slate-400'>
                <span
                  className={`w-3 h-3 border border-[#334155] rounded-full ${isLive ? 'bg-slate-300' : 'bg-transparent'} transition-all duration-200`}
                ></span>
                DATALINK ACTIVE
              </div>
              <div className='text-[10px] text-slate-500 font-mono mt-1'>
                PING:{' '}
                {new Date(stats.created_at).toLocaleTimeString('en-US', {
                  hour12: false,
                })}
              </div>
            </div>
          </div>
        </div>

        {/* --- MAIN GRID --- */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2'>
          {/* CPU BLOCK */}
          <div className={`lg:col-span-2 ${handmadeCardStyle}`}>
            <div className='flex justify-between items-start mb-6'>
              <h3 className='text-slate-400 font-mono text-sm tracking-widest font-bold'>
                PROCESSOR
              </h3>
              <span className='font-mono text-xl text-slate-200 bg-[#020617] px-3 py-1 rounded border border-[#334155]'>
                {safeFormat(stats.cpu_temp)}°C
              </span>
            </div>

            <div className='flex items-end gap-4 mb-6'>
              <span className='text-6xl font-black font-mono text-slate-200 tracking-tighter'>
                {safeFormat(stats.cpu_usage)}
                <span className='text-3xl text-slate-500 font-normal'>%</span>
              </span>
            </div>

            <div className='grid grid-cols-2 gap-4 border-t-2 border-dashed border-[#334155] pt-4'>
              <div>
                <div className='text-[11px] text-slate-500 font-mono mb-1 font-bold'>
                  CORE FREQUENCY
                </div>
                <div className='font-mono text-slate-300 text-lg'>
                  {stats.cpu_freq || 0}{' '}
                  <span className='text-xs text-slate-500'>MHz</span>
                </div>
              </div>
              <div>
                <div className='text-[11px] text-slate-500 font-mono mb-1 font-bold'>
                  LOAD AVERAGE
                </div>
                <div className='font-mono text-slate-300 text-lg'>
                  {stats.load_avg || '0.00, 0.00, 0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* MEMORY BLOCK */}
          <div className={handmadeCardStyle}>
            <h3 className='text-slate-400 font-mono text-sm tracking-widest mb-6 font-bold'>
              SYSTEM MEMORY
            </h3>

            <div className='space-y-6'>
              <div>
                <div className='flex justify-between text-xs font-mono mb-2 text-slate-300'>
                  <span>PHYSICAL RAM</span>
                  <span>{safeFormat(stats.ram_usage)}%</span>
                </div>
                <div className='w-full bg-[#020617] border border-[#334155] rounded h-3 overflow-hidden'>
                  <div
                    className='h-full bg-slate-400'
                    style={{ width: `${stats.ram_usage || 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className='flex justify-between text-xs font-mono mb-2 text-slate-300'>
                  <span>SWAP FILE</span>
                  <span>{safeFormat(stats.swap_usage)}%</span>
                </div>
                <div className='w-full bg-[#020617] border border-[#334155] rounded h-3 overflow-hidden'>
                  <div
                    className='h-full bg-slate-600'
                    style={{ width: `${stats.swap_usage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* NETWORK & STORAGE BLOCK */}
          <div className={`${handmadeCardStyle} flex flex-col justify-between`}>
            <div>
              <h3 className='text-slate-400 font-mono text-sm tracking-widest mb-4 font-bold'>
                NETWORK I/O
              </h3>
              <div className='space-y-2 mb-6 text-sm font-mono text-slate-300'>
                <div className='flex justify-between'>
                  <span className='text-slate-500'>INBOUND</span>
                  <span>{safeFormat(stats.net_down)} KB/s</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-slate-500'>OUTBOUND</span>
                  <span>{safeFormat(stats.net_up)} KB/s</span>
                </div>
              </div>
            </div>

            <div className='border-t-2 border-dashed border-[#334155] pt-4'>
              <h3 className='text-slate-400 font-mono text-sm tracking-widest mb-4 font-bold'>
                STORAGE (/)
              </h3>
              <div className='flex justify-between items-end font-mono'>
                <span className='text-2xl font-bold text-slate-200'>
                  {safeFormat(stats.disk_usage)}%
                </span>
                <span className='text-xs text-slate-500'>
                  DB: {safeFormat(stats.db_storage)} MB
                </span>
              </div>
            </div>
          </div>

          {/* FAN CONTROL BLOCK */}
          <div
            className={`lg:col-span-2 ${handmadeCardStyle} flex flex-col justify-between`}
          >
            <div>
              <h3 className='text-slate-400 font-mono text-sm tracking-widest mb-4 flex items-center gap-2 font-bold'>
                <i
                  className={`fa-solid fa-fan text-slate-300 ${stats.fan_speed > 0 ? 'animate-spin' : ''}`}
                  style={{ animationDuration: '2.5s' }}
                ></i>
                COOLING SYSTEM
              </h3>
              <div className='text-4xl font-black font-mono text-slate-200 mb-6 tracking-tighter'>
                {stats.fan_speed > 0 ? stats.fan_speed : '0'}{' '}
                <span className='text-lg text-slate-500 font-normal'>RPM</span>
              </div>
            </div>

            <div className='border-t-2 border-dashed border-[#334155] pt-4'>
              <div className='flex justify-between text-xs font-mono text-slate-400 mb-4'>
                <span>
                  MANUAL OVERRIDE:{' '}
                  {targetFanSpeed > 0 ? `${targetFanSpeed}%` : 'AUTO'}
                </span>
              </div>

              <input
                type='range'
                min='0'
                max='100'
                value={targetFanSpeed}
                onChange={handleFanChange}
                className='w-full accent-slate-300 h-2 bg-[#020617] border border-[#334155] rounded-lg appearance-none cursor-pointer mb-6'
              />

              <button
                onClick={setFanToDefault}
                className='w-full px-4 py-3 border-2 border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-slate-300 text-xs font-bold font-mono rounded transition-colors shadow-[2px_2px_0px_#334155] active:shadow-none active:translate-y-[2px] active:translate-x-[2px]'
              >
                SET TO DEFAULT (AUTO)
              </button>
            </div>
          </div>

          {/* TERRY CREWS MEME BLOCK */}
          <div className='lg:col-span-2 relative overflow-hidden bg-[#1e293b] border-2 border-[#334155] shadow-[6px_6px_0px_#334155] rounded-xl flex items-center justify-center min-h-[250px]'>
            {/* Meme Image Background */}
            <img
              src='https://i.pinimg.com/736x/c8/1b/ee/c81bee463b5003d6204b3af9fd962f2d.jpg'
              alt='Terry Crews Meme'
              className='absolute inset-0 w-full h-full object-cover opacity-80'
            />

            {/* Dark overlay faded from bottom to top so the text remains legible */}
            <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent'></div>

            {/* Small live power stat tucked in the top right corner */}
            <div className='absolute top-4 right-4 bg-black/80 px-2 py-1 rounded text-xs font-mono text-white border border-white/20 z-10'>
              LIVE: {powerMetrics.power}W
            </div>

            {/* Meme Text (Flat line, moved to bottom) */}
            <h2
              className='absolute bottom-6 left-0 w-full text-center font-black text-white text-xl sm:text-2xl md:text-3xl tracking-wide uppercase px-4 z-10'
              style={{
                fontFamily: '"Impact", sans-serif',
                textShadow:
                  '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0px 4px 10px rgba(0,0,0,0.8)',
              }}
            >
              THAT&apos;S ${powerMetrics.monthly} WORTH OF RASPBERRY PI!
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PiDashboard;
