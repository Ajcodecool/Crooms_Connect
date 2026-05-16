// src/pages/PassReset.tsx

import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

// Define the shape of our request object
interface ResetRequest {
  id: string;
  owner_id: string;
  locked_user_id: string;
  username: string;
  locked_username: string;
  status: string;
  created_at: string;
}

const PassReset = (): ReactElement => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRequests = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dm_lock_resets')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as ResetRequest[]) || []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      alert('Failed to fetch reset requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect((): void => {
    fetchRequests();
  }, []);

  const handleApproveReset = async (request: ResetRequest): Promise<void> => {
    if (
      !window.confirm(
        `Are you sure you want to approve this reset and delete the password lock for ${request.username}'s chat with ${request.locked_username}?`,
      )
    ) {
      return;
    }

    try {
      // 1. Delete the lock to allow the user back in / let them set a new password
      const { error: deleteError } = await supabase
        .from('dm_locks')
        .delete()
        .eq('owner_id', request.owner_id)
        .eq('locked_user_id', request.locked_user_id);

      if (deleteError) throw deleteError;

      // 2. Mark the request as resolved
      const { error: updateError } = await supabase
        .from('dm_lock_resets')
        .update({ status: 'resolved' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      alert(
        `Password lock removed successfully for ${request.username}. They can now access the chat and set a new password.`,
      );
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (err) {
      console.error(err);
      alert(
        'Error approving the reset request. Make sure your account has admin/mod privileges to delete from dm_locks.',
      );
    }
  };

  const handleDenyReset = async (requestId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('dm_lock_resets')
        .update({ status: 'denied' })
        .eq('id', requestId);

      if (error) throw error;
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error(err);
      alert('Error denying the reset request.');
    }
  };

  return (
    <div className='min-h-screen bg-[#0f1015] text-white p-8'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex items-center justify-between mb-8'>
          <h1 className='text-3xl font-bold flex items-center gap-3'>
            <i className='fa-solid fa-unlock-keyhole text-blue-500'></i>
            Chat Password Resets
          </h1>
          <button
            onClick={() => navigate('/')}
            className='bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors font-medium text-sm'
          >
            Back to Dashboard
          </button>
        </div>

        {isLoading ? (
          <div className='flex justify-center items-center py-20'>
            <i className='fa-solid fa-circle-notch fa-spin text-3xl text-blue-500'></i>
          </div>
        ) : requests.length === 0 ? (
          <div className='bg-white/5 border border-white/10 rounded-xl p-12 text-center text-white/50'>
            <i className='fa-solid fa-check-circle text-4xl mb-4 text-green-500/50'></i>
            <p className='text-lg font-medium'>
              No pending password reset requests.
            </p>
          </div>
        ) : (
          <div className='grid gap-4'>
            {requests.map((req) => (
              <div
                key={req.id}
                className='bg-[#1a1b26] border border-white/10 rounded-xl p-6 flex flex-col sm:flex-row gap-6 justify-between items-center shadow-lg'
              >
                <div className='flex-1'>
                  <h3 className='text-lg font-bold mb-1'>
                    <span className='text-blue-400'>{req.username}</span> is
                    locked out of chat with{' '}
                    <span className='text-blue-400'>{req.locked_username}</span>
                  </h3>
                  <p className='text-sm text-white/50'>
                    Requested on: {new Date(req.created_at).toLocaleString()}
                  </p>
                </div>

                <div className='flex gap-3 w-full sm:w-auto'>
                  <button
                    onClick={() => handleDenyReset(req.id)}
                    className='flex-1 sm:flex-none px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all text-sm font-bold'
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => handleApproveReset(req)}
                    className='flex-1 sm:flex-none px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all text-sm font-bold shadow-lg'
                  >
                    Approve & Reset Lock
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PassReset;
