import { useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { useAuth } from '@workspace/replit-auth-web';
import {
  getGetProfileQueryKey,
  getListVideoCommentsQueryKey,
  getListVideosQueryKey,
  useCreateVideo,
  useCreateVideoComment,
  useGetProfile,
  useListVideoComments,
  useListVideos,
  useRequestUploadUrl,
  useToggleFollow,
  useToggleVideoLike,
  type Comment,
  type Profile,
  type Video,
} from '@workspace/api-client-react';
import {
  ArrowUpLeft,
  Camera,
  Check,
  Heart,
  Home,
  MessageCircle,
  Play,
  Plus,
  Search,
  Send,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
type AuthShape = { firstName?: string; name?: string; username?: string; id?: string; profileImage?: string };

function Avatar({ src, name, size = 42 }: { src?: string | null; name: string; size?: number }) {
  return src
    ? <img className="avatar" style={{ width: size, height: size }} src={src} alt={`صورة ${name}`} data-testid="img-avatar" />
    : <span className="avatar" style={{ width: size, height: size }} aria-label={`صورة ${name}`} data-testid="text-avatar-fallback">{name.trim().slice(0, 1) || 'أ'}</span>;
}

function Header({ onSearch, onPublish, onSignIn, onSignOut, isAuthenticated, user }: {
  onSearch: () => void; onPublish: () => void; onSignIn: () => void; onSignOut: () => void;
  isAuthenticated: boolean; user?: AuthShape;
}) {
  return <header className="topbar">
    <Link href="/" className="brand" aria-label="اترك أثر — الرئيسية" data-testid="link-home-brand">
      <span className="brand-mark">أ</span><span className="brand-word">اترك أثر</span>
    </Link>
    <nav className="top-actions" aria-label="التنقل الرئيسي">
      <button className="icon-btn" onClick={onSearch} aria-label="بحث" data-testid="button-search"><Search size={19} /></button>
      {isAuthenticated && <button className="publish-btn" onClick={onPublish} data-testid="button-publish"><Plus size={17} /> انشر لحظة</button>}
      {isAuthenticated ? <>
        <Link href={user?.id ? `/profile/${user.id}` : '/'} className="icon-btn" aria-label="الملف الشخصي" data-testid="link-my-profile"><UserRound size={19} /></Link>
        <button className="quiet-btn" onClick={onSignOut} data-testid="button-sign-out">خروج</button>
      </> : <button className="sign-btn" onClick={onSignIn} data-testid="button-sign-in">ابدأ المشاركة</button>}
    </nav>
  </header>;
}

function Feed({ feed, setFeed, searchQuery, openSignIn, openComments }: {
  feed: 'for-you' | 'following'; setFeed: (v: 'for-you' | 'following') => void; searchQuery: string;
  openSignIn: () => void; openComments: (video: Video) => void;
}) {
  const params = { feed, ...(searchQuery ? { q: searchQuery } : {}) };
  const { data: videos, isLoading, isError, refetch } = useListVideos(params);
  const queryClient = useQueryClient();
  const likeMutation = useToggleVideoLike();
  const followMutation = useToggleFollow();
  const { isAuthenticated } = useAuth();
  const items = (videos || []) as Video[];

  const toggleLike = (video: Video) => {
    if (!isAuthenticated) return openSignIn();
    likeMutation.mutate({ videoId: video.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() }) });
  };
  const toggleFollow = (video: Video) => {
    if (!isAuthenticated) return openSignIn();
    followMutation.mutate({ userId: video.creatorId }, { onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(video.creatorId) });
    } });
  };

  return <div className="layout">
    <main className="feed-main">
      <div className="feed-heading">
        <div><h1>{searchQuery ? 'نتائج البحث' : 'لحظات تستحق'}</h1><p>{searchQuery ? `ما وجدناه عن «${searchQuery}»` : 'حكايات قصيرة، وأثر يبقى.'}</p></div>
        <div className="feed-tabs" role="tablist" aria-label="نوع المحتوى">
          <button role="tab" aria-selected={feed === 'for-you'} className={feed === 'for-you' ? 'active' : ''} onClick={() => setFeed('for-you')} data-testid="tab-for-you">لك</button>
          <button role="tab" aria-selected={feed === 'following'} className={feed === 'following' ? 'active' : ''} onClick={() => setFeed('following')} data-testid="tab-following">أتابعهم</button>
        </div>
      </div>
      {isLoading ? <div className="video-list" aria-label="جار تحميل المقاطع">{[0, 1].map((n) => <div className="loading-card" key={n} />)}</div> :
        isError ? <div className="error-state" role="alert"><h2>تعذّر تحميل اللحظات</h2><p>يبدو أن الاتصال تعثّر. حاول مرة أخرى.</p><button className="sign-btn" onClick={() => refetch()} data-testid="button-retry-feed">إعادة المحاولة</button></div> :
          items.length ? <div className="video-list">{items.map((video, index) => <VideoCard key={video.id} video={video} index={index}
            onLike={() => toggleLike(video)} onFollow={() => toggleFollow(video)} onComments={() => openComments(video)}
            isAuthenticated={Boolean(isAuthenticated)} openSignIn={openSignIn} />)}</div> :
            <div className="empty-state"><h2>{searchQuery ? 'لا توجد نتائج بعد' : feed === 'following' ? 'مساحتك هنا تبدأ بمتابعة صانع' : 'البداية صفحة بيضاء'}</h2>
              <p>{searchQuery ? 'جرّب كلمة أخرى، فقد تكون الحكاية قريبة.' : 'تابع صناعاً يلهمونك أو شارك أول لحظة منك.'}</p>
              {feed === 'following' && <button className="sign-btn" onClick={() => setFeed('for-you')} data-testid="button-explore-feed">اكتشف المقاطع</button>}
            </div>}
    </main>
    <aside className="side-panel" aria-label="عن المجتمع">
      <div className="side-note"><span className="eyebrow">مساحة للمعنى</span><h2>كل حكاية صغيرة، قد تترك أثراً كبيراً.</h2><p>هنا نلتقي حول ما يستحق أن يُروى. فكرة، مشهد، أو لحظة من يومك.</p></div>
      <div className="side-section"><h3>مساحات نحبها</h3><div className="topic-row"><span className="topic">حكايات يومية</span><span className="topic">تعلم سريع</span><span className="topic">فن وصوت</span><span className="topic">من المكان</span></div></div>
    </aside>
  </div>;
}

