import { useEffect, type FC } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: FC<HelpModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-label='Help information'
      onMouseDown={onClose}
    >
      <div
        className='w-full max-w-lg mx-4 rounded-xl border border-white/10 bg-gray-900 text-white shadow-2xl'
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className='flex items-center justify-between px-5 py-4 border-b border-white/10'>
          <h2 className='text-lg font-semibold'>Help & Information</h2>

          <button
            onClick={onClose}
            className='text-white/70 hover:text-white transition-colors'
            aria-label='Close help'
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}
        <div className='px-5 py-4 space-y-4 text-sm leading-relaxed'>
          <section>
            <h3 className='font-semibold text-blue-400 mb-1'>
              Getting Started
            </h3>
            <p>
              DO NOTE WE AS CROOMS CONNECT UNDER SECTION 230 No provider or user
              of an interactive computer service shall be treated as the
              publisher or speaker of any information provided by another
              information content provider.
            </p>
          </section>

          <section>
            <h3 className='font-semibold text-blue-400 mb-1'>
              Keyboard Shortcuts
            </h3>
            <ul className='list-disc ml-5 space-y-1 text-white/80'>
              <li>
                <b>Enter</b> — Send message
              </li>
              <li>
                <b>Shift + Enter</b> — New line
              </li>
              <li>
                <b>Esc</b> — Close dialogs
              </li>
              <li>
                <b>/</b> — Opens typing indiactor
              </li>
            </ul>
          </section>

          <section>
            <h3 className='font-semibold text-blue-400 mb-1'>Tips</h3>
            <ul className='list-disc ml-5 space-y-1 text-white/80'>
              <li>Be specific for better responses</li>
              <li>You can continue conversations naturally</li>
              <li>Avoid heated topics such as politcs!</li>
            </ul>
          </section>

          {/* SUPPORT */}
          <section>
            <h3 className='font-semibold text-blue-400 mb-1'>
              Need More Help?
            </h3>

            <p className='text-white/80'>
              If something isn’t working as expected, check your input or reload
              the page.
            </p>

            <p className='mt-3 text-white/80'>
              Need help?{' '}
              <a
                href='https://www.croomsconnect.com/support'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-400 hover:text-blue-300 underline font-medium'
              >
                reach out to our support! We are happy to help
              </a>
            </p>
          </section>

          {/* FEEDBACK / DEV LINKS */}
          <section>
            <h3 className='font-semibold text-blue-400 mb-1'>
              Feedback & Submissions
            </h3>

            <p className='text-white/80 mb-3'>
              Help us improve Connect by reporting issues or sharing your work.
            </p>

            <div className='space-y-2 text-white/80'>
              <p>
                Found a bug or want to add a feature?{' '}
                <a
                  href='https://docs.google.com/forms/d/e/1FAIpQLSdb87U6txcOk7trj10ZXGjM2ZHcAvpAdBnh7MnyIOpOYdwKAw/viewform?usp=header'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-400 hover:text-blue-300 underline font-medium'
                >
                  submit a request here
                </a>
              </p>

              <p>
                want your game shared?{' '}
                <a
                  href='https://docs.google.com/forms/d/e/1FAIpQLScEqgYX1gD8hl9kldzTUq5hQ_-L-sp2ME1q_6HV0hPK1GaPLA/viewform?usp=header'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-400 hover:text-blue-300 underline font-medium'
                >
                  submit your game here
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <div className='px-5 py-3 border-t border-white/10 flex justify-end'>
          <button
            onClick={onClose}
            className='px-3 py-1.5 rounded bg-blue-500 hover:bg-blue-600 transition-colors text-sm font-medium'
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
