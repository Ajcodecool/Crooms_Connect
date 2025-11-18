"use client";

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
// @ts-ignore: Supabase JS UMD only for CDN – for Vite/webpack/react use ESM!
import { createClient, Session, User } from '@supabase/supabase-js';
import Auth from '../../Auth';

const SUPABASE_URL = 'https://jxxnfsydjrflnephmfjm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eG5mc3lkanJmbG5lcGhtZmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NTA3NjUsImV4cCI6MjA3NTAyNjc2NX0.-IRbU1ER8l[...]';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Message {
  id: string;
  text: string;
  sender_username: string;
  timestamp: string;
}

export default function CommunityPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        setIsAuthenticated(true);
        setUser(sessionData.session.user);
        await loadMessages();
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setIsAuthenticated(true);
          setUser(session.user);
          await loadMessages();
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setMessages([]);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Load messages from Supabase
  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, text, sender_username, timestamp')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        setError('Failed to load messages');
        return;
      }

      setMessages(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            text: message.trim(),
            sender_id: user.id,
            sender_username: user.user_metadata?.username || 'Anonymous'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message');
        return;
      }

      // Add the new message to local state
      setMessages(prev => [...prev, data]);
      setMessage('');
      setError(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const goToMainLayout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    router.push('/');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="main-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Show auth component if not authenticated
  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="main-wrapper">
      <div className="chat-container">
        <div className="scroll-to-bottom-btn" id="scroll-to-bottom">
          <i className="fas fa-arrow-down" />
        </div>
        
        <div className="chat-header">
          <div className="text-xl" id="chat-header-title">Crooms Connect Chat</div>
          
          <div className="search-bar" id="search-bar">
            <input 
              id="search-input" 
              placeholder="Search loaded messages..." 
              type="text" 
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              className="header-icon-btn" 
              id="search-btn" 
              title="Search"
              type="button"
            >
              <i className="fas fa-search" />
            </button>
            <button 
              className="header-icon-btn" 
              id="online-toggle-btn" 
              title="Toggle Online Users"
              type="button"
            >
              <i className="fas fa-users" />
            </button>
            <button 
              className="header-icon-btn" 
              id="settings-btn" 
              title="Settings"
              type="button"
            >
              <i className="fas fa-cog" />
            </button>
          </div>
        </div>
        
        <div className="chat-messages" id="chat-box">
          {error && (
            <div style={{ padding: '10px', backgroundColor: '#fee', color: '#c33', marginBottom: '10px' }}>
              {error}
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className="message">
              <div className="message-content">
                <div className="username">
                  {msg.sender_username}
                  <span className="timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text">{msg.text}</div>
              </div>
            </div>
          ))}
        </div>
        
        <form onSubmit={handleSendMessage} className="chat-input">
          <div className="rich-text-toolbar" id="rich-text-toolbar">
            <button type="button" data-format="bold" title="Bold">
              <i className="fas fa-bold" />
            </button>
            <button type="button" data-format="italic" title="Italic">
              <i className="fas fa-italic" />
            </button>
          </div>
          
          <div className="chat-input-row">
            <textarea
              id="chat-input-editor"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message (Enter to send, Shift+Enter for new line)"
            />
            <button type="submit" className="send-button">Send</button>
          </div>
        </form>
      </div>

      <div className="online-users-sidebar" id="online-users-sidebar">
        <div className="online-users-header">
          Online — 0
        </div>
        <div className="online-users-list">
          {/* Online users will be listed here */}
        </div>
      </div>

      <div className="toast-notification" id="toast-notification">
        <span className="icon" />
        <span className="message" />
      </div>
    </div>
  );
}