function VideoCard({ video, index, onLike, onFollow, onComments, isAuthenticated, openSignIn }: {
  video: Video; index: number; onLike: () => void; onFollow: () => void; onComments: () => void;
  isAuthenticated: boolean; openSignIn: () => void;
}) {
  const date = new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(video.createdAt));
  return <article className="video-card" style={{ animationDelay: `${index * 70}ms` }} data-testid={`card-video-${video.id}`}>
    <div className="video-frame">
      <video controls playsInline preload="metadata" poster={video.coverUrl || undefined} src={video.videoUrl} aria-label={`مقطع ${video.creatorName}`} />
      <div className="frame-label"><Play size={13} fill="currentColor" /> لحظة من مجتمعنا</div>
    </div>
    <div className="video-info">
      <div>
        <div className="creator-line">
          <Avatar src={video.creatorAvatar} name={video.creatorName} />
          <div className="creator-meta"><Link href={`/profile/${video.creatorId}`} data-testid={`link-creator-${video.id}`}>{video.creatorName}</Link><span className="handle">@{video.creatorHandle}</span></div>
          {!video.followed && <button className="follow-btn" onClick={isAuthenticated ? onFollow : openSignIn} data-testid={`button-follow-${video.id}`}>متابعة</button>}
          {video.followed && <button className="quiet-btn" onClick={onFollow} aria-label="إلغاء المتابعة" data-testid={`button-unfollow-${video.id}`}><Check size={15} /> تتابعه</button>}
        </div>
        <p className="caption" data-testid={`text-caption-${video.id}`}>{video.caption}</p>
        <span className="caption-meta" data-testid={`text-date-${video.id}`}>{date}</span>
      </div>
      <div className="video-actions">
        <button className={`action-pill ${video.liked ? 'liked' : ''}`} onClick={isAuthenticated ? onLike : openSignIn} aria-label={video.liked ? 'إلغاء الإعجاب' : 'أعجبني'} data-testid={`button-like-${video.id}`}><Heart size={18} fill={video.liked ? 'currentColor' : 'none'} /><span>{video.likes.toLocaleString('ar')}</span></button>
        <button className="action-pill" onClick={onComments} aria-label="التعليقات" data-testid={`button-comments-${video.id}`}><MessageCircle size={18} /><span>{video.comments.toLocaleString('ar')}</span></button>
        <span className="card-spacer" />
        <button className="icon-btn" onClick={() => navigator.clipboard?.writeText(window.location.origin + `/profile/${video.creatorId}`)} aria-label="نسخ رابط صانع المحتوى" data-testid={`button-share-${video.id}`}><ArrowUpLeft size={17} /></button>
      </div>
    </div>
  </article>;
}

