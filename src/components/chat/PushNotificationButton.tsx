import { useState, type FC } from 'react';
import { supabase } from '../../supabaseClient'; // Adjust path if needed based on your folder structure
import type { Profile } from '../../utils/databaseDefinitions';

// Helper function required by the Push API to format your security key
const urlB64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const PushNotificationButton: FC<{ profile: Profile }> = ({ profile }) => {
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (): Promise<void> => {
    if (!profile?.id) {
      alert('Profile not loaded yet. Please wait a second and try again.');
      return;
    }

    setIsSubscribing(true);
    try {
      // 1. Ask iOS/Android/Desktop for permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert(
          'Permission denied. You may need to enable notifications in your phone/browser settings.',
        );
        setIsSubscribing(false);
        return;
      }

      // 2. Register your sw.js file
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 3. THIS IS WHERE YOUR NEW KEY GOES!
      const publicVapidKey =
        'BLrK4pEgL7kPI6vF77oRlhHEeuD-7FzdnGRx3CtcLyNkmStPwvZ1S1Uxz7ZPnSUHLjD5qszlYqQunl2IvQi3rt4';

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(publicVapidKey),
      });

      // 4. Save this token to your Supabase profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ push_subscription: subscription })
        .eq('id', profile.id);

      if (error) throw error;

      alert('✅ Successfully subscribed to mentions!');
    } catch (error) {
      console.error('Error subscribing:', error);
      alert(
        'Failed to subscribe. Are you using HTTPS and is the app added to your Home Screen?',
      );
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={isSubscribing}
      className={`w-8 h-8 flex items-center justify-center rounded border transition-colors header-btn hover:text-blue-400 hover:border-blue-400 ${isSubscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
      title='Enable Push Notifications for Mentions'
    >
      {isSubscribing ? (
        <i className='fa-solid fa-circle-notch fa-spin text-sm'></i>
      ) : (
        <i className='fa-regular fa-bell text-sm'></i>
      )}
    </button>
  );
};

export default PushNotificationButton;
