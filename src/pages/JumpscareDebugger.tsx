import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

type JumpscareAudio = {
  id: string;
  name: string;
  url: string;
};

const JumpscareDebugger: React.FC = () => {
  const [status, setStatus] = useState<string>('Initializing...');
  const [logs, setLogs] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Payload states
  const [imageUrl, setImageUrl] = useState<string>('');
  const [jumpscareAudios, setJumpscareAudios] = useState<JumpscareAudio[]>([]);
  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string>('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // Helper to add visual logs to the screen and the browser console
  const addLog = useCallback((msg: string): void => {
    const time = new Date().toISOString().split('T')[1].slice(0, -1);
    setLogs((prev) => [`[${time}] ${msg}`, ...prev]);
    console.log(`[JUMPSCARE DEBUG] ${msg}`);
  }, []);

  useEffect(() => {
    // 1. Fetch available custom audios
    const fetchAudios = async (): Promise<void> => {
      const { data, error } = await supabase
        .from('jumpscare_audios')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setJumpscareAudios(data as JumpscareAudio[]);
        addLog(`Loaded ${data.length} custom audio tracks from database.`);
      } else if (error) {
        addLog(`❌ Failed to load audios: ${error.message}`);
      }
    };

    fetchAudios();

    // 2. Initialize the channel exactly as Admin.tsx and FoxyScare.tsx do
    const channel = supabase.channel('system_broadcasts');
    channelRef.current = channel;

    // 3. Listen to the channel so we can verify if the broadcast actually loops back
    channel
      .on('broadcast', { event: 'jumpscare' }, (payload): void => {
        addLog(
          `📥 RECEIVED BROADCAST: 'jumpscare' | Payload: ${JSON.stringify(payload)}`,
        );
      })
      .on('broadcast', { event: 'force_refresh' }, (payload): void => {
        addLog(
          `📥 RECEIVED BROADCAST: 'force_refresh' | Payload: ${JSON.stringify(payload)}`,
        );
      })
      .subscribe((subscribeStatus, err): void => {
        // Safe to call setState here because it is inside an asynchronous callback
        addLog(`Subscription status changed to: ${subscribeStatus}`);
        setStatus(subscribeStatus);
        if (err) {
          addLog(`❌ SUBSCRIPTION ERROR: ${JSON.stringify(err)}`);
        }
      });

    // Cleanup on unmount
    return (): void => {
      console.log(
        '[JUMPSCARE DEBUG] Component unmounting. Cleaning up channel...',
      );
      supabase.removeChannel(channel);
    };
  }, [addLog]);

  const handleAudioUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileName = `${Date.now()}_${file.name}`;

    setIsUploadingAudio(true);
    addLog(`Uploading audio file: ${file.name}...`);

    try {
      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('jumpscare-audio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('jumpscare-audio')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // 3. Insert record into database
      const { data: newAudio, error: dbError } = await supabase
        .from('jumpscare_audios')
        .insert([{ name: file.name, url: publicUrl }])
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. Update UI
      setJumpscareAudios((prev) => [newAudio, ...prev]);
      setSelectedAudioUrl(publicUrl); // Auto-select the newly uploaded file
      addLog('✅ Audio uploaded and saved successfully!');
    } catch (err) {
      addLog(
        `❌ Failed to upload audio: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setIsUploadingAudio(false);
      // Reset input so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  const triggerJumpscare = async (): Promise<void> => {
    addLog('-----------------------------------');
    addLog('🚀 Trigger button clicked!');

    if (!channelRef.current) {
      addLog('❌ ERROR: Channel reference is null! Cannot send.');
      return;
    }

    if (status !== 'SUBSCRIBED') {
      addLog(
        `⚠️ WARNING: Channel status is '${status}', not 'SUBSCRIBED'. Attempting to send anyway...`,
      );
    }

    // Include the image URL and Audio URL in the payload to dynamically change the scare
    const payload = {
      time: Date.now(),
      triggeredBy: 'JumpscareDebugger',
      randomId: Math.random().toString(36).substring(7),
      imageUrl: imageUrl.trim() || undefined,
      audioUrl: selectedAudioUrl.trim() || undefined,
    };

    addLog(
      `📤 Sending broadcast to 'system_broadcasts', event: 'jumpscare'...`,
    );
    addLog(`📦 Payload: ${JSON.stringify(payload)}`);

    try {
      const resp = await channelRef.current.send({
        type: 'broadcast',
        event: 'jumpscare',
        payload: payload,
      });

      addLog(`✅ Send promise resolved with response: "${resp}"`);
      if (resp === 'ok') {
        addLog('🎉 Broadcast successfully pushed to Supabase servers!');
        addLog('⏳ Waiting to see if we receive the echo back...');
      } else {
        addLog(`⚠️ Broadcast sent but returned unexpected status: ${resp}`);
      }
    } catch (error) {
      addLog(
        `❌ EXCEPTION during send: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

  const clearLogs = (): void => {
    setLogs([]);
    addLog('Logs cleared.');
  };

  return (
    <div className='min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-mono selection:bg-red-500/30'>
      <div className='max-w-5xl mx-auto space-y-6'>
        {/* HEADER / CONTROLS */}
        <div className='bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl'>
          <h1 className='text-2xl font-bold text-white mb-2 flex items-center gap-3'>
            <span className='text-red-500'>🐺 Jumpscare Debugger</span>
          </h1>
          <p className='text-slate-400 mb-6 text-sm'>
            Use this dedicated environment to isolate and test the broadcast
            system for FoxyScare.tsx. Open this page in one tab, and your chat
            app in another.
          </p>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
            <div className='p-4 bg-slate-950 border border-slate-800 rounded-lg'>
              <h3 className='text-slate-500 text-xs uppercase tracking-wider mb-1'>
                Channel Status
              </h3>
              <div className='flex items-center gap-2'>
                <div
                  className={`w-3 h-3 rounded-full ${
                    status === 'SUBSCRIBED'
                      ? 'bg-green-500'
                      : status === 'CHANNEL_ERROR'
                        ? 'bg-red-500'
                        : 'bg-yellow-500 animate-pulse'
                  }`}
                ></div>
                <span
                  className={`font-bold ${
                    status === 'SUBSCRIBED'
                      ? 'text-green-400'
                      : status === 'CHANNEL_ERROR'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                  }`}
                >
                  {status}
                </span>
              </div>
            </div>

            <div className='p-4 bg-slate-950 border border-slate-800 rounded-lg'>
              <h3 className='text-slate-500 text-xs uppercase tracking-wider mb-1'>
                Target Data
              </h3>
              <div className='font-bold text-blue-400 text-sm'>
                Channel: <span className='text-white'>system_broadcasts</span>
                <br />
                Event: <span className='text-white'>jumpscare</span>
              </div>
            </div>
          </div>

          {/* PAYLOAD CONFIGURATION */}
          <div className='mb-6 space-y-4 bg-slate-950/50 p-4 rounded-lg border border-slate-800'>
            <div>
              <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2'>
                Custom Image URL (Optional)
              </label>
              <input
                type='text'
                placeholder='https://example.com/scary-image.jpg'
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className='w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 transition-colors'
              />
            </div>

            <div>
              <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2'>
                Audio Track (Optional)
              </label>
              <div className='flex gap-2 items-center'>
                <select
                  value={selectedAudioUrl}
                  onChange={(e) => setSelectedAudioUrl(e.target.value)}
                  className='flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-500 transition-colors'
                >
                  <option value=''>Default FNaF Sound</option>
                  {jumpscareAudios.map((audio) => (
                    <option key={audio.id} value={audio.url}>
                      {audio.name}
                    </option>
                  ))}
                </select>

                <label
                  className={`cursor-pointer px-4 py-3 rounded-lg text-sm font-bold border transition-all flex items-center gap-2 ${isUploadingAudio ? 'bg-slate-800 text-slate-500 border-slate-700 pointer-events-none' : 'bg-slate-800 text-slate-300 hover:text-white border-slate-600 hover:border-slate-400'}`}
                >
                  {isUploadingAudio ? (
                    <i className='fa-solid fa-circle-notch fa-spin'></i>
                  ) : (
                    <i className='fa-solid fa-upload'></i>
                  )}{' '}
                  Upload
                  <input
                    type='file'
                    accept='audio/*'
                    className='hidden'
                    onChange={handleAudioUpload}
                    disabled={isUploadingAudio}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className='flex gap-4'>
            <button
              onClick={triggerJumpscare}
              className='flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-6 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all active:scale-95 text-lg flex justify-center items-center gap-2 border border-red-400'
            >
              🚀 FIRE JUMPSCARE
            </button>
          </div>
        </div>

        {/* LOG CONSOLE */}
        <div className='bg-black border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[600px]'>
          <div className='bg-slate-900 p-3 border-b border-slate-800 flex justify-between items-center'>
            <h2 className='text-sm font-bold text-slate-300 flex items-center gap-2'>
              <span>🖥️</span> Diagnostic Console
            </h2>
            <button
              onClick={clearLogs}
              className='text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded transition-colors border border-slate-700'
            >
              Clear Logs
            </button>
          </div>
          <div className='p-4 overflow-y-auto flex-1 space-y-1 text-xs sm:text-sm'>
            {logs.map((log, i) => (
              <div
                key={i}
                className={`break-all font-mono leading-relaxed ${
                  log.includes('❌')
                    ? 'text-red-400 bg-red-950/20 py-0.5 px-1 rounded'
                    : log.includes('✅') || log.includes('🎉')
                      ? 'text-green-400'
                      : log.includes('📥')
                        ? 'text-blue-400 bg-blue-950/20 py-0.5 px-1 rounded'
                        : log.includes('⚠️')
                          ? 'text-yellow-400'
                          : log.includes('🚀') || log.includes('📤')
                            ? 'text-fuchsia-400'
                            : 'text-slate-400'
                }`}
              >
                {log}
              </div>
            ))}
            {logs.length === 0 && (
              <div className='text-slate-600 italic text-center mt-10'>
                Awaiting events...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JumpscareDebugger;