function ProfilePage({ openSignIn }: { openSignIn: () => void }) {
  const params = useParams<{ userId: string }>();
  const userId = params.userId || '';
  const { data, isLoading, isError, refetch } = useGetProfile(userId);
  const profile = data as Profile | undefined;
  const queryClient = useQueryClient();
  const followMutation = useToggleFollow();
  const { isAuthenticated } = useAuth();
  const toggleFollow = () => {
    if (!profile) return;
    if (!isAuthenticated) return openSignIn();
    followMutation.mutate({ userId: profile.id }, { onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(profile.id) });
      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
    } });
  };
  if (isLoading) return <main className="layout"><div className="feed-main"><div className="loading-card" /></div></main>;
  if (isError || !profile) return <main className="layout"><div className="feed-main"><div className="error-state" role="alert"><h2>لم نعثر على هذا الملف</h2><p>قد يكون الرابط غير صحيح أو أن المحتوى غير متاح.</p><button className="sign-btn" onClick={() => refetch()} data-testid="button-retry-profile">إعادة المحاولة</button></div></div></main>;
  return <main className="layout"><div className="feed-main">
    <section className="profile-header" data-testid="section-profile">
      <Avatar src={profile.avatar} name={profile.name} size={82} />
      <div className="profile-copy"><h1 data-testid="text-profile-name">{profile.name}</h1><span className="handle">@{profile.handle}</span><p>{profile.bio || 'صانع حكايات يشارك ما يراه جديراً بالبقاء.'}</p></div>
      <button className="follow-btn" onClick={toggleFollow} data-testid="button-profile-follow">{profile.isFollowing ? 'تتابعه' : 'متابعة'}</button>
      <div className="profile-stats"><span><strong>{profile.followers.toLocaleString('ar')}</strong>متابع</span><span><strong>{profile.following.toLocaleString('ar')}</strong>يتابع</span><span><strong>{profile.videos.length.toLocaleString('ar')}</strong>مقطع</span></div>
    </section>
    <div className="feed-heading"><div><h1>حكايات {profile.name}</h1><p>كل ما تركه من أثر حتى الآن.</p></div></div>
    {profile.videos.length ? <div className="profile-videos">{profile.videos.map((video) => <Link href="/" key={video.id} className="profile-tile" data-testid={`link-profile-video-${video.id}`}>
      {video.coverUrl ? <img src={video.coverUrl} alt="" /> : <video muted preload="metadata" src={video.videoUrl} />}
      <span className="tile-caption">{video.caption}</span>
    </Link>)}</div> : <div className="empty-state"><h2>لا توجد مقاطع بعد</h2><p>حين يشارك حكاية، ستجدها هنا.</p></div>}
  </div><aside className="side-panel"><div className="side-note"><span className="eyebrow">صوت من المجتمع</span><h2>نستمع لبعضنا، ونكبر معاً.</h2><p>تابع من يضيف لحياتك فكرة أو ابتسامة هادئة.</p></div></aside></main>;
}

