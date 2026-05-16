import {
  useState,
  useRef,
  useEffect,
  type MouseEventHandler,
  type FC,
} from 'react';

const ChatTOSModal: FC<{
  onAccept: MouseEventHandler<HTMLButtonElement>;
  onDecline: MouseEventHandler<HTMLButtonElement>;
}> = ({ onAccept, onDecline }) => {
  const [canAccept, setCanAccept] = useState(false);
  const contentRef = useRef(null);

  // Fallback: Allow accepting after 3 seconds just in case scrolling fails on weird devices
  useEffect(() => {
    const timer = setTimeout(() => setCanAccept(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Monitor scroll position to enable the Accept button
  const handleScroll = (): void => {
    const el = contentRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight <= 50) {
      setCanAccept(true);
    }
  };

  return (
    <div className='fixed inset-0 z-[10050] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-all'>
      <div className='bg-[#0f172a] text-slate-200 w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col border border-slate-700/50 overflow-hidden'>
        {/* Header */}
        <div className='px-6 py-4 border-b border-slate-700/50 bg-[#1e293b]'>
          <h2 className='text-xl font-bold text-white flex items-center gap-2'>
            <i className='fa-solid fa-shield-halved text-blue-400'></i>
            Welcome to Crooms Connect Chat
          </h2>
          <p className='text-xs text-slate-400 mt-1'>
            Please read to the bottom to join the conversation.
          </p>
        </div>

        {/* Scrollable Content */}
        <div
          className='p-6 overflow-y-auto flex-1 space-y-6 text-sm leading-relaxed custom-scrollbar'
          ref={contentRef}
          onScroll={handleScroll}
        >
          <p className='text-slate-300 text-base'>
            We are thrilled to have you here! To ensure this chat remains a
            safe, welcoming, and fun environment for everyone, we ask that you
            carefully review our community guidelines before jumping in.
          </p>

          <section className='space-y-2'>
            <h3 className='text-lg font-semibold text-white flex items-center gap-2'>
              <i className='fa-solid fa-handshake text-green-400'></i> 1.
              Respect & Kindness
            </h3>
            <ul className='list-disc pl-5 space-y-1 text-slate-300'>
              <li>
                Treat everyone with respect. Insults, bullying, and sustained
                harassment are strictly prohibited.
              </li>
              <li>Keep swearing to an absolute minimum.</li>
              <li>No threats of violence or self-harm.</li>
              <li>
                Please follow all instructions given by our moderation team.
              </li>
            </ul>
          </section>

          <section className='space-y-2'>
            <h3 className='text-lg font-semibold text-white flex items-center gap-2'>
              <i className='fa-solid fa-ban text-red-400'></i> 2. Prohibited
              Topics
            </h3>
            <p className='text-slate-300'>
              To maintain a positive and drama-free environment, we kindly ask
              that you refrain from bringing up highly controversial,
              disruptive, or targeted topics.{' '}
              <strong>
                This specifically includes any discussions, jokes, or debates
                surrounding &quot;MrSmartGuy&quot; or &quot;McLean&quot;.
              </strong>{' '}
              Let&apos;s keep the focus on building each other up!
            </p>
            <p className='text-slate-300'>
              Additionally, explicit sexual content, unsolicited advances,
              illegal activities, and spam/unauthorized advertising are not
              allowed under any circumstances.
            </p>
          </section>

          <section className='space-y-2'>
            <h3 className='text-lg font-semibold text-white flex items-center gap-2'>
              <i className='fa-solid fa-scale-balanced text-blue-400'></i> 3.
              Liability & Responsibility
            </h3>
            <p className='text-slate-300'>
              <strong>
                We are not legally responsible for any user-generated content.
              </strong>{' '}
              Crooms Connect provides this platform for communication, but the
              opinions, media, and statements shared here belong solely to the
              users who post them.
            </p>
            <p className='text-slate-300'>
              You are entirely responsible and accountable for what you share.
              Furthermore, we are not liable for any off-platform behavior or
              interactions that occur outside of this chat.
            </p>
          </section>

          <section className='space-y-2'>
            <h3 className='text-lg font-semibold text-white flex items-center gap-2'>
              <i className='fa-solid fa-user-shield text-purple-400'></i> 4.
              Data & Privacy
            </h3>
            <p className='text-slate-300'>
              We store your messages and basic profile information to provide
              this service. By using this chat, you consent to this data
              storage. Please protect yourself by avoiding the sharing of highly
              sensitive personal information.
            </p>
          </section>

          <div className='pt-4 border-t border-slate-700/50 text-xs text-slate-500 text-center'>
            By clicking &quot;I Agree&quot;, you acknowledge that you have read,
            understood, and agree to be bound by these Terms of Service.
          </div>
        </div>

        {/* Footer Actions */}
        <div className='px-6 py-4 border-t border-slate-700/50 bg-[#1e293b] flex justify-end gap-3'>
          <button
            onClick={onDecline}
            className='px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors'
          >
            I Decline
          </button>
          <button
            onClick={onAccept}
            disabled={!canAccept}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
              canAccept
                ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/30'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatTOSModal;
