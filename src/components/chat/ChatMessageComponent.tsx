import { memo, useState, type FC, type ReactElement } from 'react';
import { supabase } from '../../supabaseClient';
import {
  getStorageAvatar,
  getDefaultAvatar,
  formatMessageTimestamp,
  scrollToMessage,
} from '../../utils/chatUtils';
import BadgeList from './BadgeList';
import type { ChatMessage, Profile } from '../../utils/databaseDefinitions';
import type { NavigateFunction } from 'react-router-dom';
import { PostgrestError } from '@supabase/supabase-js';

interface ChatMessageComponentProps {
  msg: ChatMessage;
  isSelf: boolean;
  currentUserId: string;
  profile: Profile;
  navigate: NavigateFunction;
  handlers: {
    initReply: (msg: ChatMessage) => void;
    initEdit: (msg: ChatMessage) => void;
    handleDeleteMessage: (msgId: string) => void;
    parentMsg: ChatMessage;
  };
}

interface PollData {
  question: string;
  options: {
    id: number;
    text: string;
    votes: { id: string; username: string }[];
  }[];
}

const parsePollMessage = (
  msg: ChatMessage['message'],
):
  | {
      data: PollData;
      textBefore: string;
      textAfter: string;
    }
  | null
  | 'invalid' => {
  const pollMatch = msg.match(/\[POLL\](.*?)\[\/POLL\]/);
  if (!pollMatch) return null;

  const textBefore = msg.split(pollMatch[0])[0];
  const textAfter = msg.split(pollMatch[0])[1];

  try {
    const pollData = JSON.parse(pollMatch[1]);
    // WARNING: TODO: There really should be checks here to make sure pollData is the right type

    return {
      data: pollData,
      textBefore,
      textAfter,
    };
  } catch {
    return 'invalid';
  }
};
const ChatMessageComponentDef: FC<ChatMessageComponentProps> = ({
  msg,
  isSelf,
  currentUserId,
  profile,
  navigate,
  handlers,
}) => {
  const { initReply, initEdit, handleDeleteMessage, parentMsg } = handlers;

  // State for the voters modal
  const [showVoters, setShowVoters] = useState<
    PollData['options'][number] | null
  >(null);

  // Resolve Avatar Logic
  const avatarSrc = msg.avatar_url || getStorageAvatar(msg.user_id);
  const fallbackSrc = getDefaultAvatar(msg.username);

  // Permission Logic
  const isAdmin = profile?.is_verified;
  const canDelete = isSelf || isAdmin;
  const canEdit = isSelf && !msg.is_deleted;

  const goToProfile = (): void => {
    navigate(`/${msg.username}`);
  };

  // ==================
  // POLL HANDLING
  // ==================
  const handleVote = async (
    optionId: number,
    pollData: PollData,
  ): Promise<void> => {
    // ANY logged-in user can execute this.
    if (!currentUserId) return;

    // Store both ID and username so we can display who voted easily
    const voter = {
      id: currentUserId,
      username: profile?.username || 'Unknown User',
    };

    const newOptions = pollData.options.map((opt) => {
      const newVotes = [...opt.votes];

      // Backwards compatibility check
      const existingVoteIndex = newVotes.findIndex((v) =>
        typeof v === 'string' ? v === currentUserId : v.id === currentUserId,
      );

      if (opt.id === optionId) {
        if (existingVoteIndex !== -1) {
          newVotes.splice(existingVoteIndex, 1); // Remove vote (toggle off)
        } else {
          newVotes.push(voter); // Add vote
        }
      } else {
        // Enforce single choice (remove from other options)
        const otherIndex = newVotes.findIndex((v) =>
          typeof v === 'string' ? v === currentUserId : v.id === currentUserId,
        );
        if (otherIndex !== -1) {
          newVotes.splice(otherIndex, 1);
        }
      }
      return { ...opt, votes: newVotes };
    });

    const newPollData = { ...pollData, options: newOptions };

    // Replace ONLY the poll section so surrounding text isn't lost
    const newMsgContent = msg.message.replace(
      /\[POLL\].*?\[\/POLL\]/,
      `[POLL]${JSON.stringify(newPollData)}[/POLL]`,
    );

    try {
      const { error } = await supabase
        .from('messages')
        .update({ message: newMsgContent })
        .eq('id', msg.id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to register vote:', err);
      // IF SUPABASE RLS BLOCKS IT, TELL THE USER:
      if (
        err instanceof PostgrestError &&
        (err.message?.toLowerCase().includes('row-level security') ||
          err.code === '42501')
      ) {
        alert(
          'Database block: You cannot vote until the Admin runs the Poll SQL policy in Supabase!',
        );
      }
    }
  };

  const renderContent = (): ReactElement | null => {
    if (!msg.message) return null;
    if (msg.is_deleted)
      return <div dangerouslySetInnerHTML={{ __html: msg.message }} />;

    const poll = parsePollMessage(msg.message);

    if (!poll) return <div dangerouslySetInnerHTML={{ __html: msg.message }} />;
    else if (poll === 'invalid')
      return (
        <div className='text-red-400 text-xs italic'>[Invalid Poll Data]</div>
      );
    else {
      // Check if current user voted in any option
      const hasVoted = poll.data.options.some((opt) =>
        opt.votes.some((v) =>
          typeof v === 'string' ? v === currentUserId : v.id === currentUserId,
        ),
      );
      const totalVotes = poll.data.options.reduce(
        (acc, opt) => acc + opt.votes.length,
        0,
      );

      return (
        <>
          {poll.textBefore && (
            <div dangerouslySetInnerHTML={{ __html: poll.textBefore }} />
          )}
          <div className='bg-slate-800/90 rounded-lg p-3 my-2 border border-slate-700 w-full max-w-[320px] shadow-sm font-sans'>
            <h4 className='text-white font-bold mb-3 text-[14px] flex items-start gap-2 leading-tight'>
              <i className='fa-solid fa-square-poll-horizontal text-blue-400 mt-[2px]'></i>
              {poll.data.question}
            </h4>
            <div className='space-y-2'>
              {poll.data.options.map((opt) => {
                const votes = opt.votes.length;
                const percent =
                  totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const isMyVote = opt.votes.some((v) =>
                  typeof v === 'string'
                    ? v === currentUserId
                    : v.id === currentUserId,
                );

                return (
                  <div
                    key={opt.id}
                    className={`relative rounded overflow-hidden cursor-pointer transition-all border ${isMyVote ? 'border-blue-500 bg-blue-900/40' : 'border-slate-600 bg-slate-700/50 hover:bg-slate-600'}`}
                    onClick={() => handleVote(opt.id, poll.data)}
                  >
                    {hasVoted && (
                      <div
                        className={`absolute top-0 left-0 h-full ${isMyVote ? 'bg-blue-500/50' : 'bg-slate-500/40'} transition-all duration-500 ease-out`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    )}
                    <div className='relative p-2 flex justify-between items-center z-10 text-[13px]'>
                      <span
                        className={`font-semibold tracking-wide ${isMyVote ? 'text-blue-100' : 'text-slate-200'}`}
                      >
                        {opt.text}
                      </span>
                      {hasVoted && (
                        <span
                          className='text-slate-200 font-bold ml-3 hover:text-blue-300 hover:underline decoration-dotted transition-colors'
                          title='See who voted'
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent casting a vote when clicking the percentage
                            setShowVoters(opt);
                          }}
                        >
                          {percent}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className='mt-2 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider'>
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
            </div>
          </div>
          {poll.textAfter && (
            <div dangerouslySetInnerHTML={{ __html: poll.textAfter }} />
          )}
        </>
      );
    }
  };

  return (
    <div
      id={`msg-${msg.id}`}
      className={`message ${isSelf ? 'self' : 'other'}`}
    >
      <img
        src={avatarSrc}
        onError={(e) => {
          if (e.currentTarget.src !== window.location.origin + fallbackSrc) {
            e.currentTarget.src = fallbackSrc;
          }
        }}
        className='message-avatar cursor-pointer hover:opacity-80 transition-opacity'
        onClick={goToProfile}
        alt='avatar'
        title='View Profile'
      />

      <div className='flex flex-col max-w-[85%]'>
        {parentMsg && (
          <div
            className='mb-1 ml-2 flex items-center gap-2 opacity-60 text-xs hover:opacity-100 transition-opacity cursor-pointer'
            onClick={() => scrollToMessage(parentMsg.id)}
          >
            <div className='w-1 h-3 bg-gray-400 rounded-full'></div>
            <span className='font-bold'>{parentMsg.username}:</span>
            <span
              className='truncate max-w-[150px]'
              dangerouslySetInnerHTML={{
                __html: parentMsg.is_deleted
                  ? 'Message deleted'
                  : parentMsg.message,
              }}
            ></span>
          </div>
        )}

        <div className='message-bubble group relative'>
          {/* Action Buttons */}
          <div
            className={`absolute -top-3 ${isSelf ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10`}
          >
            {!msg.is_deleted && (
              <button
                onClick={() => initReply(msg)}
                className='bg-slate-700 text-gray-300 hover:text-white hover:bg-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow'
                title='Reply'
              >
                <i className='fa-solid fa-reply'></i>
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => initEdit(msg)}
                className='bg-slate-700 text-blue-300 hover:text-blue-100 hover:bg-blue-900 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow'
                title='Edit'
              >
                <i className='fa-solid fa-pencil'></i>
              </button>
            )}
            {canDelete && !msg.is_deleted && (
              <button
                onClick={() => handleDeleteMessage(msg.id)}
                className='bg-slate-700 text-red-300 hover:text-red-100 hover:bg-red-900 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow'
                title='Delete'
              >
                <i className='fa-solid fa-trash'></i>
              </button>
            )}
          </div>

          {/* Username Header */}
          <div
            className='message-username flex items-center gap-1 cursor-pointer hover:underline'
            onClick={goToProfile}
          >
            {!profile?.hide_badges && <BadgeList badgeData={msg.badge_type} />}
            {msg.username}
          </div>

          {/* Message Content */}
          <div
            className={`message-content-html break-words overflow-hidden ${msg.is_deleted ? 'italic text-gray-400' : ''}`}
            style={{ wordBreak: 'break-word' }}
          >
            <style>{`
                            .message-content-html img, 
                            .message-content-html video { 
                                max-width: 100% !important; 
                                border-radius: 8px; 
                            }
                            .message-content-html iframe {
                                max-width: 100% !important;
                                border-radius: 12px;
                                margin: 5px 0;
                            }
                            .message-content-html audio {
                                width: 100%;
                                min-width: 250px;
                                max-width: 450px;
                                height: 40px;
                                margin: 5px 0;
                            }
                            .message-content-html .file-card {
                                transition: background-color 0.2s;
                            }
                            .message-content-html .file-card:hover {
                                background-color: #334155 !important;
                            }
                        `}</style>

            {renderContent()}
          </div>

          {/* Timestamp & Edit Status */}
          <div className='flex gap-2 items-center justify-end mt-1'>
            {msg.is_edited && !msg.is_deleted && (
              <span className='text-[10px] opacity-50'>(edited)</span>
            )}
            <span className='message-timestamp'>
              {formatMessageTimestamp(msg.timestamp)}
            </span>
          </div>
        </div>
      </div>

      {/* VOTERS MODAL */}
      {showVoters && (
        <div
          className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm'
          onClick={() => setShowVoters(null)}
        >
          <div
            className='bg-slate-800 p-4 rounded-xl border border-slate-600 min-w-[280px] max-w-[400px] shadow-2xl transform transition-all'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex justify-between items-center mb-3 border-b border-slate-700 pb-2'>
              <h3 className='text-white font-bold text-sm'>
                Voters for{' '}
                <span className='text-blue-400'>
                  &quot;{showVoters.text}&quot;
                </span>
              </h3>
              <button
                onClick={() => setShowVoters(null)}
                className='text-gray-400 hover:text-white transition-colors'
              >
                <i className='fa-solid fa-xmark'></i>
              </button>
            </div>
            <ul className='text-slate-200 text-sm max-h-48 overflow-y-auto custom-scrollbar space-y-1'>
              {showVoters.votes.length > 0 ? (
                showVoters.votes.map((v, i) => (
                  <li
                    key={i}
                    className='py-2 px-3 bg-slate-700/50 rounded flex items-center gap-2 font-medium cursor-pointer hover:bg-slate-600 transition-colors'
                    onClick={() =>
                      navigate(
                        `/${typeof v === 'string' ? 'Unknown' : v.username}`,
                      )
                    }
                  >
                    <i className='fa-solid fa-user text-xs text-slate-400'></i>
                    {typeof v === 'string' ? 'Unknown User' : v.username}
                  </li>
                ))
              ) : (
                <li className='text-gray-500 italic text-center py-4'>
                  No votes yet.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Comparison Function to prevent re-renders when parent state (like typers) changes
const arePropsEqual = (
  prevProps: ChatMessageComponentProps,
  nextProps: ChatMessageComponentProps,
): boolean => {
  const msgChanged =
    prevProps.msg.id !== nextProps.msg.id ||
    prevProps.msg.message !== nextProps.msg.message ||
    prevProps.msg.is_deleted !== nextProps.msg.is_deleted ||
    prevProps.msg.is_edited !== nextProps.msg.is_edited ||
    prevProps.msg.avatar_url !== nextProps.msg.avatar_url ||
    JSON.stringify(prevProps.msg.badge_type) !==
      JSON.stringify(nextProps.msg.badge_type);

  if (msgChanged) return false;
  if (prevProps.profile !== nextProps.profile) return false;

  const prevParent = prevProps.handlers?.parentMsg;
  const nextParent = nextProps.handlers?.parentMsg;

  if (!!prevParent !== !!nextParent) return false;
  if (
    prevParent &&
    nextParent &&
    (prevParent.id !== nextParent.id ||
      prevParent.message !== nextParent.message)
  )
    return false;

  if (prevProps.isSelf !== nextProps.isSelf) return false;
  if (prevProps.currentUserId !== nextProps.currentUserId) return false;

  return true;
};

const ChatMessageComponent = memo(ChatMessageComponentDef, arePropsEqual);
export default ChatMessageComponent;