function CommentsModal({ video, close, openSignIn }: { video: Video; close: () => void; openSignIn: () => void }) {
  const { data, isLoading, isError } = useListVideoComments(video.id);
  const comments = (data || []) as Comment[];
  const { isAuthenticated, user } = useAuth();
  const authUser = user as AuthShape | undefined;
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const createComment = useCreateVideoComment();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const content = body.trim();
    if (!isAuthenticated) return openSignIn();
    if (!content) return setError('اكتب تعليقاً قبل الإرسال.');
    createComment.mutate({ videoId: video.id, data: { body: content } }, { onSuccess: () => {
      setBody(''); setError('');
      queryClient.invalidateQueries({ queryKey: getListVideoCommentsQueryKey(video.id) });
      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
    }, onError: () => setError('لم نتمكن من إضافة تعليقك. حاول مجدداً.') });
  };
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="comments-title">
      <div className="modal-head"><h2 id="comments-title">الحوار حول المقطع</h2><button className="icon-btn" onClick={close} aria-label="إغلاق" data-testid="button-close-comments"><X /></button></div>
      <div className="comment-list">
        {isLoading ? <div className="loading-card" style={{ minHeight: 140 }} /> : isError ? <p className="form-error">تعذّر تحميل التعليقات.</p> : comments.length ? comments.map((comment) => <CommentRow key={comment.id} comment={comment} />) : <div className="empty-state" style={{ padding: 22 }}><h2>ابدأ الحوار</h2><p>كن أول من يترك كلمة طيبة هنا.</p></div>}
      </div>
      <form className="comment-form" onSubmit={submit}>
        {authUser && <Avatar src={authUser.profileImage} name={authUser.firstName || authUser.name || 'أنت'} size={38} />}
        <input className="field" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} placeholder="اكتب تعليقاً..." aria-label="اكتب تعليقاً" data-testid="input-comment" />
        <button type="submit" className="sign-btn" disabled={createComment.isPending} aria-label="إرسال التعليق" data-testid="button-send-comment"><Send size={17} /></button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  </div>;
}

function CommentRow({ comment }: { comment: Comment }) {
  const date = new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(comment.createdAt));
  return <div className="comment-item" data-testid={`comment-${comment.id}`}><Avatar src={comment.userAvatar} name={comment.userName} size={38} />
    <div className="comment-content"><strong>{comment.userName}</strong><span className="handle">@{comment.userHandle}</span><p>{comment.body}</p><span className="comment-time">{date}</span></div></div>;
}

function PublishModal({ close, onSignIn }: { close: () => void; onSignIn: () => void }) {
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const uploadUrl = useRequestUploadUrl();
  const createVideo = useCreateVideo();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) return onSignIn();
    if (!file || !caption.trim()) return setError('أضف مقطعاً واكتب حكايته أولاً.');
    if (!file.type.startsWith('video/')) return setError('اختر ملف فيديو صالحاً.');
    if (caption.trim().length > 300) return setError('اجعل الحكاية أقصر من ٣٠٠ حرف.');
    setError('');
    try {
      setProgress('نجهّز مساحة لمقطعك…');
      const response = await uploadUrl.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type } });
      setProgress('يُرفع المقطع الآن…');
      const putResponse = await fetch(response.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!putResponse.ok) throw new Error('upload');
      setProgress('نشارك حكايتك مع المجتمع…');
      await createVideo.mutateAsync({ data: { caption: caption.trim(), videoUrl: response.objectPath } });
      queryClient.invalidateQueries({ queryKey: getListVideosQueryKey() });
      close();
    } catch {
      setError('لم يكتمل النشر. تحقق من اتصالك وحاول مرة أخرى.');
      setProgress('');
    }
  };
  const busy = uploadUrl.isPending || createVideo.isPending || Boolean(progress);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && close()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="publish-title">
      <div className="modal-head"><h2 id="publish-title">اترك حكايتك</h2><button className="icon-btn" onClick={close} aria-label="إغلاق" disabled={busy} data-testid="button-close-publish"><X /></button></div>
      <form onSubmit={submit}>
        <div className="form-row"><label className="field-label" htmlFor="publish-caption">ما الذي يستحق أن يُروى؟</label><textarea id="publish-caption" className="field" maxLength={300} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="اكتب حكاية قصيرة من يومك..." data-testid="input-publish-caption" /><div className="caption-meta">{caption.length.toLocaleString('ar')} / ٣٠٠</div></div>
        <div className="form-row"><label className="field-label" htmlFor="publish-file">مقطع الفيديو</label><div className="upload-zone"><Upload size={22} /><div>اختر مقطعاً من جهازك</div><input id="publish-file" type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-label="اختر ملف فيديو" data-testid="input-video-file" />{file && <p>{file.name}</p>}</div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {progress && <p aria-live="polite" className="caption-meta">{progress}</p>}
        <button className="sign-btn" type="submit" disabled={busy} style={{ width: '100%' }} data-testid="button-submit-publish">{busy ? 'جارٍ النشر…' : 'شارك الحكاية'}</button>
      </form>
    </section>
  </div>;
}

