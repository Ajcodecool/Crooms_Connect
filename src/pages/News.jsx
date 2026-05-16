import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../supabaseClient';
import { SCHOOL_CLUBS } from '../data/clubs';
import {
  SPECIAL_FRESHMAN_EMAILS,
  SENIOR_DEV_EMAILS,
} from '../utils/adminConstants';

const YOUTUBE_CHANNEL_ID =
  localStorage.getItem('NEWS_YOUTUBE_CHANNEL_ID') || 'UC3lwlk2Zs8yZHLtIlJeqOZg'; // change this to your channel id

const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const sanitizePreview = (html) => {
  // Minimal allowlist: keep basic formatting + links + images/videos.
  // Avoids executing scripts by removing <script> and inline event handlers.
  try {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Remove scripts/styles/iframes (except we render our own embeds elsewhere)
    doc.querySelectorAll('script, style').forEach((el) => el.remove());

    // Remove inline event handlers
    doc.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((attr) => {
        if (attr.name && attr.name.toLowerCase().startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    // Remove unknown iframes/objects
    doc.querySelectorAll('iframe, object, embed').forEach((el) => el.remove());

    // Ensure links are safe
    doc.querySelectorAll('a').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;
      // block javascript: urls
      if (href.trim().toLowerCase().startsWith('javascript:')) {
        a.removeAttribute('href');
      }
      a.setAttribute('rel', 'noopener noreferrer');
      a.setAttribute('target', '_blank');
    });

    return doc.body.innerHTML;
  } catch {
    return '';
  }
};

const getYoutubeChannelVideos = async (channelId) => {
  // Lightweight client-side RSS parser.
  // Notes:
  // - We avoid third-party APIs.
  // - YT RSS can be rate-limited; show manual fallback if it fails.
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(
    channelId,
  )}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube RSS failed: ${res.status}`);
  const xmlText = await res.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const entries = [...xml.getElementsByTagName('entry')].slice(0, 10);

  return entries
    .map((entry) => {
      const title = entry.getElementsByTagName('title')?.[0]?.textContent;
      const published =
        entry.getElementsByTagName('published')?.[0]?.textContent;
      const link = entry
        .getElementsByTagName('link')?.[0]
        ?.getAttribute('href');
      // link looks like https://www.youtube.com/watch?v=VIDEOID
      const vidMatch = link?.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      const videoId = vidMatch?.[1];
      return {
        id: `yt-${videoId || title}`,
        title,
        published: published ? new Date(published) : null,
        videoId,
      };
    })
    .filter((v) => v.videoId);
};

const News = ({ session }) => {
  // NOTE: expects a Supabase table named `news` with columns:
  // id (uuid pk), title (text), content (text/html), type (text), author_id (uuid), created_at (timestamptz)
  // plus RLS policies permitting read/write for your admin/mod roles.
  const { themeClass, themeStyle } = useTheme();

  const [canUploadNews, setCanUploadNews] = useState(false);

  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState(null);

  const [activeClubRoom, setActiveClubRoom] = useState(
    SCHOOL_CLUBS[0]?.room || '',
  );

  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Editor/upload state
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [type, setType] = useState('announcement');
  const [uploading, setUploading] = useState(false);

  const editorRef = useRef(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const init = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_verified, is_admin, is_mod, role')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        const meta = session.user?.user_metadata || {};
        const mod =
          profile?.is_verified === true ||
          profile?.is_admin === true ||
          profile?.is_mod === true ||
          profile?.role === 'admin' ||
          meta?.is_verified === true ||
          meta?.role === 'admin';

        const email = session?.user?.email;
        const specialFreshman =
          email && SPECIAL_FRESHMAN_EMAILS.includes(email);
        const seniorDev = email && SENIOR_DEV_EMAILS.includes(email);

        setCanUploadNews(!!mod || !!specialFreshman || !!seniorDev);
      } catch {
        setCanUploadNews(false);
      }
    };

    init();
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setVideosLoading(true);
      setVideosError(null);
      try {
        const items = await getYoutubeChannelVideos(YOUTUBE_CHANNEL_ID);
        if (!cancelled) setVideos(items);
      } catch (e) {
        if (!cancelled) {
          setVideosError(e?.message || 'Failed to load YouTube videos');
          setVideos([]);
        }
      } finally {
        if (!cancelled) setVideosLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        // Expected schema:
        // news(id uuid pk, title text, content text/html, type text, author_id uuid, created_at timestamptz)
        // If your table is named differently, update this select.
        const { data, error } = await supabase
          .from('news')
          .select(
            'id, title, content, type, author_id, created_at, profiles ( username, is_verified, is_admin )',
          )
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        if (!cancelled) setNewsItems(data || []);
      } catch {
        if (!cancelled) setNewsItems([]);
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    };

    fetchNews();

    const sub = supabase
      .channel('news-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'news' },
        () => {
          // refresh on any insert/update/delete
          fetchNews();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(sub);
    };
  }, []);

  const clubsByRoom = useMemo(() => {
    const map = {};
    SCHOOL_CLUBS.forEach((c) => {
      if (!map[c.room]) map[c.room] = [];
      map[c.room].push(c);
    });
    return map;
  }, []);

  const activeClubs = clubsByRoom[activeClubRoom] || [];

  const handleEditorInput = () => {
    const html = editorRef.current?.innerHTML || '';
    setContentHtml(html);
  };

  const handleUpload = async () => {
    if (!session?.user?.id) return;
    if (!canUploadNews) return;

    const cleanTitle = title.trim();
    const rawHtml = contentHtml || editorRef.current?.innerHTML || '';
    const plain = stripHtml(rawHtml).trim();

    if (!cleanTitle || !plain) return;

    setUploading(true);
    try {
      const safeContent = sanitizePreview(rawHtml);
      const { error } = await supabase.from('news').insert([
        {
          title: cleanTitle,
          content: safeContent,
          type,
          author_id: session.user.id,
        },
      ]);

      if (error) throw error;

      // Reset
      setTitle('');
      setType('announcement');
      setContentHtml('');
      if (editorRef.current) editorRef.current.innerHTML = '';

      // Refresh will happen via realtime; but also force quickly.
      const { data } = await supabase
        .from('news')
        .select(
          'id, title, content, type, author_id, created_at, profiles ( username, is_verified, is_admin )',
        )
        .order('created_at', { ascending: false })
        .limit(50);
      setNewsItems(data || []);
    } catch {
      alert('Failed to upload news.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 text-white ${themeClass}`}
      style={themeStyle}
    >
      <div className='max-w-7xl mx-auto p-4 md:p-8 pt-6 md:pt-8'>
        <div className='flex items-start justify-between gap-4 flex-col md:flex-row'>
          <div>
            <h1 className='text-3xl md:text-4xl font-extrabold tracking-tight'>
              News
            </h1>
            <p className='text-slate-400 text-sm md:text-base mt-1'>
              Videos + clubs + community news uploads.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300'>
              YouTube channel:{' '}
              <span className='font-mono text-slate-200'>
                {YOUTUBE_CHANNEL_ID}
              </span>
            </span>
          </div>
        </div>

        <div className='mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4'>
          {/* Videos */}
          <section className='lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl overflow-hidden'>
            <div className='p-4 md:p-6 border-b border-white/10 flex items-center justify-between gap-4'>
              <div>
                <div className='flex items-center gap-2'>
                  <i className='fa-brands fa-youtube text-red-500'></i>
                  <h2 className='text-lg md:text-xl font-bold'>New Videos</h2>
                </div>
                <p className='text-xs md:text-sm text-slate-400 mt-1'>
                  Auto-embeds recent uploads from the configured YouTube
                  channel.
                </p>
              </div>
              {canUploadNews && (
                <div className='text-xs text-slate-300'>Staff</div>
              )}
            </div>

            <div className='p-4 md:p-6 space-y-4'>
              {videosLoading ? (
                <div className='flex items-center gap-3 text-slate-300'>
                  <i className='fa-solid fa-circle-notch fa-spin'></i>
                  Loading videos...
                </div>
              ) : videosError ? (
                <div className='bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-200'>
                  <div className='font-bold mb-2'>
                    Could not load YouTube videos
                  </div>
                  <div className='text-xs opacity-80'>{videosError}</div>
                  <div className='text-xs opacity-70 mt-2'>
                    If this is a rate-limit or blocked feed, use manual embeds
                    in an admin news post.
                  </div>
                </div>
              ) : videos.length === 0 ? (
                <div className='text-slate-400 text-sm'>
                  No recent videos found.
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {videos.map((v) => (
                    <div
                      key={v.id}
                      className='bg-black/20 border border-white/10 rounded-xl overflow-hidden'
                    >
                      <div className='aspect-video w-full bg-black'>
                        <iframe
                          title={v.title || 'YouTube video'}
                          width='100%'
                          height='100%'
                          src={`https://www.youtube.com/embed/${v.videoId}?rel=0`}
                          frameBorder='0'
                          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                          allowFullScreen
                        />
                      </div>
                      <div className='p-3'>
                        <div className='text-sm font-bold leading-snug line-clamp-2'>
                          {v.title}
                        </div>
                        {v.published && (
                          <div className='text-xs text-slate-400 mt-1'>
                            {v.published.toLocaleDateString()}{' '}
                            {v.published.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Clubs */}
              <div className='mt-6 bg-white/5 border border-white/10 rounded-2xl overflow-hidden'>
                <div className='p-4 md:p-6 border-b border-white/10'>
                  <div className='flex items-center gap-2'>
                    <i className='fa-solid fa-people-group text-emerald-400'></i>
                    <h2 className='text-lg md:text-xl font-bold'>Clubs</h2>
                  </div>
                  <p className='text-xs md:text-sm text-slate-400 mt-1'>
                    Pick a room to see clubs meeting there.
                  </p>
                </div>

                <div className='p-4 md:p-6 space-y-3'>
                  <div>
                    <label className='text-xs text-slate-400 block mb-2'>
                      Room
                    </label>
                    <select
                      className='w-full bg-black/20 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500'
                      value={activeClubRoom}
                      onChange={(e) => setActiveClubRoom(e.target.value)}
                    >
                      {Object.keys(clubsByRoom).map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clubs list for the selected room */}
                  <div className='space-y-2'>
                    {activeClubs.length > 0 ? (
                      activeClubs.map((club) => (
                        <div
                          key={club.name}
                          className='bg-black/20 border border-white/10 rounded-xl p-3'
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <div className='font-bold text-sm'>{club.name}</div>
                            <div className='text-xs text-slate-400 font-mono'>
                              Room {club.room}
                            </div>
                          </div>
                          <div className='text-xs text-slate-400 mt-1'>
                            {club.schedule}
                          </div>
                          {club.formUrl ? (
                            <a
                              href={club.formUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='inline-block mt-2 text-xs text-blue-400 hover:underline'
                            >
                              More info
                            </a>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className='text-sm text-slate-400'>
                        No clubs in this room.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload news */}
              <div className='mt-6 bg-white/5 border border-white/10 rounded-2xl overflow-hidden'>
                <div className='p-4 md:p-6 border-b border-white/10 flex items-center justify-between gap-3'>
                  <div>
                    <div className='flex items-center gap-2'>
                      <i className='fa-solid fa-pen-to-square text-blue-400'></i>
                      <h2 className='text-lg md:text-xl font-bold'>
                        Upload News
                      </h2>
                    </div>
                    <p className='text-xs md:text-sm text-slate-400 mt-1'>
                      Admins/mods can post video/news updates.
                    </p>
                  </div>
                  <div className='text-xs text-slate-300'>
                    {canUploadNews ? 'Posting enabled' : 'Staff only'}
                  </div>
                </div>

                <div className='p-4 md:p-6 space-y-3'>
                  {canUploadNews ? (
                    <>
                      <div>
                        <label className='text-xs text-slate-400 block mb-2'>
                          Title
                        </label>
                        <input
                          type='text'
                          className='w-full bg-black/20 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500'
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder='e.g. Weekly Bulletin / New Episode'
                        />
                      </div>

                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                        <div>
                          <label className='text-xs text-slate-400 block mb-2'>
                            Type
                          </label>
                          <select
                            className='w-full bg-black/20 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500'
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                          >
                            <option value='announcement'>Announcement</option>
                            <option value='update'>Update</option>
                            <option value='event'>Event</option>
                          </select>
                        </div>

                        <div className='flex items-end'>
                          <button
                            onClick={handleUpload}
                            disabled={uploading || !title.trim()}
                            className='w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl border border-blue-400'
                          >
                            {uploading ? (
                              <span className='inline-flex items-center gap-2 justify-center'>
                                <i className='fa-solid fa-circle-notch fa-spin'></i>{' '}
                                Uploading
                              </span>
                            ) : (
                              <span className='inline-flex items-center gap-2 justify-center'>
                                <i className='fa-solid fa-upload'></i> Post
                              </span>
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className='text-xs text-slate-400 block mb-2'>
                          Content (HTML allowed)
                        </label>
                        <div
                          ref={editorRef}
                          contentEditable
                          onInput={handleEditorInput}
                          className='min-h-[140px] w-full bg-black/20 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500'
                          placeholder='Paste links/embeds/images/video...'
                          suppressContentEditableWarning
                        />
                        <div className='text-xs text-slate-500 mt-2'>
                          Paste embeds (YouTube/iframe) or plain text. Scripts
                          are stripped.
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className='text-sm text-slate-400'>
                      You do not have permission to upload news.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Right column: News feed */}
          <aside className='bg-white/5 border border-white/10 rounded-2xl overflow-hidden'>
            <div className='p-4 md:p-6 border-b border-white/10 flex items-center justify-between'>
              <div>
                <div className='flex items-center gap-2'>
                  <i className='fa-solid fa-newspaper text-purple-400'></i>
                  <h2 className='text-lg md:text-xl font-bold'>
                    Community News
                  </h2>
                </div>
                <p className='text-xs md:text-sm text-slate-400 mt-1'>
                  Latest posts from staff.
                </p>
              </div>
            </div>

            <div className='p-4 md:p-6 space-y-4'>
              {newsLoading ? (
                <div className='flex items-center gap-3 text-slate-300'>
                  <i className='fa-solid fa-circle-notch fa-spin'></i>
                  Loading news...
                </div>
              ) : newsItems.length === 0 ? (
                <div className='text-sm text-slate-400'>
                  No news posted yet.
                </div>
              ) : (
                newsItems.map((item) => (
                  <div
                    key={item.id}
                    className='bg-black/20 border border-white/10 rounded-xl p-4'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='font-bold text-sm line-clamp-2'>
                          {item.title}
                        </div>
                        <div className='text-xs text-slate-400 mt-1'>
                          {item.type ? (
                            <span className='font-mono'>{item.type}</span>
                          ) : null}
                          {item.created_at ? (
                            <span>
                              {' '}
                              • {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {item.content ? (
                      <div
                        className='text-sm text-slate-100 mt-3 announcement-content'
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default News;
