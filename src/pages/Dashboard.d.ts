import type React from 'react';
import type { Session } from '@supabase/supabase-js';

declare const Dashboard: React.FC<{ session: Session; onLogout: () => void }>;

export default Dashboard;