function SearchPopover({ close, setSearch }: { close: () => void; setSearch: (query: string) => void }) {
  const [value, setValue] = useState('');
  const { data } = useListVideos({ q: value.trim() || undefined, feed: 'for-you' });
  const submit = (event: FormEvent) => { event.preventDefault(); setSearch(value.trim()); close(); };
  return <div className="search-pop">
    <form className="search-form" onSubmit={submit}><Search size={18} /><input autoFocus type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder="ابحث عن حكاية أو صانع..." aria-label="ابحث عن حكاية أو صانع" data-testid="input-search" /><button type="button" className="icon-btn" onClick={close} aria-label="إغلاق البحث" data-testid="button-close-search"><X size={17} /></button></form>
    {value && <div className="search-results" data-testid="status-search-results">{data?.length ? `وجدنا ${data.length.toLocaleString('ar')} مقطعاً` : 'اكتب كلمة للعثور على حكاية'}</div>}
  </div>;
}

function SignInModal({ close, login }: { close: () => void; login: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="signin-title" style={{ maxWidth: 430, textAlign: 'center', padding: '36px 30px' }}>
      <button className="icon-btn" style={{ position: 'absolute', margin: '-22px 0 0 0' }} onClick={close} aria-label="إغلاق" data-testid="button-close-signin"><X /></button>
      <span className="brand-mark" style={{ margin: '0 auto 18px', width: 52, height: 52, fontSize: 26 }}>أ</span>
      <h2 id="signin-title" style={{ fontFamily: 'var(--app-font-serif)', fontSize: 26, margin: '0 0 10px' }}>مكانك بين الحكايات</h2>
      <p style={{ color: '#718078', lineHeight: 1.8, margin: '0 auto 24px', maxWidth: 300 }}>سجّل دخولك لتتابع من يلهمك، وتترك إعجابك وكلمتك، وتنشر أثرك.</p>
      <button className="sign-btn" onClick={login} style={{ width: '100%' }} data-testid="button-continue-signin">متابعة لتسجيل الدخول</button>
    </section>
  </div>;
}

function AppShell() {
  const [location] = useLocation();
  const [feed, setFeed] = useState<'for-you' | 'following'>('for-you');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [commentsVideo, setCommentsVideo] = useState<Video | null>(null);
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const authUser = user as AuthShape | undefined;
  const errorReset = <RoutedErrorBoundary key={location}><Switch>
    <Route path="/" component={() => <Feed feed={feed} setFeed={setFeed} searchQuery={searchQuery} openSignIn={() => setSignInOpen(true)} openComments={setCommentsVideo} />} />
    <Route path="/profile/:userId" component={() => <ProfilePage openSignIn={() => setSignInOpen(true)} />} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;

  return <div className="app-shell" dir="rtl">
    <Header onSearch={() => setSearchOpen((current) => !current)} onPublish={() => setPublishOpen(true)} onSignIn={() => setSignInOpen(true)} onSignOut={logout} isAuthenticated={Boolean(isAuthenticated)} user={authUser} />
    {searchOpen && <SearchPopover close={() => setSearchOpen(false)} setSearch={(q) => { setSearchQuery(q); setFeed('for-you'); }} />}
    {isLoading ? <main className="layout"><div className="feed-main"><div className="loading-card" /></div></main> : errorReset}
    <nav className="mobile-nav" aria-label="التنقل"><Link href="/" className="quiet-btn" data-testid="mobile-link-home"><Home size={19} /><span>الرئيسية</span></Link>
      <button onClick={() => setSearchOpen(true)} data-testid="mobile-button-search"><Search size={19} /><span>بحث</span></button>
      <button onClick={() => isAuthenticated ? setPublishOpen(true) : setSignInOpen(true)} data-testid="mobile-button-create"><Camera size={19} /><span>انشر</span></button>
      <Link href={authUser?.id ? `/profile/${authUser.id}` : '/'} className="quiet-btn" data-testid="mobile-link-profile"><UserRound size={19} /><span>حسابي</span></Link></nav>
    {commentsVideo && <CommentsModal video={commentsVideo} close={() => setCommentsVideo(null)} openSignIn={() => setSignInOpen(true)} />}
    {publishOpen && <PublishModal close={() => setPublishOpen(false)} onSignIn={() => setSignInOpen(true)} />}
    {signInOpen && <SignInModal close={() => setSignInOpen(false)} login={() => login()} />}
  </div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}>
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppShell /></WouterRouter>
  </QueryClientProvider>;
}

export default App;
