import React, { useState, useEffect } from 'react';
// @ts-ignore: Supabase JS UMD only for CDN – for Vite/webpack/react use ESM!
import { createClient, Session, User } from '@supabase/supabase-js';

// -- Supabase config --
const SUPABASE_URL = 'https://jxxnfsydjrflnephmfjm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eG5mc3lkanJmbG5lcGhtZmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NTA3NjUsImV4cCI6MjA3NTAyNjc2NX0.-IRbU1ER8l[...]';
const PLACEHOLDER_DOMAIN = '@croomsconnect.local';
const MAIN_APP_URL = '/index.html';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const styles = {
  root: {
    backgroundColor: '#1a1b2f',
    color: '#f8f9fa',
    fontFamily: "'Inter', sans-serif",
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#2b2d42',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    borderRadius: '15px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  btn: {
    backgroundColor: '#4cc9f0',
    color: '#1a1b2f',
    fontWeight: 700,
    padding: '10px 20px',
    borderRadius: '8px',
    transition: 'background-color 0.2s, transform 0.1s',
    width: '100%',
  } as React.CSSProperties,
  spinner: {
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid #4cc9f0',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    animation: 'spin 1s linear infinite',
    display: 'inline-block',
  } as React.CSSProperties,
  input: {
    color: '#1a1b2f',
    borderRadius: '6px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    width: '100%',
    marginBottom: '16px',
    border: 'none',
  } as React.CSSProperties,
  formGroup: { marginBottom: '20px' } as React.CSSProperties,
  message: {
    marginBottom: '16px',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '0.95em',
    transition: 'all 0.3s',
  } as React.CSSProperties,
};

type MessageType = 'error' | 'success';

const Auth: React.FC = () => {
  const [view, setView] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [message, setMessage] = useState<{ text: string; type: MessageType } | null>(null);
  const [loading, setLoading] = useState<'sign-in' | 'sign-up' | null>(null);

  // Form states
  const [signinUsername, setSigninUsername] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Session redirect effect
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setMessage({ text: 'Supabase initialization failed: ' + error.message, type: 'error' });
      } else if (data && data.session) {
        sessionStorage.setItem('loggedIn', 'true');
        window.location.href = MAIN_APP_URL;
      }
    });
  }, []);

  // Utility methods
  const showMessage = (text: string, type: MessageType = 'error') => setMessage({ text, type });
  const clearMessage = () => setMessage(null);

  // Sign In handler
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessage();
    setLoading('sign-in');

    const username = signinUsername.trim();
    const password = signinPassword;

    const email = username + PLACEHOLDER_DOMAIN;
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(null);

    if (error) {
      showMessage(
        error.message.includes('Invalid login credentials') ? 'Invalid username or password.' : error.message,
        'error'
      );
    } else {
      sessionStorage.setItem('loggedIn', 'true');
      window.location.href = MAIN_APP_URL;
    }
  };

  // Sign Up handler
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearMessage();
    setLoading('sign-up');

    const username = signupUsername.trim();
    const password = signupPassword;

    if (username.length < 3) {
      showMessage('Username must be at least 3 characters long.');
      setLoading(null);
      return;
    }
    if (password.length < 6) {
      showMessage('Password must be at least 6 characters long.');
      setLoading(null);
      return;
    }

    const email = username + PLACEHOLDER_DOMAIN;
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      showMessage(
        error.message.includes('User already registered')
          ? 'This username is already taken. Please choose another.'
          : error.message
      );
      setLoading(null);
      return;
    }
    if (data?.user) {
      // Create profile in 'profiles' table
      const { error: profileError } = await supabase.from('profiles').insert([
        { id: data.user.id, username },
      ]);
      if (profileError) {
        showMessage('Account created, but could not save your username. Please try logging in or contact support.', 'error');
        setLoading(null);
        return;
      }
    }

    setLoading(null);
    if (data?.session) {
      sessionStorage.setItem('loggedIn', 'true');
      window.location.href = MAIN_APP_URL;
    } else {
      setView('sign-in');
      showMessage('Success! Your account is created. Please sign in below.', 'success');
      setSignupUsername('');
      setSignupPassword('');
    }
  };

  // Toggle view
  const toggleView = () => {
    clearMessage();
    setView(view === 'sign-in' ? 'sign-up' : 'sign-in');
  };

  // Spinner keyframes
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <h1 className="text-3xl font-extrabold text-white mb-6">Crooms Connect</h1>
        <p className="text-gray-400 mb-8">
          {view === 'sign-in'
            ? 'Sign in using your username and password.'
            : 'Create your Crooms Connect profile.'}
        </p>

        {message && (
          <div
            style={{
              ...styles.message,
              background: message.type === 'error' ? '#c81e1e' : '#07743b',
              color: '#fff',
              display: 'block',
            }}
          >
            {message.text}
          </div>
        )}

        {view === 'sign-in' && (
          <form onSubmit={handleSignIn} style={{ width: '100%' }}>
            <div style={styles.formGroup}>
              <input
                type="text"
                required
                style={styles.input}
                placeholder="Username"
                value={signinUsername}
                onChange={e => setSigninUsername(e.target.value)}
                disabled={loading === 'sign-in'}
              />
            </div>
            <div style={styles.formGroup}>
              <input
                type="password"
                required
                style={styles.input}
                placeholder="Password"
                value={signinPassword}
                onChange={e => setSigninPassword(e.target.value)}
                disabled={loading === 'sign-in'}
              />
            </div>
            <button
              type="submit"
              style={{ ...styles.btn, opacity: loading === 'sign-in' ? 0.6 : 1 }}
              disabled={loading === 'sign-in'}
            >
              {loading === 'sign-in' ? <span style={styles.spinner}></span> : <span>Sign In</span>}
            </button>
          </form>
        )}

        {view === 'sign-up' && (
          <form onSubmit={handleSignUp} style={{ width: '100%' }}>
            <div style={styles.formGroup}>
              <input
                type="text"
                required
                style={styles.input}
                placeholder="Choose a Unique Username (e.g., JSmith24)"
                value={signupUsername}
                onChange={e => setSignupUsername(e.target.value)}
                disabled={loading === 'sign-up'}
              />
            </div>
            <div style={styles.formGroup}>
              <input
                type="password"
                required
                style={styles.input}
                placeholder="Password (min. 6 characters)"
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                disabled={loading === 'sign-up'}
              />
            </div>
            <button
              type="submit"
              style={{
                ...styles.btn,
                backgroundColor: '#80ed99',
                opacity: loading === 'sign-up' ? 0.6 : 1,
              }}
              disabled={loading === 'sign-up'}
            >
              {loading === 'sign-up' ? <span style={styles.spinner}></span> : <span>Sign Up</span>}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm" style={{ marginTop: '24px' }}>
          <button
            type="button"
            className="text-gray-400 hover:text-accent-blue transition"
            onClick={toggleView}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            {view === 'sign-in' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;