import type { FC } from 'react';

const TempPasswordConnectNotice: FC<{
  tempPassword: string;
  username: string;
}> = ({ tempPassword, username }) => {
  return (
    <div
      className='fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in'
      style={{ fontFamily: 'inherit' }}
    >
      <div className='bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95'>
        <div className='p-6 border-b border-slate-800 bg-amber-950/20'>
          <h2 className='text-xl font-bold text-white flex items-center gap-3'>
            <i className='fa-solid fa-triangle-exclamation text-amber-400'></i>
            Temp Password Generated
          </h2>
          <p className='text-sm text-amber-200/90 mt-2'>
            Admin is resetting the password for{' '}
            <span className='font-bold'>{username}</span>.
          </p>
        </div>

        <div className='p-6 space-y-4'>
          <div className='bg-slate-950/60 border border-slate-800 rounded-xl p-4'>
            <div className='text-xs font-bold text-slate-400 uppercase tracking-wider'>
              Temporary password (copy it)
            </div>
            <div className='mt-2 break-all font-mono text-[13px] text-white select-text'>
              {tempPassword}
            </div>
          </div>

          <div className='flex gap-3 justify-end'>
            <button
              type='button'
              className='px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-all active:scale-95'
              onClick={() => {
                try {
                  void navigator.clipboard?.writeText(tempPassword);
                } catch {
                  // ignore
                }
              }}
            >
              <i className='fa-solid fa-copy mr-2'></i>
              Copy
            </button>
          </div>

          <div className='text-xs text-slate-500'>
            The user will be forced to change this password on next login.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TempPasswordConnectNotice;
