import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const EXTERNAL_URL = 'https://tencnsastgpixdovllgm.supabase.co';
const EXTERNAL_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbmNuc2FzdGdwaXhkb3ZsbGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNjA3MjAsImV4cCI6MjA4MzYzNjcyMH0.UduSJ22viX-pRPlrKgHh0yiPT--v9kmi2w_rTB-uQi0';

const externalSupabase = createClient(EXTERNAL_URL, EXTERNAL_KEY);

const Verification = ({ session }) => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundName, setFoundName] = useState(null);
  const [msg, setMsg] = useState('');

  // State for Verification Info
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedInfo, setVerifiedInfo] = useState({ date: null, name: '' });

  // 1. Check Status on Load
  useEffect(() => {
    const checkStatus = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('croomie, verified_at, verified_name')
        .eq('id', session.user.id)
        .single();

      if (data?.croomie) {
        setIsVerified(true);
        setVerifiedInfo({
          date: data.verified_at,
          name: data.verified_name,
        });
      }
    };
    checkStatus();
  }, [session]);

  const searchStudent = async () => {
    if (!studentId.trim()) return;
    setLoading(true);
    setFoundName(null);
    setMsg('');

    try {
      // --- STEP A: CHECK IF ID IS ALREADY TAKEN ---
      const { data: takenCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('verified_student_id', studentId.trim())
        .maybeSingle();

      if (takenCheck) {
        setMsg('⚠️ This Student ID is already linked to another account.');
        setLoading(false);
        return;
      }
      // ---------------------------------------------

      const targetMail = `${studentId.trim()}@student.myscps.us`;

      // --- STEP B: CHECK EXTERNAL DB ---
      const { data, error } = await externalSupabase
        .from('members')
        .select('DisplayName')
        .eq('Mail', targetMail)
        .single();

      if (error || !data) {
        setMsg('Student not found. Check ID.');
        setLoading(false);
        return;
      }

      // Parse Name
      const rawName = data.DisplayName || '';
      let firstName = rawName;
      if (rawName.includes(',')) firstName = rawName.split(',')[1];
      firstName = firstName.replace('(CAIT)', '').trim();

      setFoundName(firstName);
    } catch (err) {
      console.error(err);
      setMsg('Error searching database.');
    } finally {
      setLoading(false);
    }
  };

  const confirmIdentity = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();

      // --- STEP C: SAVE ID TO PREVENT REUSE ---
      const { error } = await supabase
        .from('profiles')
        .update({
          croomie: true,
          verified_at: now,
          verified_name: foundName,
          verified_student_id: studentId.trim(), // <--- Save the ID here
        })
        .eq('id', session.user.id);

      if (error) {
        // Double check for duplicate error just in case race condition
        if (error.code === '23505') throw new Error('ID already taken.');
        throw error;
      }

      setIsVerified(true);
      setVerifiedInfo({ date: now, name: foundName });
      setMsg('You are now verified!');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans'>
      <div className='bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl max-w-md w-full animate-in fade-in duration-300'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-2xl font-bold text-white mb-2'>
            Identity Verification
          </h1>
          <p className='text-slate-400 text-sm'>
            Crooms Connect Student Database
          </p>
        </div>

        {/* === TRUST INFO SECTION === */}
        {!isVerified && (
          <div className='mb-8 bg-blue-900/10 border border-blue-900/50 rounded-xl p-4 text-left'>
            <div className='flex items-start gap-3 mb-3'>
              <div className='bg-blue-500/20 p-2 rounded-lg text-blue-400'>
                <i className='fa-solid fa-user-shield'></i>
              </div>
              <div>
                <h3 className='text-white font-bold text-sm'>
                  Combats Impersonation
                </h3>
                <p className='text-slate-400 text-xs leading-relaxed'>
                  Verification ensures everyone is who they say they are,
                  creating a safer community.
                </p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <div className='bg-blue-500/20 p-2 rounded-lg text-blue-400'>
                <i className='fa-solid fa-certificate'></i>
              </div>
              <div>
                <h3 className='text-white font-bold text-sm'>
                  Get Verified Badge
                </h3>
                <p className='text-slate-400 text-xs leading-relaxed'>
                  (Coming Soon) A verification badge will appear next to your
                  name in chat.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className='text-center mb-6'>
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${isVerified ? 'bg-emerald-500/10 text-emerald-400 border-2 border-emerald-500/50' : 'bg-slate-800 text-slate-500'}`}
          >
            <i
              className={`fa-solid ${isVerified ? 'fa-check' : 'fa-id-card'} text-4xl`}
            ></i>
          </div>
          <h2 className='text-xl font-bold text-white'>
            {isVerified ? 'Verified Student' : 'Verify Identity'}
          </h2>

          {/* DISPLAY VERIFIED DATE & NAME */}
          {isVerified && verifiedInfo.date && (
            <div className='mt-4 bg-slate-800/50 rounded-lg p-3 border border-slate-700'>
              <p className='text-slate-400 text-xs uppercase tracking-widest font-bold mb-1'>
                Verified As
              </p>
              <p className='text-lg font-bold text-white'>
                {verifiedInfo.name}
              </p>
              <p className='text-slate-500 text-xs mt-1'>
                on {new Date(verifiedInfo.date).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {!isVerified && !foundName && (
          <>
            <div className='mb-4'>
              <label className='block text-slate-400 text-sm font-bold mb-2'>
                Student ID Number
              </label>
              <input
                type='number'
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className='w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition tracking-widest font-mono text-lg text-center'
                placeholder='592...'
              />
            </div>
            <button
              onClick={searchStudent}
              disabled={loading || studentId.length < 5}
              className='w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-blue-900/20 flex justify-center items-center gap-2'
            >
              {loading ? (
                <i className='fa-solid fa-circle-notch fa-spin'></i>
              ) : (
                'Find My Account'
              )}
            </button>
          </>
        )}

        {/* Found Logic */}
        {!isVerified && foundName && (
          <div className='bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700'>
            <p className='text-slate-400 text-sm mb-2'>We found a match for</p>
            <h3 className='text-2xl font-bold text-white mb-6'>
              &quot;{foundName}&quot;
            </h3>

            <div className='flex gap-3'>
              <button
                onClick={() => setFoundName(null)}
                className='flex-1 py-3 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700'
              >
                Not Me
              </button>
              <button
                onClick={confirmIdentity}
                disabled={loading}
                className='flex-1 py-3 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500'
              >
                {loading ? '...' : 'Yes, Verify'}
              </button>
            </div>
          </div>
        )}

        {msg && (
          <p
            className={`text-center mt-4 font-bold ${msg.includes('X') || msg.includes('⚠️') ? 'text-red-400' : 'text-emerald-400'}`}
          >
            {msg}
          </p>
        )}

        {isVerified && (
          <button
            onClick={() => navigate('/')}
            className='w-full mt-6 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl transition'
          >
            Return to Dashboard
          </button>
        )}

        {/* === PRIVACY & SUPPORT FOOTER === */}
        {!isVerified && (
          <div className='mt-8 pt-6 border-t border-slate-800/50'>
            <div className='flex gap-3 mb-4'>
              <div className='mt-0.5'>
                <i className='fa-solid fa-lock text-slate-500 text-xs'></i>
              </div>
              <p className='text-xs text-slate-400 leading-relaxed'>
                <span className='font-bold text-slate-300'></span> Your Student
                ID and Name are used{' '}
                <span className='text-emerald-400 italic'></span> only for
                verification. They will not be displayed publicly or used
                elsewhere in Crooms Connect.
              </p>
            </div>
            <div className='flex gap-3'>
              <div className='mt-0.5'>
                <i className='fa-solid fa-circle-question text-slate-500 text-xs'></i>
              </div>
              <p className='text-xs text-slate-400 leading-relaxed'>
                Issues? Contact support at <br />
                <a
                  href='https://support.croomsconnect.com'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-slate-300 hover:text-white hover:underline transition-colors font-mono mt-1 inline-block'
                >
                  support.croomsconnect.com
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verification;
