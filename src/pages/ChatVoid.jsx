import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// We now accept 'session' as a prop directly from App.js!
const ChatVoid = ({ session }) => {
  const navigate = useNavigate();
  const [, setProfile] = useState(null);
  const [deletedMessages, setDeletedMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run if the session prop is ready
    if (session?.user?.id) {
      checkAccessAndFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const checkAccessAndFetch = async () => {
    setIsLoading(true);

    // Fetch user profile based on the session passed from App.js
    const { data: prof, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    }

    setProfile(prof);

    // Security Check: Only verified users can access the void
    if (!prof?.is_verified) {
      alert(
        'Access Denied: You must be an Admin (Verified) to enter The Void.',
      );
      navigate('/chat'); // Kicks non-admins back to the chat area
      return;
    }

    await fetchDeletedMessages();
  };

  const fetchDeletedMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('is_deleted', true)
      .order('timestamp', { ascending: false });

    if (!error && data) {
      setDeletedMessages(data);
    }
    setIsLoading(false);
  };

  const permanentlyDelete = async (id) => {
    if (
      !window.confirm('Permanently delete this message? This CANNOT be undone.')
    )
      return;
    try {
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) throw error;
      setDeletedMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const restoreMessage = async (id) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: false })
        .eq('id', id);
      if (error) throw error;
      setDeletedMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Restore error:', err);
    }
  };

  if (isLoading)
    return (
      <div className='p-10 text-white text-center flex items-center justify-center min-h-screen bg-slate-950'>
        <i className='fa-solid fa-circle-notch fa-spin mr-2'></i> Entering the
        Void...
      </div>
    );

  return (
    <div className='min-h-screen bg-slate-950 text-slate-200 p-6 flex flex-col font-sans'>
      <div className='flex justify-between items-center border-b border-slate-800 pb-4 mb-6 max-w-6xl mx-auto w-full'>
        <div>
          <h1 className='text-3xl font-bold text-red-500 flex items-center gap-3 tracking-wide'>
            <i className='fa-solid fa-ghost'></i> The Void
          </h1>
          <p className='text-slate-400 text-sm mt-1'>
            Classified Admin Database for Deleted Messages.
          </p>
        </div>
        <button
          onClick={() => navigate('/chat')}
          className='px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded transition text-sm font-bold flex items-center gap-2 border border-slate-700 shadow'
        >
          <i className='fa-solid fa-arrow-left'></i> Back to Chat
        </button>
      </div>

      <div className='max-w-6xl mx-auto w-full flex-1'>
        {deletedMessages.length === 0 ? (
          <div className='text-slate-600 text-center py-32 flex flex-col items-center'>
            <i className='fa-solid fa-wind text-6xl mb-4 opacity-50'></i>
            <p className='text-lg'>The void is empty.</p>
          </div>
        ) : (
          <div className='overflow-x-auto bg-slate-900 rounded-lg border border-slate-800 shadow-2xl'>
            <table className='w-full text-left text-sm'>
              <thead className='bg-slate-800 text-slate-400'>
                <tr>
                  <th className='p-4 w-48 border-b border-slate-700'>Sender</th>
                  <th className='p-4 border-b border-slate-700'>
                    Original Message Content
                  </th>
                  <th className='p-4 w-48 border-b border-slate-700'>
                    Time Logged
                  </th>
                  <th className='p-4 w-32 text-right border-b border-slate-700'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-800/50'>
                {deletedMessages.map((msg) => (
                  <tr key={msg.id} className='hover:bg-slate-800/30 transition'>
                    <td className='p-4 font-semibold text-slate-300 flex items-center gap-3'>
                      <img
                        src={msg.avatar_url || 'https://via.placeholder.com/40'}
                        alt='pfp'
                        className='w-8 h-8 rounded-full object-cover shrink-0'
                      />
                      {msg.username}
                    </td>
                    <td className='p-4 text-slate-400'>
                      {/* Render HTML so images/links still work in the void */}
                      <div
                        dangerouslySetInnerHTML={{ __html: msg.message }}
                        className='bxeak-words max-h-32 overflow-y-auto custom-scrollbar'
                      />
                    </td>
                    <td className='p-4 text-slate-500 text-xs'>
                      {new Date(msg.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className='p-4 text-right'>
                      <div className='flex justify-end gap-2'>
                        <button
                          onClick={() => restoreMessage(msg.id)}
                          className='w-8 h-8 rounded bg-slate-800 border border-slate-700 hover:bg-blue-600 hover:border-blue-500 text-blue-400 hover:text-white transition flex items-center justify-center shadow'
                          title='Restore Message to Chat'
                        >
                          <i className='fa-solid fa-trash-arrow-up text-xs'></i>
                        </button>
                        <button
                          onClick={() => permanentlyDelete(msg.id)}
                          className='w-8 h-8 rounded bg-slate-800 border border-slate-700 hover:bg-red-600 hover:border-red-500 text-red-400 hover:text-white transition flex items-center justify-center shadow'
                          title='Permanently Delete (Nuke)'
                        >
                          <i className='fa-solid fa-fire text-xs'></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatVoid;
