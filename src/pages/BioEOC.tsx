import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FC,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { createClient } from '@supabase/supabase-js';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../supabaseClient'; // Your local database

// --- EXTERNAL DBB SETUP ---
const EXTERNAL_URL = 'https://tencnsastgpixdovllgm.supabase.co';
const EXTERNAL_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbmNuc2FzdGdwaXhkb3ZsbGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNjA3MjAsImV4cCI6MjA4MzYzNjcyMH0.UduSJ22viX-pRPlrKgHh0yiPT--v9kmi2w_rTB-uQi0';
const externalSupabase = createClient(EXTERNAL_URL, EXTERNAL_KEY);

// === TYPES & INTERFACES ===
interface EOCTopic {
  standard: string;
  title: string;
  quizUrl: string;
  videoUrl: string;
  extraLinks?: { title: string; url: string; icon: string }[];
}

interface CramVideo {
  title: string;
  url: string;
}

interface UserProfile {
  student_id: string;
  display_name: string;
}

interface TopicProgress {
  confidence: string;
  notes: string;
  teacher_feedback: string;
}

interface AggregatedStudentData {
  student_id: string;
  display_name: string;
  progress: Record<string, TopicProgress>;
  lowCount: number;
}

// === DATA MAPPING ===
const eocTopics: EOCTopic[] = [
  {
    standard: 'N.1.1',
    title: 'Scientific Method',
    quizUrl: 'https://wayground.com/join?gc=42149886',
    videoUrl: 'https://www.youtube.com/embed/3nAETHZTObk',
  },
  {
    standard: 'L.18.12',
    title: 'Properties of Water',
    quizUrl: 'https://wayground.com/join?gc=12527614',
    videoUrl: 'https://www.youtube.com/embed/3jwAGWky98c',
  },
  {
    standard: 'L.18.9',
    title: 'Photosynthesis & Cellular Respiration',
    quizUrl: 'https://wayground.com/join?gc=54306814',
    videoUrl: 'https://www.youtube.com/embed/BsVIPnIeYFs',
  },
  {
    standard: 'L.18.1',
    title: 'Macromolecules',
    quizUrl: 'https://wayground.com/join?gc=29009918',
    videoUrl: 'https://www.youtube.com/embed/V5hhrDFo8Vk',
  },
  {
    standard: 'L.18.2',
    title: 'Enzymes',
    quizUrl: 'https://wayground.com/join?gc=22421505',
    videoUrl: 'https://www.youtube.com/embed/qgVFkRn8f10',
  },
  {
    standard: 'L.16.17',
    title: 'Mitosis and Meiosis',
    quizUrl: 'https://wayground.com/join?gc=17934334',
    videoUrl: 'https://www.youtube.com/embed/zrKdz93WlVk',
  },
  {
    standard: 'L.16.3',
    title: 'DNA Replication',
    quizUrl: 'https://wayground.com/join?gc=50266113',
    videoUrl: 'https://www.youtube.com/embed/8m6hHRlKwxY',
  },
  {
    standard: 'L.14.3',
    title: 'Cell Structure',
    quizUrl: 'https://wayground.com/join?gc=18900990',
    videoUrl: 'https://www.youtube.com/embed/6mgkoqcm6Sg',
    extraLinks: [
      {
        title: 'Roblox Project',
        url: 'https://www.roblox.com/games/109845353247068/Cell-project',
        icon: 'fa-solid fa-gamepad',
      },
      {
        title: 'Playthrough',
        url: 'https://www.youtube.com/watch?v=mmNMCCNlrrE',
        icon: 'fa-brands fa-youtube text-red-500',
      },
    ],
  },
  {
    standard: 'L.14.1',
    title: 'Cell Theory',
    quizUrl: 'https://wayground.com/join?gc=59533310',
    videoUrl: 'https://www.youtube.com/embed/4OpBylwH9DU',
  },
  {
    standard: 'L.14.2',
    title: 'Types of Microscopes',
    quizUrl: 'https://wayground.com/join?gc=47505409',
    videoUrl: 'https://www.youtube.com/embed/tVcEEw6qbBQ',
  },
  {
    standard: 'L.17.20',
    title: 'Human Impact',
    quizUrl: 'https://wayground.com/join?gc=08808446',
    videoUrl: 'https://www.youtube.com/embed/ThpzFgoGrKE',
  },
  {
    standard: 'L.17.9',
    title: 'Food Webs and Energy Transfer',
    quizUrl: 'https://wayground.com/join?gc=22767614',
    videoUrl: 'https://www.youtube.com/embed/-oVavgmveyY',
  },
  {
    standard: 'L.17.5',
    title: 'Population Size',
    quizUrl: 'https://wayground.com/join?gc=45410302',
    videoUrl: 'https://www.youtube.com/embed/J4N-lkt0RMc',
  },
  {
    standard: 'L.16.13',
    title: 'Reproductive System',
    quizUrl: 'https://wayground.com/join?gc=24373246',
    videoUrl: 'https://www.youtube.com/embed/_x8Saa58zvY',
  },
  {
    standard: 'L.16.10',
    title: 'Biotechnology',
    quizUrl: 'https://wayground.com/join?gc=51943422',
    videoUrl: 'https://www.youtube.com/embed/CDw4WPng2iE',
  },
  {
    standard: 'L.14.52',
    title: 'Immune System',
    quizUrl: 'https://wayground.com/join?gc=63084542',
    videoUrl: 'https://www.youtube.com/embed/PSRJfaAYkW4',
  },
  {
    standard: 'L.14.36',
    title: 'Cardiovascular System',
    quizUrl: 'https://wayground.com/join?gc=53239806',
    videoUrl: 'https://www.youtube.com/embed/pLSa4UAVLOU',
  },
  {
    standard: 'L.14.26',
    title: 'The Brain',
    quizUrl: 'https://wayground.com/join?gc=53108734',
    videoUrl: 'https://www.youtube.com/embed/5UcGIPDSiYA',
  },
  {
    standard: 'L.14.7',
    title: 'Plant Structure',
    quizUrl: 'https://wayground.com/join?gc=61759486',
    videoUrl: 'https://www.youtube.com/embed/lWcIhIyKeog',
  },
  {
    standard: 'L.16.1',
    title: 'Genetics',
    quizUrl: 'https://wayground.com/join?gc=06100990',
    videoUrl: 'https://www.youtube.com/embed/jLmoJPxihjA',
  },
  {
    standard: 'L.15.13',
    title: 'Natural Selection',
    quizUrl: 'https://wayground.com/join?gc=48062462',
    videoUrl: 'https://www.youtube.com/embed/7VM9YxmULuo',
  },
  {
    standard: 'L.15.8',
    title: 'Origin of Life',
    quizUrl: 'https://wayground.com/join?gc=45047806',
    videoUrl: 'https://www.youtube.com/embed/de1hiS_XjWg',
  },
  {
    standard: 'L.15.6',
    title: 'Classification',
    quizUrl: 'https://wayground.com/join?gc=29679614',
    videoUrl: 'https://www.youtube.com/embed/Xzy4Ze93G3g',
  },
  {
    standard: 'L.15.1',
    title: 'Evolution',
    quizUrl: 'https://wayground.com/join?gc=11108350',
    videoUrl: 'https://www.youtube.com/embed/fI7IV3x-dGI',
  },
];

