import { useState, useEffect, useCallback, type ReactElement } from 'react';
// @ts-expect-error - missing types, ideally run: npm i --save-dev @types/react-grid-layout
import { Responsive, WidthProvider } from 'react-grid-layout';
import { supabase } from '../supabaseClient';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Locally defined layout types to bypass missing @types package
interface Layout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  static?: boolean;
}

interface Layouts {
  [key: string]: Layout[];
}

// Type for the final formatted award cards
interface AwardData {
  id: string;
  category: string;
  winner: string;
  winnerVotes: number;
  runnerUp: string | null;
  runnerUpVotes: number;
  totalVotes: number;
}

// Type for the raw data coming from the Supabase SQL View
interface ViewCategoryWinnerRow {
  category_name: string;
  nominee: string;
  total_votes: string | number;
}

export default function ModAwards2026(): ReactElement {
  const [awardsData, setAwardsData] = useState<AwardData[]>([]);
  const [layouts, setLayouts] = useState<Layouts>({ lg: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Wrap fetch function in useCallback to stabilize it for useEffect dependencies
  const fetchAwardResults = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Fetch directly from the SQL view we created
      const { data, error: fetchError } = await supabase
        .from('view_category_winners')
        .select('*');

      if (fetchError) throw fetchError;

      // Group the flat SQL rows by category
      const groupedData: Record<
        string,
        { total: number; nominees: { name: string; votes: number }[] }
      > = {};

      // Properly typed row iteration instead of using "any"
      (data || []).forEach((row: ViewCategoryWinnerRow) => {
        if (!groupedData[row.category_name]) {
          groupedData[row.category_name] = { total: 0, nominees: [] };
        }
        groupedData[row.category_name].nominees.push({
          name: row.nominee,
          votes: Number(row.total_votes),
        });
        groupedData[row.category_name].total += Number(row.total_votes);
      });

      // Format the grouped data for the UI cards
      const formattedAwards: AwardData[] = Object.entries(groupedData).map(
        ([category, info], index) => {
          const sorted = info.nominees.sort((a, b) => b.votes - a.votes);

          return {
            id: `award_${index}`,
            category: category,
            winner: sorted[0]?.name || 'TBD',
            winnerVotes: sorted[0]?.votes || 0,
            runnerUp: sorted[1]?.name || null,
            runnerUpVotes: sorted[1]?.votes || 0,
            totalVotes: info.total,
          };
        },
      );

      setAwardsData(formattedAwards);
      setLayouts(generateLayouts(formattedAwards));
    } catch (err: unknown) {
      console.error('Failed to fetch Mod Awards:', err);
      // Safely handle the "unknown" error type
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred loading the awards');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to load on mount
  useEffect((): void => {
    setMounted(true);
    fetchAwardResults();
  }, [fetchAwardResults]);

  // Generate a dynamic grid layout based on the number of categories returned
  const generateLayouts = (data: AwardData[]): Layouts => {
    const lgLayout: Layout[] = data.map((award, index) => ({
      i: award.id,
      x: (index % 4) * 3, // 4 columns on large screens
      y: Math.floor(index / 4) * 2,
      w: 3,
      h: 2,
      minW: 2,
      minH: 2,
    }));

    // Add a header layout piece at the top
    lgLayout.unshift({ i: 'header', x: 0, y: 0, w: 12, h: 1, static: true });

    // Shift all standard cards down by 1 row to accommodate the header
    lgLayout.forEach((item) => {
      if (item.i !== 'header') item.y += 1;
    });

    return { lg: lgLayout };
  };

  // Prefixed currentLayout with underscore to pass unused variable rule
  const onLayoutChange = (
    _currentLayout: Layout[],
    allLayouts: Layouts,
  ): void => {
    setLayouts(allLayouts);
  };

  const getPercentage = (votes: number, total: number): number => {
    if (!total || total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  return (
    <div className='min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden font-sans pb-10'>
      {/* Immersive Background */}
      <div className='fixed inset-0 z-0 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] opacity-80' />
      <div className='fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]' />

      <main className='relative z-10 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8'>
        {error && (
          <div className='bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 backdrop-blur-md'>
            <h3 className='font-bold mb-1'>Error Loading Results</h3>
            <p className='text-sm'>{error}</p>
          </div>
        )}

        {loading ? (
          <div className='flex flex-col items-center justify-center h-[50vh]'>
            <div className='w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4' />
            <p className='text-gray-400 font-medium tracking-widest animate-pulse'>
              CALCULATING VOTES...
            </p>
          </div>
        ) : (
          mounted &&
          awardsData.length > 0 && (
            <ResponsiveGridLayout
              className='layout'
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={100}
              onLayoutChange={onLayoutChange}
              isDraggable={true}
              isResizable={true}
              margin={[16, 16]}
            >
              {/* Header Title */}
              <div
                key='header'
                className='flex items-center justify-between px-4'
              >
                <h1 className='text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-tight drop-shadow-lg'>
                  Connect Mod Awards 2026
                </h1>
                <button
                  onClick={fetchAwardResults}
                  className='bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-md border border-white/10 flex items-center gap-2'
                >
                  <i className='fa-solid fa-rotate-right'></i> Refresh live data
                </button>
              </div>

              {/* Dynamic Award Cards */}
              {awardsData.map((award) => (
                <div
                  key={award.id}
                  className='flex flex-col p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg transition-transform hover:-translate-y-1 hover:bg-white/10'
                >
                  <div
                    className='mb-2 text-xs font-semibold text-purple-300 uppercase tracking-wider line-clamp-2'
                    title={award.category}
                  >
                    {award.category}
                  </div>

                  <div className='flex-1 flex flex-col justify-center'>
                    <div className='flex items-end gap-2 mb-1'>
                      <span
                        className='text-2xl font-bold text-white truncate'
                        title={award.winner}
                      >
                        👑 {award.winner}
                      </span>
                    </div>

                    {/* Winner Progress Bar */}
                    <div className='w-full bg-white/10 rounded-full h-2.5 mb-1 mt-2 overflow-hidden shadow-inner'>
                      <div
                        className='bg-gradient-to-r from-blue-500 to-indigo-400 h-2.5 rounded-full transition-all duration-1000 ease-out'
                        style={{
                          width: `${getPercentage(award.winnerVotes, award.totalVotes)}%`,
                        }}
                      />
                    </div>
                    <div className='flex justify-between text-[10px] text-gray-400 mb-3 font-mono'>
                      <span>
                        {award.winnerVotes} / {award.totalVotes} votes
                      </span>
                      <span>
                        {getPercentage(award.winnerVotes, award.totalVotes)}%
                      </span>
                    </div>

                    {/* Runner Up */}
                    {award.runnerUp && (
                      <div className='mt-auto border-t border-white/10 pt-2'>
                        <div className='flex justify-between items-center text-xs text-gray-300'>
                          <span
                            className='truncate pr-2'
                            title={award.runnerUp}
                          >
                            🥈 {award.runnerUp}
                          </span>
                          <span className='whitespace-nowrap font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded'>
                            {award.runnerUpVotes} votes
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </ResponsiveGridLayout>
          )
        )}
      </main>
    </div>
  );
}
