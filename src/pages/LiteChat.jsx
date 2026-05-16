import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const LiteChat = ({ session }) => {
  const navigate = useNavigate();

  const [username, setUsername] = useState('User');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let isMounted = true;

    const initChat = async () => {
      if (!session?.user?.id) return;

      try {
        // 1. Fetch Profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();

        if (profileData?.username && isMounted) {
          setUsername(profileData.username);
        }

        // 2. Fetch Initial Messages
        const { data: msgData } = await supabase
          .from('messages')
          .select('id, user_id, username, message, timestamp')
          .order('timestamp', { ascending: false })
          .limit(50);

        if (msgData && isMounted) {
          setMessages(msgData.reverse());
        }
      } catch (error) {
        console.error('LiteChat Init Error:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initChat();
    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const messageChannel = supabase
      .channel('lite-chat-room')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((msg) => msg.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [session]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    setIsSending(true);
    const messageText = input.trim();
    setInput('');

    try {
      const { error } = await supabase.from('messages').insert([
        {
          message: messageText,
          user_id: session.user.id,
          username: username,
          timestamp: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
      setInput(messageText);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'sans-serif',
          backgroundColor: '#f9f9f9',
        }}
      >
        <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#555' }}>
          Loading Lite Chat...
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f9f9f9',
        fontFamily: 'sans-serif',
      }}
    >
      <header
        style={{
          padding: '15px 20px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <strong style={{ fontSize: '1.2em' }}>Lite Chat</strong>
          <span
            style={{ fontSize: '0.85em', color: '#666', marginLeft: '10px' }}
          >
            {username}
          </span>
        </div>
        <button
          onClick={() => navigate('/chat')}
          style={{
            padding: '8px 16px',
            background: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Exit Lite Mode
        </button>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {messages.map((msg) => {
          const isSelf = msg.user_id === session?.user?.id;
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isSelf ? 'flex-end' : 'flex-start',
                backgroundColor: isSelf ? '#007bff' : '#e9ecef',
                color: isSelf ? '#fff' : '#000',
                padding: '10px 14px',
                borderRadius: '8px',
                maxWidth: '80%',
                wordBreak: 'break-word',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              {!isSelf && (
                <div
                  style={{
                    fontSize: '0.75em',
                    fontWeight: 'bold',
                    marginBottom: '4px',
                    color: '#555',
                  }}
                >
                  {msg.username}
                </div>
              )}
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '15px' }}>
                {msg.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        style={{
          display: 'flex',
          padding: '15px',
          backgroundColor: '#fff',
          borderTop: '1px solid #ddd',
        }}
      >
        <input
          type='text'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Type a message...'
          disabled={isSending}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #ccc',
            marginRight: '10px',
            fontSize: '16px',
            outline: 'none',
          }}
        />
        <button
          type='submit'
          disabled={isSending || !input.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: isSending || !input.trim() ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: isSending || !input.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default LiteChat;