const cramVideos: CramVideo[] = [
  {
    title: '10 Things Not to Forget',
    url: 'https://www.youtube.com/embed/6zyXCaqi1Mo',
  },
  {
    title: '25-Min Cram Session',
    url: 'https://www.youtube.com/embed/bDQ1b9kzUuU',
  },
  {
    title: 'Video Practice Questions',
    url: 'https://www.youtube.com/embed/hxSw3heTMUM',
  },
];

// Configuration
const EXAM_DATE = new Date('2026-05-05T08:00:00').getTime(); // Arbitrary EOC Date

const BioEOC: FC = () => {
  const { themeClass, themeStyle } = useTheme();

  // Auth & User State
  const [studentIdInput, setStudentIdInput] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');

  // Topic Progress State (Student)
  const [progressData, setProgressData] = useState<
    Record<string, TopicProgress>
  >({});
  const [savingStandard, setSavingStandard] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<boolean>(false);

  // Teacher View State
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [teacherData, setTeacherData] = useState<AggregatedStudentData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterNeedsHelp, setFilterNeedsHelp] = useState<boolean>(false);
  const teacherDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Player View State
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activeMediaType, setActiveMediaType] = useState<'video' | 'quiz'>(
    'video',
  );

  // Exam Timer
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number }>({
    days: 0,
    hours: 0,
  });

  // Debounce ref for student notes
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Session & Timer
  useEffect((): void | (() => void) => {
    const savedUser = localStorage.getItem('bio_eoc_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as UserProfile;
        setCurrentUser(parsedUser);
        if (parsedUser.student_id === '1002029273') setIsTeacher(true);
      } catch (error) {
        console.error('Failed to parse saved user data', error);
        localStorage.removeItem('bio_eoc_user');
      }
    }

    const updateTimer = (): void => {
      const distance = EXAM_DATE - new Date().getTime();
      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor(
            (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
          ),
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 3600000); // Check every hour
    return (): void => clearInterval(interval);
  }, []);

  // Fetch Student Data
  const fetchProgress = useCallback(async (): Promise<void> => {
    if (!currentUser || isTeacher) return;
    const { data, error } = await supabase
      .from('bio_eoc_topic_data')
      .select('standard, confidence, notes, teacher_feedback')
      .eq('student_id', currentUser.student_id);

    if (error) {
      console.error('Error fetching progress:', error);
      return;
    }

    if (data) {
      const mappedData: Record<string, TopicProgress> = {};
      data.forEach((item) => {
        mappedData[item.standard] = {
          confidence: item.confidence,
          notes: item.notes || '',
          teacher_feedback: item.teacher_feedback || '',
        };
      });
      setProgressData(mappedData);
    }
  }, [currentUser, isTeacher]);

  // Fetch Teacher Data
  const fetchTeacherData = useCallback(async (): Promise<void> => {
    if (!isTeacher) return;
    const [usersResponse, dataResponse] = await Promise.all([
      supabase.from('bio_eoc_users').select('*'),
      supabase.from('bio_eoc_topic_data').select('*'),
    ]);

    if (usersResponse.error)
      console.error('Error fetching users:', usersResponse.error);
    if (dataResponse.error)
      console.error('Error fetching data:', dataResponse.error);

    if (usersResponse.data && dataResponse.data) {
      const aggregated = usersResponse.data.map((user) => {
        const userProgress = dataResponse.data.filter(
          (p) => p.student_id === user.student_id,
        );
        const progressMap: Record<string, TopicProgress> = {};
        let lowCount = 0;

        userProgress.forEach((p) => {
          if (p.confidence === 'Low') lowCount++;
          progressMap[p.standard] = {
            confidence: p.confidence,
            notes: p.notes || '',
            teacher_feedback: p.teacher_feedback || '',
          };
        });

        return {
          student_id: user.student_id,
          display_name: user.display_name,
          progress: progressMap,
          lowCount,
        };
      });

      aggregated.sort((a, b) => a.display_name.localeCompare(b.display_name));
      setTeacherData(aggregated);
    }
  }, [isTeacher]);

  useEffect((): void => {
    if (currentUser) {
      if (isTeacher) void fetchTeacherData();
      else void fetchProgress();
    }
  }, [currentUser, isTeacher, fetchProgress, fetchTeacherData]);

  // Handle Auth
  const handleLogin = async (): Promise<void> => {
    const idStr = studentIdInput.trim();
    if (!idStr) return;
    setLoading(true);
    setMsg('');

    try {
      if (idStr === '1002029273' || idStr === '80085') {
        const teacherProfile = {
          student_id: '1002029273',
          display_name: 'Teacher Dashboard',
        };
        setCurrentUser(teacherProfile);
        setIsTeacher(true);
        localStorage.setItem('bio_eoc_user', JSON.stringify(teacherProfile));
        setLoading(false);
        return;
      }

      const { data: localUser, error: localError } = await supabase
        .from('bio_eoc_users')
        .select('*')
        .eq('student_id', idStr)
        .maybeSingle();
      if (localError) console.error('Local user lookup error:', localError);

      if (localUser) {
        setCurrentUser(localUser as UserProfile);
        localStorage.setItem('bio_eoc_user', JSON.stringify(localUser));
        setLoading(false);
        return;
      }

      const { data: extData, error: extError } = await externalSupabase
        .from('members')
        .select('DisplayName')
        .eq('Mail', `${idStr}@student.myscps.us`)
        .single();
      if (extError || !extData) {
        setMsg('Student not found. Check your ID.');
        setLoading(false);
        return;
      }

      let parsedName = extData.DisplayName || '';
      if (parsedName.includes(',')) parsedName = parsedName.split(',')[1];
      parsedName = parsedName.replace('(CAIT)', '').trim();

      const { data: newUser, error: insertError } = await supabase
        .from('bio_eoc_users')
        .insert([{ student_id: idStr, display_name: parsedName }])
        .select()
        .single();
      if (insertError) throw insertError;

      setCurrentUser(newUser as UserProfile);
      localStorage.setItem('bio_eoc_user', JSON.stringify(newUser));
    } catch (err: unknown) {
      console.error('Login Error:', err);
      setMsg('Error signing in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = (): void => {
    setCurrentUser(null);
    setProgressData({});
    setIsTeacher(false);
    setTeacherData([]);
    setStudentIdInput('');
    setActiveTopicId(null);
    localStorage.removeItem('bio_eoc_user');
  };

  // Student Progress Update (Debounced)
  const syncSupabase = async (
    studentId: string,
    standard: string,
    updatedData: TopicProgress,
  ): Promise<void> => {
    setSavingStandard(standard);
    const { error } = await supabase.from('bio_eoc_topic_data').upsert(
      {
        student_id: studentId,
        standard: standard,
        confidence: updatedData.confidence,
        notes: updatedData.notes,
        teacher_feedback: updatedData.teacher_feedback,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id, standard' },
    );

    if (error) console.error('Error saving progress:', error);
    setTimeout((): void => setSavingStandard(null), 500);
  };

  const updateConfidence = (standard: string, level: string): void => {
    if (!currentUser || isTeacher) return;
    const currentData = progressData[standard] || {
      confidence: 'Unrated',
      notes: '',
      teacher_feedback: '',
    };
    const updatedData = { ...currentData, confidence: level };
    setProgressData((prev) => ({ ...prev, [standard]: updatedData }));
    void syncSupabase(currentUser.student_id, standard, updatedData);
  };

  const handleNotesChange = (standard: string, val: string): void => {
    if (isTeacher || !currentUser) return;
    const currentData = progressData[standard] || {
      confidence: 'Unrated',
      notes: '',
      teacher_feedback: '',
    };
    const updatedData = { ...currentData, notes: val };

    setProgressData((prev) => ({ ...prev, [standard]: updatedData }));

    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout((): void => {
      void syncSupabase(currentUser.student_id, standard, updatedData);
    }, 1200);
  };

  // Teacher Feedback Update (Debounced)
  const handleTeacherFeedback = (
    studentId: string,
    standard: string,
    val: string,
  ): void => {
    setTeacherData((prev: AggregatedStudentData[]): AggregatedStudentData[] =>
      prev.map((s: AggregatedStudentData) => {
        if (s.student_id !== studentId) return s;
        const prog = s.progress[standard] || {
          confidence: 'Unrated',
          notes: '',
          teacher_feedback: '',
        };
        return {
          ...s,
          progress: {
            ...s.progress,
            [standard]: { ...prog, teacher_feedback: val },
          },
        };
      }),
    );

    if (teacherDebounceRef.current) clearTimeout(teacherDebounceRef.current);
    teacherDebounceRef.current = setTimeout(async (): Promise<void> => {
      const student = teacherData.find((s) => s.student_id === studentId);
      if (!student) return;
      const existingProg = student.progress[standard] || {
        confidence: 'Unrated',
        notes: '',
        teacher_feedback: '',
      };
      const { error } = await supabase.from('bio_eoc_topic_data').upsert(
        {
          student_id: studentId,
          standard: standard,
          confidence: existingProg.confidence,
          notes: existingProg.notes,
          teacher_feedback: val,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id, standard' },
      );

      if (error) console.error('Error saving teacher feedback:', error);
    }, 1200);
  };

  // Export CSV
  const exportCSV = (): void => {
    let csv =
      'Student Name,Student ID,Standard,Confidence,Student Notes,Teacher Feedback\n';
    teacherData.forEach((student) => {
      eocTopics.forEach((topic) => {
        const p = student.progress[topic.standard];
        if (p) {
          const notes = (p.notes || '').replace(/"/g, '""');
          const feedback = (p.teacher_feedback || '').replace(/"/g, '""');
          csv += `"${student.display_name}","${student.student_id}","${topic.standard}","${p.confidence}","${notes}","${feedback}"\n`;
        }
      });
    });
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'EOC_Progress_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Computed Values
  const highCount = Object.values(progressData).filter(
    (p) => p.confidence === 'High',
  ).length;
  const progressPercent = Math.round((highCount / eocTopics.length) * 100) || 0;

  // Student Sort Logic
  const getWeight = (conf: string): number => {
    if (conf === 'Low') return 1;
    if (conf === 'Unrated') return 2;
    if (conf === 'Medium') return 3;
    if (conf === 'High') return 4;
    return 5;
  };

  const sortedTopics = [...eocTopics].sort((a, b) => {
    const confA = progressData[a.standard]?.confidence || 'Unrated';
    const confB = progressData[b.standard]?.confidence || 'Unrated';
    return getWeight(confA) - getWeight(confB);
  });

  const displayedTopics = focusMode
    ? sortedTopics.filter((t) => {
        const c = progressData[t.standard]?.confidence || 'Unrated';
        return c === 'Low' || c === 'Unrated';
      })
    : sortedTopics;

  // Player Navigation
  const activeIndex = sortedTopics.findIndex(
    (t) => t.standard === activeTopicId,
  );
  const prevTopic = activeIndex > 0 ? sortedTopics[activeIndex - 1] : null;
  const nextTopic =
    activeIndex < sortedTopics.length - 1
      ? sortedTopics[activeIndex + 1]
      : null;

  const activeTopicObj = activeTopicId
    ? eocTopics.find((t) => t.standard === activeTopicId)
    : null;
  const activeMediaUrl = activeTopicObj
    ? activeMediaType === 'video'
      ? activeTopicObj.videoUrl
      : activeTopicObj.quizUrl
    : '';
  const activeTopicData = activeTopicId
    ? progressData[activeTopicId] || {
        confidence: 'Unrated',
        notes: '',
        teacher_feedback: '',
      }
    : { confidence: 'Unrated', notes: '', teacher_feedback: '' };

  // Heatmap calculation
  const heatmapData = eocTopics.map((topic) => {
    const stats = { High: 0, Medium: 0, Low: 0, Unrated: 0 };
    teacherData.forEach((student) => {
      const conf = student.progress[topic.standard]?.confidence || 'Unrated';
      if (stats[conf as keyof typeof stats] !== undefined)
        stats[conf as keyof typeof stats]++;
    });
    return { standard: topic.standard, ...stats };
  });

  // Filtered Teacher Data
  const filteredTeacherData = teacherData.filter((s) => {
    const matchesSearch =
      s.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.includes(searchQuery);
    const matchesFilter = filterNeedsHelp ? s.lowCount >= 5 : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div
      className={`min-h-screen w-full font-sans text-white overflow-x-hidden pt-8 pb-16 ${themeClass}`}
      style={themeStyle}
    >
      {/* EXAM TIMER HEADER */}
      <div className='w-full bg-slate-900 border-b border-teal-500/30 text-center py-2 fixed top-0 left-0 z-50 flex justify-center items-center gap-3 shadow-md'>
        {/* NEW BACK BUTTON */}
        <a
          href='https://croomsconnect.com'
          className='absolute left-4 md:left-8 text-teal-400 hover:text-teal-300 flex items-center gap-2 text-xs font-bold uppercase transition-colors'
        >
          <i className='fa-solid fa-arrow-left'></i>
          <span className='hidden md:inline'>Back to croomsconnect.com</span>
          <span className='md:hidden'>Back</span>
        </a>

        <i className='fa-solid fa-clock text-teal-400'></i>
        <span className='font-bold text-sm tracking-widest uppercase'>
          Bio EOC In:
        </span>
        <span className='bg-teal-900 text-teal-100 px-3 py-1 rounded text-xs font-mono'>
          {timeLeft.days} Days, {timeLeft.hours} Hours
        </span>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 mt-10'>
        {/* HERO SECTION */}
        <div className='bg-black/60 border border-teal-500/40 rounded-3xl p-10 md:p-16 text-center shadow-lg relative'>
          {currentUser && (
            <div className='absolute top-6 right-8 text-right hidden md:block'>
              <p className='text-teal-400 text-sm font-bold tracking-wider uppercase'>
                {isTeacher ? 'Administrator' : 'Signed In As'}
              </p>
              <p className='text-white font-medium'>
                {currentUser.display_name}
              </p>
              <button
                onClick={handleSignOut}
                className='text-slate-400 text-xs mt-1 hover:text-white'
              >
                Sign Out
              </button>
            </div>
          )}
          <h2 className='text-teal-400 font-bold tracking-widest uppercase text-sm md:text-base mb-3'>
            Crooms Academy of IT
          </h2>
          <h1 className='text-white text-5xl md:text-7xl font-extrabold tracking-tight mb-5'>
            BIOLOGY REVIEW
          </h1>
          <p className='text-white tracking-widest text-sm md:text-lg font-medium uppercase'>
            {isTeacher ? 'Instructor Data Portal' : 'Explore. Review. Succeed.'}
          </p>
        </div>

        {/* LOGIN WALL */}
        {!currentUser ? (
          <div className='max-w-md mx-auto bg-slate-900 border border-teal-500/40 rounded-3xl p-8 shadow-2xl text-center'>
            <div className='w-16 h-16 bg-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto mb-6'>
              <i className='fa-solid fa-user-graduate text-3xl'></i>
            </div>
            <h2 className='text-2xl font-bold text-white mb-2'>
              Student Sign In
            </h2>
            <p className='text-slate-400 text-sm mb-6'>
              Enter your 592 number to access materials.
            </p>

            <input
              type='number'
              value={studentIdInput}
              onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                setStudentIdInput(e.target.value)
              }
              className='w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-teal-500 focus:outline-none tracking-widest font-mono text-lg text-center mb-4'
              placeholder='592...'
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
                if (e.key === 'Enter') void handleLogin();
              }}
            />

            <button
              onClick={(): void => {
                void handleLogin();
              }}
              disabled={loading || studentIdInput.length < 5}
              className='w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center items-center gap-2 disabled:opacity-50'
            >
              {loading ? 'Verifying...' : 'Access Materials'}
            </button>
            {msg && (
              <p className='text-red-400 mt-4 font-medium text-sm'>{msg}</p>
            )}
          </div>
        ) : isTeacher ? (
          /* ================= TEACHER DASHBOARD ================= */
          <div className='bg-slate-900 border border-teal-500/40 rounded-3xl p-6 md:p-10 shadow-2xl'>
            <div className='mb-8 border-b border-white/10 pb-6 flex justify-between items-end flex-wrap gap-4'>
              <div>
                <h2 className='text-3xl font-extrabold text-white'>
                  Class Command Center
                </h2>
                <p className='text-slate-400 mt-2 text-sm'>
                  Review notes, analyze confidence, and issue direct feedback.
                </p>
              </div>
              <div className='flex gap-3'>
                <button
                  onClick={exportCSV}
                  className='bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-bold border border-slate-700'
                >
                  <i className='fa-solid fa-download'></i> Export CSV
                </button>
                <button
                  onClick={(): void => {
                    void fetchTeacherData();
                  }}
                  className='bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-bold border border-teal-600'
                >
                  <i className='fa-solid fa-rotate-right'></i> Refresh Data
                </button>
              </div>
            </div>

            {/* CLASS HEATMAP */}
            <div className='mb-10 bg-black/40 rounded-2xl p-6 border border-slate-800'>
              <h3 className='text-lg font-bold mb-4 flex items-center gap-2'>
                <i className='fa-solid fa-fire text-red-500'></i> Class-Wide
                Confidence Heatmap
              </h3>
              <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2'>
                {heatmapData.map((d) => {
                  const total = d.High + d.Medium + d.Low + d.Unrated || 1;
                  return (
                    <div
                      key={d.standard}
                      className='bg-slate-900 p-2 rounded border border-slate-800 flex flex-col justify-between'
                    >
                      <span className='text-xs font-bold text-center mb-2'>
                        {d.standard}
                      </span>
                      <div className='flex h-3 w-full rounded overflow-hidden'>
                        <div
                          style={{ width: `${(d.Low / total) * 100}%` }}
                          className='bg-red-500'
                          title={`Low: ${d.Low}`}
                        ></div>
                        <div
                          style={{ width: `${(d.Medium / total) * 100}%` }}
                          className='bg-amber-500'
                          title={`Medium: ${d.Medium}`}
                        ></div>
                        <div
                          style={{ width: `${(d.High / total) * 100}%` }}
                          className='bg-emerald-500'
                          title={`High: ${d.High}`}
                        ></div>
                        <div
                          style={{ width: `${(d.Unrated / total) * 100}%` }}
                          className='bg-slate-600'
                          title={`Unrated: ${d.Unrated}`}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEARCH & FILTER */}
            <div className='flex flex-col md:flex-row gap-4 mb-6'>
              <input
                type='text'
                placeholder='Search student name or ID...'
                className='bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white w-full md:w-1/3 outline-none focus:border-teal-500'
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                  setSearchQuery(e.target.value)
                }
              />
              <button
                onClick={(): void => setFilterNeedsHelp(!filterNeedsHelp)}
                className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${filterNeedsHelp ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
              >
                <i className='fa-solid fa-filter'></i> 5+ Low Topics
              </button>
            </div>

            {/* STUDENT LIST */}
            <div className='space-y-6'>
              {filteredTeacherData.length === 0 ? (
                <p className='text-slate-500 text-center py-10 font-medium'>
                  No students match current filters.
                </p>
              ) : (
                filteredTeacherData.map((student) => (
                  <div
                    key={student.student_id}
                    className='bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm'
                  >
                    <h3 className='text-xl font-bold text-white mb-4 flex items-center gap-3'>
                      <i className='fa-solid fa-user-circle text-teal-500'></i>
                      {student.display_name}
                      <span className='text-sm text-slate-500 font-mono font-normal'>
                        ({student.student_id})
                      </span>
                      {student.lowCount >= 5 && (
                        <span className='ml-auto text-xs bg-red-900/50 text-red-400 px-2 py-1 rounded border border-red-800'>
                          Needs Intervention
                        </span>
                      )}
                    </h3>

                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                      {eocTopics.map((topic) => {
                        const prog = student.progress[topic.standard];
                        if (!prog) return null; // Only show topics they've interacted with (or modify query to load all)
                        const conf = prog.confidence || 'Unrated';
                        if (conf === 'Unrated' && !prog.notes) return null; // Hide totally blank ones to save space in teacher view

                        let colorClass = 'bg-slate-900 border-slate-800';
                        if (conf === 'Low')
                          colorClass = 'bg-red-500/10 border-red-500/30';
                        if (conf === 'Medium')
                          colorClass = 'bg-amber-500/10 border-amber-500/30';
                        if (conf === 'High')
                          colorClass =
                            'bg-emerald-500/10 border-emerald-500/30';

                        return (
                          <div
                            key={topic.standard}
                            className={`p-4 rounded-xl border ${colorClass} flex flex-col items-start`}
                          >
                            <div className='flex justify-between w-full items-center mb-2'>
                              <span className='text-xs font-bold opacity-70 tracking-wider uppercase'>
                                {topic.standard}
                              </span>
                              <span
                                className={`text-sm font-semibold ${conf === 'Low' ? 'text-red-400' : conf === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}
                              >
                                {conf}
                              </span>
                            </div>
                            {prog.notes && (
                              <div className='w-full mb-3 text-xs text-slate-300 break-words whitespace-pre-wrap max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-current/20'>
                                <span className='block text-[10px] uppercase opacity-50 mb-1'>
                                  Student Notes
                                </span>
                                {prog.notes}
                              </div>
                            )}
                            <textarea
                              placeholder='Leave feedback...'
                              className='w-full bg-black/50 border border-slate-700 rounded p-2 text-xs text-teal-100 placeholder-slate-600 focus:border-teal-500 outline-none resize-none mt-auto'
                              rows={2}
                              value={prog.teacher_feedback || ''}
                              onChange={(
                                e: ChangeEvent<HTMLTextAreaElement>,
                              ): void =>
                                handleTeacherFeedback(
                                  student.student_id,
                                  topic.standard,
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTopicId && activeTopicObj ? (
          /* ================= ACTIVE PLAYER VIEW ================= */
          <div className='bg-slate-900 border border-teal-500/40 rounded-3xl p-6 md:p-10 shadow-2xl'>
            <div className='mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6'>
              <div>
                <button
                  onClick={(): void => setActiveTopicId(null)}
                  className='text-teal-400 hover:text-teal-300 mb-3 flex items-center gap-2 text-sm font-bold uppercase'
                >
                  <i className='fa-solid fa-arrow-left'></i> Back to Dashboard
                </button>
                <h2 className='text-3xl font-extrabold text-white'>
                  {activeTopicObj.title}
                </h2>
                <p className='text-slate-400 font-mono mt-1'>
                  Standard {activeTopicObj.standard}
                </p>
              </div>

              <div className='flex gap-4 items-center'>
                <div className='flex gap-2'>
                  <button
                    disabled={!prevTopic}
                    onClick={(): void =>
                      setActiveTopicId(prevTopic?.standard || null)
                    }
                    className='p-2 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed'
                  >
                    <i className='fa-solid fa-chevron-left'></i>
                  </button>
                  <button
                    disabled={!nextTopic}
                    onClick={(): void =>
                      setActiveTopicId(nextTopic?.standard || null)
                    }
                    className='p-2 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed'
                  >
                    <i className='fa-solid fa-chevron-right'></i>
                  </button>
                </div>
                <div className='flex bg-black/50 p-1.5 rounded-xl border border-white/10 shrink-0'>
                  <button
                    onClick={(): void => setActiveMediaType('quiz')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm ${activeMediaType === 'quiz' ? 'bg-teal-600 text-white' : 'text-slate-400'}`}
                  >
                    Quiz
                  </button>
                  <button
                    onClick={(): void => setActiveMediaType('video')}
                    className={`px-4 py-2 rounded-lg font-bold text-sm ${activeMediaType === 'video' ? 'bg-teal-600 text-white' : 'text-slate-400'}`}
                  >
                    Video
                  </button>
                </div>
              </div>
            </div>

            <div className='flex flex-col lg:flex-row gap-8'>
              <div className='lg:w-2/3 flex flex-col bg-black rounded-2xl overflow-hidden border border-white/10 min-h-[500px] relative'>
                {activeMediaType === 'quiz' && (
                  <div className='absolute top-0 w-full bg-teal-900/40 text-teal-200 text-xs text-center py-1 font-bold z-10 border-b border-teal-500/20'>
                    INTERACTIVE PRACTICE
                  </div>
                )}
                <iframe
                  src={activeMediaUrl}
                  className='w-full h-full min-h-[500px] md:min-h-[600px] border-none'
                  allowFullScreen
                ></iframe>
              </div>

              <div className='lg:w-1/3 flex flex-col bg-slate-950/50 border border-white/10 rounded-2xl p-6 relative'>
                {savingStandard === activeTopicObj.standard && (
                  <div className='absolute top-6 right-6 text-teal-400 text-xs font-bold'>
                    Saving...
                  </div>
                )}

                <h3 className='text-xl font-bold text-white mb-4'>
                  <i className='fa-solid fa-book-open text-teal-500'></i>{' '}
                  Assessment
                </h3>

                <div className='mb-6'>
                  <div className='flex gap-2'>
                    {['Low', 'Medium', 'High'].map((level) => {
                      const isActive = activeTopicData.confidence === level;
                      const activeColors: Record<string, string> = {
                        Low: 'bg-red-500/20 text-red-400 border-red-500',
                        Medium:
                          'bg-amber-500/20 text-amber-400 border-amber-500',
                        High: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
                      };
                      return (
                        <button
                          key={level}
                          onClick={(): void =>
                            updateConfidence(activeTopicObj.standard, level)
                          }
                          className={`flex-1 py-2 text-sm font-bold rounded-lg border ${isActive ? activeColors[level] : 'bg-slate-900 text-slate-500 border-slate-800'}`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeTopicData.teacher_feedback && (
                  <div className='mb-4 p-4 bg-teal-900/30 border border-teal-500/50 rounded-xl'>
                    <span className='text-[10px] text-teal-400 font-bold uppercase block mb-1'>
                      <i className='fa-solid fa-comment-dots'></i> Teacher
                      Feedback
                    </span>
                    <p className='text-sm text-teal-50 whitespace-pre-wrap'>
                      {activeTopicData.teacher_feedback}
                    </p>
                  </div>
                )}

                {activeTopicObj.extraLinks &&
                  activeTopicObj.extraLinks.length > 0 && (
                    <div className='mb-4'>
                      <span className='text-xs text-slate-400 font-bold uppercase mb-2 block'>
                        Extra Resources
                      </span>
                      <div className='flex gap-2'>
                        {activeTopicObj.extraLinks.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-center text-xs font-bold text-white transition-colors'
                          >
                            <i className={link.icon}></i> {link.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                <div className='flex-grow flex flex-col'>
                  <label className='text-xs text-slate-400 font-bold uppercase mb-2'>
                    Topic Notes
                  </label>
                  <textarea
                    className='w-full flex-grow min-h-[150px] bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-white focus:border-teal-500 outline-none resize-none'
                    placeholder='Type notes here (auto-saves)...'
                    value={activeTopicData.notes}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>): void =>
                      handleNotesChange(activeTopicObj.standard, e.target.value)
                    }
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= STANDARD DASHBOARD ================= */
          <>
            {/* PROGRESS SUMMARY BAR */}
            <div className='bg-slate-900 border border-teal-500/40 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-lg'>
              <div className='flex-shrink-0 text-center md:text-left'>
                <p className='text-3xl font-extrabold text-white'>
                  {highCount}{' '}
                  <span className='text-lg text-slate-400'>/ 24</span>
                </p>
                <p className='text-xs font-bold text-teal-500 uppercase tracking-widest'>
                  Mastered Topics
                </p>
              </div>
              <div className='flex-grow w-full'>
                <div className='h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700'>
                  <div
                    className='h-full bg-teal-500'
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <p className='text-right text-xs text-slate-400 mt-2 font-mono'>
                  {progressPercent}% Readiness
                </p>
              </div>
            </div>

            <div id='topics' className='pt-4'>
              <div className='mb-8 flex flex-col md:flex-row justify-between items-center gap-4'>
                <div>
                  <h2 className='text-4xl font-bold text-white mb-2'>
                    Study Plan
                  </h2>
                  <p className='text-slate-400'>
                    Cards are prioritized to show what you need to review first.
                  </p>
                </div>
                <button
                  onClick={(): void => setFocusMode(!focusMode)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm border transition ${focusMode ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-slate-800 border-slate-700 text-white'}`}
                >
                  <i className='fa-solid fa-crosshairs'></i>{' '}
                  {focusMode ? 'Exit Focus Mode' : 'Focus Mode (Low/Unrated)'}
                </button>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
                {displayedTopics.map((topic) => {
                  const data = progressData[topic.standard] || {
                    confidence: 'Unrated',
                    notes: '',
                    teacher_feedback: '',
                  };
                  const conf = data.confidence;

                  // Top border color based on confidence to emphasize priority
                  let borderClass = 'border-white/10';
                  if (conf === 'Low') borderClass = 'border-red-500';
                  if (conf === 'Medium') borderClass = 'border-amber-500/50';
                  if (conf === 'High') borderClass = 'border-emerald-500/30';

                  return (
                    <div
                      key={topic.standard}
                      className={`bg-slate-900 border-t-4 border-b border-l border-r ${borderClass} rounded-2xl flex flex-col shadow-md relative`}
                    >
                      {savingStandard === topic.standard && (
                        <div className='absolute top-4 right-4 text-teal-400 text-[10px] font-bold'>
                          Saving...
                        </div>
                      )}

                      <div className='p-6 flex-grow'>
                        <span className='inline-block px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-full mb-3 border border-slate-700'>
                          Standard {topic.standard}
                        </span>
                        <h3 className='text-xl font-bold text-white leading-snug mb-4'>
                          {topic.title}
                        </h3>

                        <div className='mb-4'>
                          <div className='flex gap-1'>
                            {['Low', 'Medium', 'High'].map((level) => {
                              const isActive = conf === level;
                              const activeColors: Record<string, string> = {
                                Low: 'bg-red-500/20 text-red-400 border-red-500',
                                Medium:
                                  'bg-amber-500/20 text-amber-400 border-amber-500',
                                High: 'bg-emerald-500/20 text-emerald-400 border-emerald-500',
                              };
                              return (
                                <button
                                  key={level}
                                  onClick={(): void =>
                                    updateConfidence(topic.standard, level)
                                  }
                                  className={`flex-1 py-1 text-xs font-semibold rounded border ${isActive ? activeColors[level] : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                                >
                                  {level}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {data.teacher_feedback && (
                          <div className='mb-3 p-3 bg-teal-900/30 border border-teal-500/50 rounded-lg'>
                            <span className='text-[10px] text-teal-400 font-bold uppercase block mb-1'>
                              <i className='fa-solid fa-comment-dots'></i>{' '}
                              Teacher Note
                            </span>
                            <p className='text-xs text-teal-50 line-clamp-2'>
                              {data.teacher_feedback}
                            </p>
                          </div>
                        )}

                        <textarea
                          className='w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:border-teal-500 outline-none resize-none'
                          rows={2}
                          placeholder='Quick notes...'
                          value={data.notes}
                          onChange={(
                            e: ChangeEvent<HTMLTextAreaElement>,
                          ): void =>
                            handleNotesChange(topic.standard, e.target.value)
                          }
                        ></textarea>

                        {topic.extraLinks && topic.extraLinks.length > 0 && (
                          <div className='mt-4 pt-4 border-t border-slate-800'>
                            <span className='text-[10px] text-slate-400 font-bold uppercase mb-2 block'>
                              Extra Resources
                            </span>
                            <div className='flex gap-2'>
                              {topic.extraLinks.map((link, i) => (
                                <a
                                  key={i}
                                  href={link.url}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-center text-xs font-bold text-slate-300 hover:text-white transition-colors'
                                >
                                  <i className={link.icon}></i> {link.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className='bg-black/40 border-t border-white/10 flex flex-row divide-x divide-white/10 rounded-b-2xl'>
                        <button
                          onClick={(): void => {
                            setActiveTopicId(topic.standard);
                            setActiveMediaType('quiz');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className='w-1/2 py-3 text-slate-300 text-xs font-semibold hover:bg-teal-600 hover:text-white'
                        >
                          <i className='fa-solid fa-gamepad'></i> Quiz
                        </button>
                        <button
                          onClick={(): void => {
                            setActiveTopicId(topic.standard);
                            setActiveMediaType('video');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className='w-1/2 py-3 text-slate-300 text-xs font-semibold hover:bg-teal-600 hover:text-white'
                        >
                          <i className='fa-solid fa-play'></i> Video
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CRAM SESSION */}
            <div className='mt-16 bg-black/60 border border-red-500/50 rounded-3xl p-10 text-center'>
              <h2 className='text-3xl font-bold text-white mb-3'>
                <i className='fa-solid fa-fire text-red-500'></i> Final Push
                Prep
              </h2>
              <p className='text-slate-300 mb-6 max-w-xl mx-auto text-sm'>
                Short on time? Use the targeted cram sessions below.
              </p>
              <div className='flex flex-wrap justify-center gap-4'>
                {cramVideos.map((video, idx) => (
                  <a
                    key={idx}
                    href={video.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='px-5 py-3 bg-red-900/50 border border-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold flex items-center gap-2'
                  >
                    <i className='fa-solid fa-play-circle'></i> {video.title}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}

        {/* FOOTER / ATTRIBUTION */}
        <div className='mt-16 pt-8 border-t border-white/10 flex flex-col items-center justify-center gap-4 text-slate-400 text-sm pb-8'>
          <div className='flex items-center gap-2'>
            <img
              src='/favicon.ico'
              alt='Crooms Connect Logo'
              className='w-6 h-6 rounded'
            />
            <span className='font-semibold text-white tracking-wide'>
              Sponsored by Crooms Connect
            </span>
          </div>
          <p>
            Made by{' '}
            <span className='text-teal-400 font-bold'>
              Ashton Koodie (AJTech)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BioEOC;
