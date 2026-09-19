import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChevronLeft,
  Crown,
  Flag,
  Gem,
  Home,
  Menu,
  MessageCircle,
  Mic,
  Play,
  Search,
  Send,
  SlidersHorizontal,
  Users,
  UserPlus,
  Copy,
  Plus,
  Volume2,
  Sparkles,
  Palette,
  Music,
  X,
  Minimize2,
  Maximize2,
  Move,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import {
  getListChatMessagesQueryKey,
  useListChatMessages,
} from '@workspace/api-client-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut, onAuthStateChanged } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { io, type Socket } from 'socket.io-client';

const queryClient = new QueryClient();

type Room = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  unreadCount: number;
};

type Message = {
  id: string;
  roomId: string;
  author: string;
  authorInitials: string;
  authorRole: 'admin' | 'member' | 'visitor' | 'system' | 'bot';
  body: string;
  sentAt: string;
  isMine: boolean;
  kind: 'text' | 'audio' | 'image' | 'youtube';
  duration: string;
  youtubeId?: string;
  songTitle?: string;
};

type OnlineUser = {
  id: string;
  name: string;
  initials: string;
  role: 'admin' | 'member' | 'visitor' | 'bot';
  status: string;
  lastSeen: number;
  roomName?: string;
  country?: string;
};

type FriendRequest = {
  id: string;
  from: string;
  status: 'pending' | 'accepted';
};

type SocketState = 'connected' | 'connecting' | 'offline';

const avatarColors = ['#f4a7bd', '#9fdbe3', '#f4d275', '#c5b3ef', '#f1aa83', '#acd69d'];
const authorColors = ['#c11563', '#e83d24', '#087db6', '#9f159d', '#188fba'];

const OWNER_EMAIL = 'noor.altrak@gmail.com';
const ownerNames = ['المدير', 'صاحب الموقع', 'الادمن', 'Admin', 'نور', 'المدير نور', 'Noor', 'لؤلؤة', 'LOST', 'LOSTT'];

const COUNTRIES_LIST = [
  'الأردن', 'المملكة العربية السعودية', 'الإمارات العربية المتحدة', 'مصر',
  'العراق', 'الكويت', 'قطر', 'البحرين', 'سلطنة عمان', 'فلسطين',
  'سوريا', 'لبنان', 'اليمن', 'السودان', 'المغرب', 'الجزائر', 'تونس', 'ليبيا'
];

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getDisplayName(name: string): string {
  if (!name) return '';
  const currentEmail = localStorage.getItem('chat_real_email');
  const real = localStorage.getItem('chat_real_username');
  
  if (currentEmail && currentEmail.toLowerCase() === OWNER_EMAIL.toLowerCase() && real && (name === 'LOSTT' || name === 'LOST' || name === 'صاحب الموقع')) {
    return real;
  }
  
  const renamed = localStorage.getItem(`renamed_user_${name}`);
  if (renamed) return renamed;
  return name;
}

function getUserProfileData(username: string) {
  if (!username) return { avatar: '', cover: '', songUrl: '', status: 'لا توجد حالة', gender: 'ذكر', country: 'سوريا' };
  
  const saved = localStorage.getItem(`user_profile_${username}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      /* ignore */
    }
  }

  return { 
    avatar: '', 
    cover: '', 
    songUrl: '', 
    status: username === 'Superbot' ? 'نشط للفلترة والرد التلقائي 🛡️' : 'لا توجد حالة', 
    gender: 'ذكر', 
    country: 'سوريا' 
  };
}

function getRealJoinDate(usernameOrEmail: string): string {
  const key = `user_real_join_date_${usernameOrEmail}`;
  let savedDate = localStorage.getItem(key);
  if (!savedDate) {
    savedDate = new Date().toISOString().split('T')[0];
    localStorage.setItem(key, savedDate);
  }
  return savedDate;
}

function checkIsOwner(email?: string, username?: string): boolean {
  if (email && email.toLowerCase() === OWNER_EMAIL.toLowerCase()) return true;
  const resolvedName = username ? getDisplayName(username) : '';
  if (resolvedName && ownerNames.some(n => resolvedName.toLowerCase() === n.toLowerCase()) && email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) return true;
  if (resolvedName && localStorage.getItem(`is_owner_user_${resolvedName}`) === 'true') return true;
  return false;
}

function getUserCustomStyle(username: string) {
  if (!username) return { nameColor: '#0b2230', borderColor: '#087db6', glowEffect: 'none', cardBg: '#0b2230' };
  const saved = localStorage.getItem(`user_custom_style_${username}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      /* ignore */
    }
  }
  return {
    nameColor: '#ffffff',
    borderColor: '#d4af37',
    glowEffect: 'none',
    cardBg: '#0b2230'
  };
}

function getGlowCssStyle(glowEffect?: string, customColor?: string) {
  const color = customColor || '#ffffff';
  switch (glowEffect) {
    case 'gold-glow':
      return { color, textShadow: `0 0 10px ${color}, 0 0 20px #ffaa00` };
    case 'neon-cyan':
      return { color: customColor || '#00e5ff', textShadow: '0 0 10px #00e5ff, 0 0 20px #0088ff' };
    case 'pulse-magenta':
      return { color: customColor || '#ff00ff', textShadow: '0 0 10px #ff00ff, 0 0 20px #ff66cc' };
    case 'fire-glow':
      return { color: customColor || '#ff4500', textShadow: '0 0 10px #ff4500, 0 0 20px #ff8c00' };
    case 'none':
    default:
      return { color };
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat('ar-SA').format(value);
}

function useLiveSocket(
  roomId: string,
  username: string,
  role: string,
  roomName: string,
  country: string,
  status: string,
  onMessage: (payload: unknown) => void,
  onPresence: (payload: unknown) => void,
) {
  const [socketState, setSocketState] = useState<SocketState>('connecting');
  const socketRef = useRef<Socket | null>(null);
  const messageCallback = useRef(onMessage);
  const presenceCallback = useRef(onPresence);
  messageCallback.current = onMessage;
  presenceCallback.current = onPresence;

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1200,
    });
    socketRef.current = socket;
    setSocketState('connecting');

    socket.on('connect', () => {
      setSocketState('connected');
      if (roomId) {
        socket.emit('room:join', { roomId, username, role, roomName, country, status });
      }
    });

    socket.on('presence:update', (payload: unknown) => presenceCallback.current(payload));
    socket.on('message:new', (payload: unknown) => messageCallback.current(payload));
    socket.on('disconnect', () => setSocketState('offline'));
    socket.io.on('reconnect_attempt', () => setSocketState('connecting'));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, username, role, roomName, country, status]);

  const sendSocketMessage = useCallback((message: Message) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('message:send', {
        roomId: message.roomId,
        body: message.body,
        author: message.author,
        authorRole: message.authorRole,
        kind: message.kind,
        youtubeId: message.youtubeId,
        songTitle: message.songTitle,
      });
    }
  }, []);

  return { socketState, sendSocketMessage };
}

function Avatar({
  name,
  initials,
  index = 0,
  online = true,
  size = 'md',
  isAdmin = false,
  isBot = false,
  avatarUrl,
  onClick,
}: {
  name: string;
  initials?: string;
  index?: number;
  online?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isAdmin?: boolean;
  isBot?: boolean;
  avatarUrl?: string;
  onClick?: () => void;
}) {
  const displayName = getDisplayName(name);
  const label = initials || displayName.slice(0, 2);
  const customStyle = getUserCustomStyle(displayName);
  const userProf = getUserProfileData(displayName);
  const finalAvatar = avatarUrl && avatarUrl !== 'Profile' ? avatarUrl : (userProf.avatar && userProf.avatar !== 'Profile' ? userProf.avatar : null);

  const ownerAvatarStyle = isAdmin ? { background: customStyle.cardBg, boxShadow: `0 0 12px ${customStyle.borderColor}`, border: `2px solid ${customStyle.borderColor}` } : {};

  return (
    <div 
      onClick={onClick} 
      className={`legacy-avatar legacy-avatar-${size}`} 
      style={{
        ...(isAdmin ? ownerAvatarStyle : { background: avatarColors[index % avatarColors.length] }),
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: '50%'
      }} 
      title={displayName}
    >
      {finalAvatar ? (
        <img src={finalAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : isBot ? (
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{label}</span>
      ) : (
        <span>{label}</span>
      )}
      {online && <i className="legacy-online-dot" />}
    </div>
  );
}

function ProfileModal({
  user,
  isMyProfile,
  onClose,
  isOwnerViewer,
  onUpdateProfile,
  onAdminRename
}: {
  user: { name: string; email: string; avatar?: string; cover?: string; songUrl?: string; status?: string; gender?: string; country?: string; joinDate?: string; lastSeenText?: string; roomName?: string; isOwnerRole?: boolean };
  isMyProfile: boolean;
  onClose: () => void;
  isOwnerViewer: boolean;
  onUpdateProfile: (data: { avatar: string; cover: string; songUrl: string; status: string; gender: string; country: string }) => void;
  onAdminRename?: (newName: string) => void;
}) {
  const displayName = getDisplayName(user.name);
  const isBotUser = displayName === 'Superbot';
  const isTargetOwner = !isBotUser && (user.isOwnerRole || checkIsOwner(user.email, displayName));
  
  const canCustomize = isOwnerViewer && isTargetOwner && isMyProfile;
  const showSettingsTab = isMyProfile && !isBotUser;

  const [activeTab, setActiveTab] = useState<'info' | 'settings' | 'customizer'>('info');
  const profData = getUserProfileData(displayName);
  
  const [avatar, setAvatar] = useState(user.avatar && user.avatar !== 'Profile' ? user.avatar : (profData.avatar || ''));
  const [cover, setCover] = useState(user.cover && user.cover !== 'Profile' ? user.cover : (profData.cover || ''));
  const [songUrl, setSongUrl] = useState(user.songUrl || profData.songUrl || '');
  const [gender, setGender] = useState(user.gender || profData.gender || 'ذكر');
  const [country, setCountry] = useState(user.country || profData.country || 'سوريا');
  const [statusText, setStatusText] = useState(user.status || profData.status || (isBotUser ? 'نشط للفلترة والرد التلقائي 🛡️' : 'لا توجد حالة'));
  const [newNameInput, setNewNameInput] = useState(displayName);

  const realJoinDate = getRealJoinDate(displayName);

  useEffect(() => {
    const activeSong = songUrl || profData.songUrl;
    if (!activeSong || !isTargetOwner) return;

    const audio = new Audio(activeSong);
    audio.loop = false;
    audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const currentStyle = getUserCustomStyle(displayName);
  const [nameColor, setNameColor] = useState(isBotUser ? '#333333' : currentStyle.nameColor);
  const [borderColor, setBorderColor] = useState(isBotUser ? '#ccc' : currentStyle.borderColor);
  const [glowEffect, setGlowEffect] = useState(currentStyle.glowEffect);
  const [cardBg, setCardBg] = useState(isBotUser ? '#ffffff' : currentStyle.cardBg);

  const userHashId = Math.abs(displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 100000000));
  const profileLink = `https://www.arabic.chat/#id${userHashId}`;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover' | 'song') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (type === 'avatar') setAvatar(result);
      if (type === 'cover') setCover(result);
      if (type === 'song') setSongUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ avatar, cover, songUrl, status: statusText, gender, country });
    alert('تم حفظ وتحديث بيانات الملف الشخصي بنجاح! ✨');
  };

  const handleSaveCustomStyle = (e: React.FormEvent) => {
    e.preventDefault();
    const newStyle = { nameColor, borderColor, glowEffect, cardBg };
    localStorage.setItem(`user_custom_style_${displayName}`, JSON.stringify(newStyle));
    alert('تم تطبيق لون الملف الشخصي بالكامل وحفظ التعديلات بنجاح! ⚡');
  };

  const copyProfileLink = () => {
    navigator.clipboard.writeText(profileLink);
    alert('تم نسخ رابط الملف الشخصي الحقيقي!');
  };

  const validAvatar = avatar && avatar !== 'Profile' ? avatar : '';
  const validCover = isTargetOwner && cover && cover !== 'Profile' ? cover : '';
  
  const dynamicNameStyle = isTargetOwner 
    ? getGlowCssStyle(glowEffect, nameColor) 
    : { color: isBotUser ? '#222222' : (nameColor || '#333333'), fontWeight: 'bold' };

  const currentTimeFormatted = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const realLastSeenDisplay = `${currentTimeFormatted} / غرفة || ${user.roomName || 'المجلس العام'}`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }} dir="rtl">
      <div style={{ 
        width: '100%', 
        maxWidth: '380px', 
        background: isBotUser ? '#ffffff' : (cardBg || '#0b2230'), 
        borderRadius: '10px', 
        overflow: 'hidden', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', 
        border: `2px solid ${isBotUser ? '#ccc' : (borderColor || '#d4af37')}`, 
        color: isBotUser ? '#333333' : '#ffffff', 
        position: 'relative', 
        display: 'flex', 
        flexDirection: 'column', 
        maxHeight: '90vh' 
      }}>
        
        <button onClick={onClose} style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          &times;
        </button>

        {isTargetOwner ? (
          <div style={{ 
            width: '100%', 
            minHeight: '215px', 
            background: validCover ? `url(${validCover}) center/cover no-repeat` : (cardBg || '#0b2230'), 
            padding: '15px', 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'flex-end',
            borderBottom: '1px solid rgba(255,255,255,0.1)' 
          }}>
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '14px', width: '100%', paddingBottom: '6px' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${borderColor || '#d4af37'}`, backgroundColor: '#000', boxShadow: '0 2px 10px rgba(0,0,0,0.6)', flexShrink: 0, position: 'relative' }}>
                {validAvatar ? (
                  <img src={validAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', color: '#ffd700', fontWeight: 'bold', fontSize: '24px' }}>
                    {displayName.charAt(0)}
                  </div>
                )}
                <i style={{ position: 'absolute', bottom: '2px', right: '2px', width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', border: '2px solid #fff' }}></i>
              </div>

              {/* تم إنزال الاسم والإشارة التي فوقه للأسفل قليلاً باستخدام transform: translateY */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, textShadow: '0 2px 4px rgba(0,0,0,0.8)', transform: 'translateY(12px)' }}>
                <div style={{ fontSize: '12px', color: '#ffd700', fontWeight: 'bold', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  صاحب الموقع 👑 ✓
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', ...dynamicNameStyle }}>
                  {displayName}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            width: '100%', 
            minHeight: '145px', 
            background: isBotUser ? '#ffffff' : (cardBg || '#ffffff'), 
            padding: '15px', 
            position: 'relative', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'flex-end',
            borderBottom: '1px solid #e2e8f0' 
          }}>
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '14px', width: '100%', paddingBottom: '6px' }}>
              <div style={{ width: '65px', height: '65px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #ccc', backgroundColor: '#f1f3f5', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0, position: 'relative' }}>
                {validAvatar ? (
                  <img src={validAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', color: '#333', fontWeight: 'bold', fontSize: '24px' }}>
                    {displayName.charAt(0)}
                  </div>
                )}
                <i style={{ position: 'absolute', bottom: '2px', right: '2px', width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', border: '2px solid #fff' }}></i>
              </div>

              {/* تم إنزال الاسم للأسفل قليلاً للمستخدمين العاديين أيضاً */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, transform: 'translateY(10px)' }}>
                <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#111111' }}>
                  {displayName} {isBotUser && '🛡️'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', backgroundColor: isBotUser ? '#f8f9fa' : 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
          <div onClick={() => setActiveTab('info')} style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: '13px', color: activeTab === 'info' ? (isBotUser ? '#0284c7' : '#00e5ff') : (isBotUser ? '#555' : '#ddd'), borderBottom: activeTab === 'info' ? `2px solid ${isBotUser ? '#0284c7' : '#00e5ff'}` : 'none', fontWeight: activeTab === 'info' ? 'bold' : 'normal', cursor: 'pointer' }}>
            معلوماتي
          </div>
          {showSettingsTab && (
            <div onClick={() => setActiveTab('settings')} style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: '13px', color: activeTab === 'settings' ? '#00e5ff' : '#ddd', borderBottom: activeTab === 'settings' ? '2px solid #00e5ff' : 'none', fontWeight: 'bold', cursor: 'pointer' }}>
              إعدادات
            </div>
          )}
          {canCustomize && (
            <div onClick={() => setActiveTab('customizer')} style={{ flex: 1, textAlign: 'center', padding: '10px 0', fontSize: '13px', color: activeTab === 'customizer' ? '#ffd700' : '#ddd', borderBottom: activeTab === 'customizer' ? '2px solid #ffd700' : 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
              <Palette size={12} /> ألوان
            </div>
          )}
        </div>

        <div style={{ padding: '15px', overflowY: 'auto', flex: 1, background: isBotUser ? '#ffffff' : (cardBg || '#0b2230'), color: isBotUser ? '#333333' : '#fff' }}>
          {activeTab === 'info' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ borderBottom: `1px solid ${isBotUser ? '#eee' : 'rgba(255, 255, 255, 0.1)'}`, paddingBottom: '8px', textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: isBotUser ? '#666' : '#94a3b8', marginBottom: '2px' }}>رابط الملف الشخصي</div>
                <div style={{ fontSize: '12px', color: '#38bdf8', wordBreak: 'break-all', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href={profileLink} onClick={(e) => { e.preventDefault(); copyProfileLink(); }} style={{ color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer' }}>
                    {profileLink}
                  </a>
                  <Copy size={14} color="#38bdf8" style={{ cursor: 'pointer' }} onClick={copyProfileLink} />
                </div>
              </div>

              <div style={{ borderBottom: `1px solid ${isBotUser ? '#eee' : 'rgba(255, 255, 255, 0.1)'}`, paddingBottom: '8px', textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: isBotUser ? '#666' : '#94a3b8', marginBottom: '2px' }}>تحديد الجنس</div>
                <div style={{ fontSize: '13px', color: isBotUser ? '#111' : '#fff', fontWeight: 'bold' }}>{isBotUser ? 'بوت نظام' : gender}</div>
              </div>

              <div style={{ borderBottom: `1px solid ${isBotUser ? '#eee' : 'rgba(255, 255, 255, 0.1)'}`, paddingBottom: '8px', textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: isBotUser ? '#666' : '#94a3b8', marginBottom: '2px' }}>البلد</div>
                <div style={{ fontSize: '13px', color: isBotUser ? '#111' : '#fff', fontWeight: 'bold' }}>{isBotUser ? 'سوريا' : country}</div>
              </div>

              <div style={{ borderBottom: `1px solid ${isBotUser ? '#eee' : 'rgba(255, 255, 255, 0.1)'}`, paddingBottom: '8px', textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: isBotUser ? '#666' : '#94a3b8', marginBottom: '2px' }}>تاريخ الانضمام</div>
                <div style={{ fontSize: '13px', color: isBotUser ? '#111' : '#fff' }}>{realJoinDate}</div>
              </div>

              <div style={{ borderBottom: `1px solid ${isBotUser ? '#eee' : 'rgba(255, 255, 255, 0.1)'}`, paddingBottom: '8px', textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: isBotUser ? '#666' : '#94a3b8', marginBottom: '2px' }}>آخر تواجد</div>
                <div style={{ fontSize: '13px', color: isBotUser ? '#111' : '#fff' }}>{realLastSeenDisplay}</div>
              </div>

              <div style={{ borderBottom: `1px solid ${isBotUser ? '#eee' : 'rgba(255, 255, 255, 0.1)'}`, paddingBottom: '8px', textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: isBotUser ? '#666' : '#94a3b8', marginBottom: '2px' }}>معلوماتي</div>
                <div style={{ fontSize: '13px', color: isBotUser ? '#111' : '#fff' }}>{statusText}</div>
              </div>
            </div>
          ) : activeTab === 'settings' && showSettingsTab ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {isOwnerViewer && isTargetOwner && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid #d4af37' }}>
                  <span style={{ fontSize: '11px', color: '#d4af37', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>[لوحة صاحب الموقع] تغير اسم المستخدم فوراً:</span>
                  <input 
                    type="text" 
                    value={newNameInput} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewNameInput(val);
                      if (onAdminRename) {
                        onAdminRename(val);
                      }
                    }} 
                    style={{ width: '100%', padding: '8px', background: '#111', border: '1px solid #ccc', color: '#fff', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              )}

              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#fff', display: 'block', marginBottom: '3px' }}>الحالة الشخصية:</span>
                  <input type="text" value={statusText} onChange={(e) => setStatusText(e.target.value)} style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px' }} />
                </div>

                <div>
                  <span style={{ color: '#fff', display: 'block', marginBottom: '3px' }}>تحديد الدولة (البلد):</span>
                  <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ width: '100%', padding: '8px', background: '#16334a', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px' }}>
                    {COUNTRIES_LIST.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <span style={{ color: '#fff', display: 'block', marginBottom: '3px' }}>تحديد الجنس:</span>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ width: '100%', padding: '8px', background: '#16334a', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px' }}>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>

                {isTargetOwner && (
                  <div>
                    <span style={{ color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', fontWeight: 'bold' }}>
                      <Music size={14} /> إضافة أغنية (تشتغل في الخلفية):
                    </span>
                    <label style={{ display: 'block', background: 'rgba(0,0,0,0.3)', border: '1px dashed #00e5ff', padding: '10px', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', color: '#00e5ff', fontSize: '12px' }}>
                      {songUrl ? '✓ تم اختيار الأغنية بنجاح (انقر لتغييرها)' : '📁 اضغط هنا لاختيار ملف صوتي من الجهاز'}
                      <input type="file" accept="audio/*" onChange={(e) => handleFile(e, 'song')} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}

                <div>
                  <span style={{ color: '#fff', display: 'block', marginBottom: '3px' }}>صورة شخصية جديدة:</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFile(e, 'avatar')} style={{ width: '100%', color: '#fff', fontSize: '11px' }} />
                </div>

                {isTargetOwner && (
                  <div>
                    <span style={{ color: '#fff', display: 'block', marginBottom: '3px' }}>صورة غلاف جديدة:</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFile(e, 'cover')} style={{ width: '100%', color: '#fff', fontSize: '11px' }} />
                  </div>
                )}

                <button type="submit" style={{ marginTop: '5px', background: '#00e5ff', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>حفظ التعديلات فوراً ⚡</button>
              </form>
            </div>
          ) : activeTab === 'customizer' && canCustomize ? (
            <form onSubmit={handleSaveCustomStyle} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', border: '1px solid #d4af37' }}>
                <span style={{ fontSize: '13px', color: '#d4af37', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                  <Sparkles size={15} /> تخصيص وتغيير ألوان الملف الشخصي بالكامل
                </span>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                  <span>لون خلفية الملف الشخصي الكامل:</span>
                  <input type="color" value={cardBg} onChange={(e) => setCardBg(e.target.value)} style={{ width: '40px', height: '28px', border: 'none', background: 'none', cursor: 'pointer' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                  <span>لون الاسم والنصوص:</span>
                  <input type="color" value={nameColor} onChange={(e) => setNameColor(e.target.value)} style={{ width: '40px', height: '28px', border: 'none', background: 'none', cursor: 'pointer' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                  <span>لون الإطار والحدود:</span>
                  <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} style={{ width: '40px', height: '28px', border: 'none', background: 'none', cursor: 'pointer' }} />
                </div>

                <div style={{ marginBottom: '8px', fontSize: '12px' }}>
                  <span style={{ display: 'block', marginBottom: '4px' }}>توهج وإضاءة الاسم:</span>
                  <select value={glowEffect} onChange={(e) => setGlowEffect(e.target.value)} style={{ width: '100%', padding: '6px', background: '#111', color: '#fff', borderRadius: '4px', border: '1px solid #444', fontSize: '12px' }}>
                    <option value="gold-glow">توهج ذهبي ساطع ⭐</option>
                    <option value="neon-cyan">توهج نيوني أزرق 🌐</option>
                    <option value="pulse-magenta">توهج فوشيا متألق 💖</option>
                    <option value="fire-glow">توهج ناري مشتعل 🔥</option>
                    <option value="none">بدون توهج (عادي)</option>
                  </select>
                </div>

                <button type="submit" style={{ width: '100%', padding: '8px', background: '#d4af37', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                  تطبيق الألوان فوراً ⚡
                </button>
              </div>
            </form>
          ) : null}
        </div>

      </div>
    </div>
  );
}

function TopBar({ 
  onMenu, 
  onOpenSettings, 
  onOpenProfile, 
  onOpenPrivate, 
  onOpenFriends, 
  unreadPrivateCount,
  friendRequestsCount 
}: { 
  onMenu: () => void; 
  onOpenSettings: () => void; 
  onOpenProfile: () => void; 
  onOpenPrivate: () => void; 
  onOpenFriends: () => void; 
  unreadPrivateCount: number;
  friendRequestsCount: number;
}) {
  return (
    <header dir="rtl" style={{ background: '#0b2230', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', flexShrink: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button type="button" onClick={onOpenProfile} style={{ background: 'none', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', fontSize: '11px' }}>
          <Users size={18} />
          <span>إعدادات</span>
        </button>
        <button type="button" onClick={onOpenPrivate} style={{ background: 'none', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', fontSize: '11px' }}>
          <MessageCircle size={18} />
          <span>رسالة {unreadPrivateCount > 0 && `(${unreadPrivateCount})`}</span>
        </button>
        <button type="button" onClick={onOpenFriends} style={{ background: 'none', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', fontSize: '11px' }}>
          <UserPlus size={18} />
          <span>طلب {friendRequestsCount > 0 && `(${friendRequestsCount})`}</span>
        </button>
        <button type="button" onClick={onOpenSettings} style={{ background: 'none', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', fontSize: '11px' }}>
          <Bell size={18} />
          <span>إشعار</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button type="button" onClick={onOpenProfile} style={{ background: 'none', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', fontSize: '11px' }}>
          <Crown size={18} color="#ffd700" />
          <span>الكبار</span>
        </button>
        <button type="button" onClick={onOpenProfile} style={{ background: 'none', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', fontSize: '11px' }}>
          <Gem size={18} color="#00e5ff" />
          <span>الأثرياء</span>
        </button>
        <button type="button" onClick={onMenu} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} aria-label="القائمة">
          <Menu size={22} />
        </button>
      </div>
    </header>
  );
}

function BottomBar({
  active,
  onRooms,
  onOnline,
  onFriends,
  onSettings,
}: {
  active: 'rooms' | 'chat' | 'online' | 'friends' | 'settings';
  onRooms: () => void;
  onOnline: () => void;
  onFriends: () => void;
  onSettings: () => void;
}) {
  return (
    <nav dir="rtl" style={{ background: '#0b2230', color: '#fff', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 0', borderTop: '1px solid #16334a', flexShrink: 0, zIndex: 10 }} aria-label="التنقل الرئيسي">
      <button type="button" onClick={onSettings} style={{ background: 'none', border: 'none', color: active === 'settings' ? '#00e5ff' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
        <SlidersHorizontal size={18} />
        <span>خيارات</span>
      </button>
      <button type="button" style={{ background: 'none', border: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
        <Play size={18} />
        <span>راديو 9090</span>
      </button>
      <button type="button" onClick={onRooms} style={{ background: 'none', border: 'none', color: active === 'rooms' || active === 'chat' ? '#00e5ff' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
        <Home size={18} />
        <span>الغرف</span>
      </button>
      <button type="button" onClick={onOnline} style={{ background: 'none', border: 'none', color: active === 'online' ? '#00e5ff' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
        <Users size={18} />
        <span>المتصلين</span>
      </button>
      <button type="button" onClick={onFriends} style={{ background: 'none', border: 'none', color: active === 'friends' ? '#00e5ff' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
        <UserPlus size={18} />
        <span>الأصدقاء</span>
      </button>
    </nav>
  );
}

function SideDrawer({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (screen: 'rooms' | 'online' | 'friends' | 'settings') => void }) {
  return (
    <>
      <button type="button" className={open ? 'legacy-drawer-backdrop open' : 'legacy-drawer-backdrop'} onClick={onClose} aria-label="إغلاق القائمة" />
      <aside className={open ? 'legacy-drawer open' : 'legacy-drawer'} aria-label="القائمة الجانبية" style={{ position: 'fixed', top: 0, right: 0, width: '250px', height: '100%', background: '#1e1e1e', zIndex: 1200, padding: '20px', color: '#fff', display: open ? 'flex' : 'none', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>القائمة الرئيسية</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <button type="button" onClick={() => { onNavigate('rooms'); onClose(); }} style={{ background: '#333', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', textAlign: 'right', cursor: 'pointer' }}>الغرف العامة</button>
        <button type="button" onClick={() => { onNavigate('online'); onClose(); }} style={{ background: '#333', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', textAlign: 'right', cursor: 'pointer' }}>المتواجدون</button>
        <button type="button" onClick={() => { onNavigate('friends'); onClose(); }} style={{ background: '#333', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', textAlign: 'right', cursor: 'pointer' }}>الأصدقاء</button>
        <button type="button" onClick={() => window.location.reload()} style={{ background: '#444', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', textAlign: 'right', cursor: 'pointer' }}>تحديث الصفحة</button>
      </aside>
    </>
  );
}

function RoomCards({ rooms, onSelect, isOwner, onCreateRoom, onDeleteRoom }: { rooms: Room[]; onSelect: (roomId: string) => void; isOwner: boolean; onCreateRoom: (name: string) => void; onDeleteRoom: (id: string) => void }) {
  const flags = ['🇯🇴', '🌐', '🇪🇬', '🎭', '🇩🇿', '💃'];
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    onCreateRoom(newRoomName.trim());
    setNewRoomName('');
    setShowCreate(false);
  };

  return (
    <section style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
      {isOwner && (
        <div style={{ marginBottom: '16px' }}>
          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #d4af37, #aa771c)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 8px rgba(212,175,55,0.4)' }}
            >
              + إنشاء غرفة جديدة (خاص لصاحب الموقع)
            </button>
          ) : (
            <form onSubmit={handleCreate} style={{ background: '#1e1e1e', padding: '12px', borderRadius: '8px', border: '1px solid #d4af37' }}>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="اكتب اسم الغرفة الجديدة..."
                style={{ width: '100%', padding: '8px', marginBottom: '8px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '6px', textAlign: 'right' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, padding: '8px', background: '#d4af37', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>حفظ وإضافة</button>
                <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '8px', background: '#444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>إلغاء</button>
              </div>
            </form>
          )}
        </div>
      )}

      <div>
        {rooms.map((room, index) => (
          <article key={room.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '15px', margin: 0, color: '#333' }}>
              <span className="legacy-room-flag">{flags[index % flags.length]}</span>{' '}
              {room.name} | <b>{formatCount(room.memberCount)}</b> <Users size={14} style={{ display: 'inline' }} />
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" onClick={() => onSelect(room.id)} style={{ background: '#087db6', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                <span>دخول الغرفة</span>
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => onDeleteRoom(room.id)}
                  style={{ background: '#d9534f', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                >
                  حذف
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OnlineUsers({ users, onSelectUser }: { users: OnlineUser[]; onSelectUser: (user: OnlineUser) => void }) {
  const [search, setSearch] = useState('');
  const now = Date.now();
  const activeUsers = users.filter((user) => {
    if (!user.lastSeen) return true;
    return now - user.lastSeen < 300 * 1000;
  });

  const filtered = activeUsers.filter((user) => {
    const displayName = getDisplayName(user.name);
    return displayName.toLowerCase().includes(search.toLowerCase());
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    const nameA = getDisplayName(a.name);
    const nameB = getDisplayName(b.name);
    const aIsOwner = checkIsOwner(undefined, nameA) || a.role === 'admin';
    const bIsOwner = checkIsOwner(undefined, nameB) || b.role === 'admin';
    const aIsBot = nameA === 'Superbot' || a.role === 'bot';
    const bIsBot = nameB === 'Superbot' || b.role === 'bot';

    if (aIsOwner && !bIsOwner) return -1;
    if (!aIsOwner && bIsOwner) return 1;
    if (aIsBot && !bIsBot) return -1;
    if (!aIsBot && bIsBot) return 1;
    return 0;
  });

  return (
    <section style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '8px', padding: '6px 10px', flex: 1, border: '1px solid #ccc' }}>
          <Search size={16} color="#666" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="البحث عن أشخاص..." aria-label="البحث عن أشخاص" style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', paddingRight: '8px', textAlign: 'right' }} />
        </div>
      </div>
      <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '14px' }}>
        <Users size={16} style={{ display: 'inline' }} /> {formatCount(sortedFiltered.length)} متصل حالياً
      </div>
      <div>
        {sortedFiltered.map((user, index) => {
          const displayName = getDisplayName(user.name);
          const isBot = user.role === 'bot' || displayName === 'Superbot';
          const isAdmin = !isBot && (checkIsOwner(undefined, displayName) || user.role === 'admin');
          const isVisitor = user.role === 'visitor';
          const customStyle = getUserCustomStyle(displayName);
          const nameGlowStyle = isAdmin ? getGlowCssStyle(customStyle.glowEffect, customStyle.nameColor) : {};

          return (
            <div key={user.id || user.name} onClick={() => onSelectUser(user)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Avatar name={displayName} initials={user.initials} index={index} isAdmin={isAdmin} isBot={isBot} />
                <strong style={isBot ? { color: '#333', fontWeight: 'bold' } : isAdmin ? { ...nameGlowStyle, fontWeight: 'bold' } : isVisitor ? { color: '#888' } : { color: '#333' }}>
                  {displayName} {isBot && ' 🛡️'} {isVisitor && ' (زائر)'}
                </strong>
                {isAdmin && <span style={{color: customStyle.nameColor}}>♛</span>}
              </div>
              <span style={{ fontSize: '12px', color: '#666' }}>{user.roomName || 'المجلس العام'}</span>
            </div>
          );
        })}
        {!sortedFiltered.length && (
          <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>لا يوجد مستخدمين متصلين حالياً</div>
        )}
      </div>
    </section>
  );
}

function FriendsView({ friendRequests, friendsList, onAccept, onReject, onSendRequest }: { friendRequests: FriendRequest[]; friendsList: string[]; onAccept: (id: string, from: string) => void; onReject: (id: string) => void; onSendRequest: (name: string) => void }) {
  const [targetName, setTargetName] = useState('');

  return (
    <div style={{ padding: '20px', overflowY: 'auto', flex: 1, background: '#fff', color: '#333' }} dir="rtl">
      <h2 style={{ fontSize: '16px', marginBottom: '15px' }}>الأصدقاء وطلبات الصداقة</h2>
      
      <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>إضافة صديق جديد:</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            value={targetName} 
            onChange={(e) => setTargetName(e.target.value)} 
            placeholder="اسم المستخدم..." 
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} 
          />
          <button 
            onClick={() => { if (targetName.trim()) { onSendRequest(targetName.trim()); setTargetName(''); } }} 
            style={{ background: '#087db6', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            إرسال طلب
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>الطلبات الواردة:</h3>
        {friendRequests.map((req) => (
          <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f1f1', padding: '10px', borderRadius: '6px', marginBottom: '8px' }}>
            <span>{req.from} يطلب صداقتك</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => onAccept(req.id, req.from)} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>قبول</button>
              <button onClick={() => onReject(req.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>رفض</button>
            </div>
          </div>
        ))}
        {!friendRequests.length && <p style={{ fontSize: '12px', color: '#888' }}>لا توجد طلبات صداقة حالياً.</p>}
      </div>

      <div>
        <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>قائمة أصدقائي:</h3>
        {friendsList.map((f, idx) => (
          <div key={idx} style={{ background: '#e2e8f0', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', fontWeight: 'bold' }}>{f}</div>
        ))}
        {!friendsList.length && <p style={{ fontSize: '12px', color: '#888' }}>قائمة الأصدقاء فارغة.</p>}
      </div>
    </div>
  );
}

function AudioMessage({ message }: { message: Message }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#eee', padding: '4px 8px', borderRadius: '12px' }}>
      <button type="button" onClick={() => setPlaying((current) => !current)} aria-label="تشغيل المقطع الصوتي" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
        {playing ? 'Ⅱ' : <Play size={14} />}
      </button>
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {[14, 22, 12, 28, 18, 31, 16, 25, 13, 22, 16, 29].map((height, index) => (
          <i key={index} style={{ height: `${height}px`, width: '2px', background: playing && index < 7 ? '#087db6' : '#999', display: 'inline-block' }} />
        ))}
      </div>
      <span style={{ fontSize: '11px' }}>{message.duration || '0:28'}</span>
      <Volume2 size={14} />
    </div>
  );
}

function ChatMessageRow({ 
  message, 
  index, 
  canDelete,
  onAvatarClick, 
  onPlayYoutube,
  onDeleteMessage
}: { 
  message: Message; 
  index: number; 
  canDelete: boolean;
  onAvatarClick: (name: string) => void; 
  onPlayYoutube: (videoId: string, title: string) => void;
  onDeleteMessage: (msgId: string) => void;
}) {
  const displayName = getDisplayName(message.author);
  const isBot = message.authorRole === 'bot' || displayName === 'Superbot';
  const isSystem = message.authorRole === 'system' || message.author.includes('النظام') || message.body.includes('انضم للغرفة');
  const isAdmin = !isBot && (checkIsOwner(undefined, displayName) || message.authorRole === 'admin');
  const customStyle = getUserCustomStyle(displayName);
  const nameGlowStyle = isAdmin ? getGlowCssStyle(customStyle.glowEffect, customStyle.nameColor) : { color: authorColors[index % authorColors.length] };
  
  if (isSystem) {
    return (
      <div style={{ background: '#fdf2f2', border: '1px solid #f8d7da', padding: '6px 12px', margin: '4px 10px', borderRadius: '6px', fontSize: '13px', color: '#842029', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <span><b>{displayName}</b> : {message.body}</span>
      </div>
    );
  }

  return (
    <article style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f0f0f0', background: isBot ? '#f0fdfa' : (index % 2 === 0 ? '#fafafa' : '#fff') }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <div onClick={() => onAvatarClick(message.author)}>
          <Avatar name={displayName} initials={message.authorInitials} index={index} size="sm" isAdmin={isAdmin} isBot={isBot} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
            <strong onClick={() => onAvatarClick(message.author)} style={{ cursor: 'pointer', ...(isBot ? { color: '#333', fontWeight: 'bold' } : nameGlowStyle), fontSize: '14px' }}>
              {displayName} {isBot && '🛡️'}
            </strong>
            {isAdmin && <span style={{color: customStyle.nameColor}}>👑</span>}
            <span style={{ color: '#333' }}>:</span>
            <span style={{ color: '#222', fontSize: '14px' }}>
              {message.kind === 'youtube' && message.youtubeId ? (
                <button 
                  onClick={() => onPlayYoutube(message.youtubeId!, message.songTitle || 'أغنية يوتيوب')}
                  style={{ background: '#ff0000', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
                >
                  <Play size={12} fill="#fff" /> 🎵 {message.songTitle || 'تشغيل أغنية يوتيوب'}
                </button>
              ) : message.kind === 'audio' ? (
                <AudioMessage message={message} />
              ) : (
                message.body
              )}
            </span>
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {canDelete && (
          <button 
            onClick={() => onDeleteMessage(message.id)} 
            title="حذف الرسالة"
            style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#dc2626', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            ×
          </button>
        )}
        <Flag size={14} color="#bbb" style={{ cursor: 'pointer' }} />
      </div>
    </article>
  );
}

function Composer({ roomId, role, onLocalMessage, onSend }: { roomId: string; role: string; onLocalMessage: (message: Message) => void; onSend: (message: Message) => void }) {
  const [value, setValue] = useState('');
  const [warning, setWarning] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = () => {
    let body = value.trim();
    if (!body) return;

    if (role === 'visitor') {
      setWarning('عذراً! الزائر يمكنه القراءة والمحادثة الخاصة فقط ولا يستطيع الكتابة في العام 🚫');
      setTimeout(() => setWarning(''), 4000);
      return;
    }

    const currentName = getDisplayName(localStorage.getItem('chat_real_username') || 'مستخدم');
    const currentEmail = localStorage.getItem('chat_real_email') || '';
    const isAdmin = checkIsOwner(currentEmail, currentName);

    const youtubeId = extractYouTubeId(body);
    const kind = youtubeId ? 'youtube' : 'text';
    const songTitle = youtubeId ? `أغنية يوتيوب (${youtubeId.slice(0, 5)})` : undefined;

    const message: Message = {
      id: `local-${Date.now()}-${Math.random()}`,
      roomId,
      author: currentName,
      authorInitials: currentName.charAt(0),
      authorRole: isAdmin ? 'admin' : 'member',
      body,
      sentAt: new Date().toISOString(),
      isMine: true,
      kind,
      duration: '',
      youtubeId: youtubeId || undefined,
      songTitle,
    };

    onLocalMessage(message);
    onSend(message);
    setValue('');
    setWarning('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#f8f9fa', borderTop: '1px solid #ddd', flexShrink: 0 }}>
      {warning && (
        <div style={{ background: '#d9534f', color: '#fff', padding: '6px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
          {warning}
        </div>
      )}
      <div dir="rtl" style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', gap: '8px' }}>
        <button type="button" onClick={sendMessage} aria-label="إرسال" style={{ background: '#087db6', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Send size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '20px', padding: '6px 12px', flex: 1, border: '1px solid #ccc' }}>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') sendMessage();
            }}
            placeholder={role === 'visitor' ? 'الزائر يمكنه القراءة والمحادثة الخاصة فقط...' : 'اكتب هنا...'}
            aria-label="اكتب رسالة"
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', textAlign: 'right', fontSize: '14px' }}
          />
          <span style={{ cursor: 'pointer', color: '#888', marginLeft: '4px' }}>☺</span>
        </div>
        <button type="button" aria-label="تسجيل صوتي" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', flexShrink: 0 }}>
          <Mic size={20} />
        </button>
        <button type="button" aria-label="إرفاق ملف" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', flexShrink: 0 }}>
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

function ChatView({
  room,
  role,
  messages,
  canDeleteMessage,
  onLocalMessage,
  onSend,
  onAvatarClick,
  onPlayYoutube,
  onDeleteMessage,
}: {
  room: Room;
  role: string;
  messages: Message[];
  canDeleteMessage: boolean;
  onLocalMessage: (message: Message) => void;
  onSend: (message: Message) => void;
  onAvatarClick: (name: string) => void;
  onPlayYoutube: (videoId: string, title: string) => void;
  onDeleteMessage: (msgId: string) => void;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ background: '#f1f3f5', padding: '8px 12px', fontSize: '13px', fontWeight: 'bold', color: '#495057', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span>إعلان ترويجي</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', background: '#fff' }}>
        {messages.map((message, index) => (
          <ChatMessageRow 
            key={message.id} 
            message={message} 
            index={index} 
            canDelete={canDeleteMessage}
            onAvatarClick={onAvatarClick} 
            onPlayYoutube={onPlayYoutube}
            onDeleteMessage={onDeleteMessage}
          />
        ))}
        {!messages.length && <div style={{ textAlign: 'center', color: '#888', padding: '30px' }}>لا توجد رسائل بعد. Superbot متواجد وجاهز.</div>}
      </div>
      <Composer roomId={room.id} role={role} onLocalMessage={onLocalMessage} onSend={onSend} />
    </section>
  );
}

function SettingsView({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  return (
    <section style={{ padding: '20px', overflowY: 'auto', flex: 1, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button type="button" onClick={onBack} aria-label="رجوع" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ChevronLeft size={24} /></button>
        <h1 style={{ fontSize: '18px', margin: 0, color: '#333' }}>الإعدادات</h1>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.85)', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#333' }}>
          <span>الوضع الهادئ</span><input type="checkbox" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#333' }}>
          <span>أصوات الرسائل</span><input type="checkbox" defaultChecked />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: '#333' }}>
          <span>اللغة</span><strong>العربية</strong>
        </div>
        <div>
          <button
            type="button"
            onClick={onLogout}
            style={{ width: '100%', padding: '12px', background: '#d9534f', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            تسجيل خروج (العودة لشاشة الدخول)
          </button>
        </div>
      </div>
    </section>
  );
}

function LoginView({ onLogin }: { onLogin: (name: string, email: string, role: string) => void }) {
  const [modalType, setModalType] = useState<'none' | 'visitor' | 'login' | 'signup'>('none');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('ذكر');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleVisitorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم المستخدم للزائر');
      return;
    }
    const visitorEmail = `visitor_${Date.now()}@guest.com`;
    localStorage.setItem('chat_real_email', visitorEmail);
    localStorage.setItem('chat_real_username', name.trim());
    onLogin(name.trim(), visitorEmail, 'visitor');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;

      if (!user.emailVerified) {
        await signOut(auth);
        setError('الحساب غير مفعل! يرجى التحقق من بريدك الإلكتروني الحقيقي والضغط على رابط التفعيل أولاً.');
        return;
      }

      const userName = user.displayName || email.split('@')[0];

      localStorage.setItem('chat_real_email', user.email || email.trim());
      localStorage.setItem('chat_real_username', userName);

      if (user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
        localStorage.setItem(`is_owner_user_${userName}`, 'true');
      }

      setSuccessMsg('تم تسجيل الدخول بنجاح! جاري الدخول...');
      setTimeout(() => {
        onLogin(userName, user.email || email.trim(), user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() ? 'admin' : 'member');
      }, 1000);
    } catch (err: any) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن الحساب غير مفعل.');
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('يرجى تعبئة كافة الحقول المطلوبة');
      return;
    }

    if (password.trim().length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: name.trim()
      });

      await sendEmailVerification(user);
      
      await signOut(auth);
      localStorage.removeItem('chat_real_email');
      localStorage.removeItem('chat_real_username');

      setSuccessMsg('تم إنشاء الحساب بنجاح! تم إرسال رابط التفعيل إلى بريدك الحقيقي. لا يمكنك الدخول إلا بعد تفعيله.');
    } catch (err: any) {
      setError('حدث خطأ أثناء إنشاء الحساب (البريد مستخدم مسبقاً أو غير صالح)');
    }
  };

  return (
    <div dir="rtl" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100dvh', 
      background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url("https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1000&auto=format&fit=crop") center/cover no-repeat', 
      color: '#fff', 
      padding: '20px',
      position: 'relative'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '420px', width: '100%', padding: '20px' }}>
        
        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ background: '#087db6', borderRadius: '50%', width: '55px', height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', boxShadow: '0 4px 15px rgba(8,125,182,0.5)' }}>
            <MessageCircle size={30} color="#fff" />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>شات عربي</h1>
          <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
            دردشة عربية للتعارف مع أصدقاء من جميع دول الوطن العربي في محادثات جماعية وخاصة
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            type="button" 
            onClick={() => { setModalType('visitor'); setError(''); setSuccessMsg(''); }} 
            style={{ width: '100%', padding: '14px', background: '#0f293d', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '30px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span>👤 دخول / كضيف</span>
          </button>

          <button 
            type="button" 
            onClick={() => { setModalType('login'); setError(''); setSuccessMsg(''); }} 
            style={{ width: '100%', padding: '14px', background: '#65a30d', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(101,163,13,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span>👤 دخول الأعضاء</span>
          </button>

          <button 
            type="button" 
            onClick={() => { setModalType('signup'); setError(''); setSuccessMsg(''); }} 
            style={{ width: '100%', padding: '14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span>إنشاء حساب</span>
          </button>
        </div>

      </div>

      {modalType === 'visitor' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <div style={{ background: '#1e1e1e', width: '100%', maxWidth: '380px', borderRadius: '16px', padding: '25px', position: 'relative', boxShadow: '0 8px 30px rgba(0,0,0,0.8)', border: '1px solid #333' }}>
            <button onClick={() => setModalType('none')} style={{ position: 'absolute', top: '12px', left: '12px', background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}><X size={20} /></button>
            <h3 style={{ marginBottom: '8px', color: '#fff', textAlign: 'right' }}>دخول كزائر</h3>
            <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '15px', textAlign: 'right' }}>الزائر يمكنه قراءة العام والمراسلة الخاصة فقط (بدون كتابة في العام)</p>

            {error && <div style={{ background: '#d9534f', color: '#fff', padding: '8px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', textAlign: 'right' }}>{error}</div>}

            <form onSubmit={handleVisitorSubmit}>
              <div style={{ marginBottom: '15px', textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#ddd', marginBottom: '5px' }}>اسم المستخدم</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="اكتب اسمك للزائر..." 
                  style={{ width: '100%', padding: '10px 14px', background: '#2a2a2a', border: '1px solid #444', borderRadius: '8px', color: '#fff', outline: 'none', textAlign: 'right' }} 
                />
              </div>
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#087db6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                دخول للدردشة كزائر
              </button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'login' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '20px', position: 'relative', boxShadow: '0 8px 30px rgba(0,0,0,0.8)', color: '#333' }} dir="rtl">
            <button onClick={() => setModalType('none')} style={{ position: 'absolute', top: '12px', left: '12px', background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontWeight: 'bold' }}><X size={20} /></button>
            
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'right', color: '#111' }}>تسجيل دخول الأعضاء (المفعلين فقط)</h3>

            {error && <div style={{ background: '#d9534f', color: '#fff', padding: '8px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', textAlign: 'right' }}>{error}</div>}
            {successMsg && <div style={{ background: '#22c55e', color: '#fff', padding: '8px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', textAlign: 'right' }}>{successMsg}</div>}

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '3px', textAlign: 'right' }}>البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  style={{ width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '6px', textAlign: 'right', fontSize: '14px' }} 
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '3px', textAlign: 'right' }}>كلمة المرور</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  style={{ width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '6px', textAlign: 'right', fontSize: '14px' }} 
                  required
                />
              </div>

              <button type="submit" style={{ marginTop: '10px', width: '100%', padding: '12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                تسجيل الدخول
              </button>
            </form>
          </div>
        </div>
      )}

      {modalType === 'signup' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '20px', position: 'relative', boxShadow: '0 8px 30px rgba(0,0,0,0.8)', color: '#333', maxHeight: '90vh', overflowY: 'auto' }} dir="rtl">
            
            <button onClick={() => setModalType('none')} style={{ position: 'absolute', top: '12px', left: '12px', background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontWeight: 'bold' }}><X size={20} /></button>
            
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'right', color: '#111' }}>إنشاء حساب جديد (بريد تأكيد إلزامي)</h3>

            {error && <div style={{ background: '#d9534f', color: '#fff', padding: '8px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', textAlign: 'right' }}>{error}</div>}
            {successMsg && <div style={{ background: '#22c55e', color: '#fff', padding: '8px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', textAlign: 'right' }}>{successMsg}</div>}

            <form onSubmit={handleMemberSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '3px', textAlign: 'right' }}>اسم المستخدم</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  style={{ width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '6px', textAlign: 'right', fontSize: '14px' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '3px', textAlign: 'right' }}>كلمة المرور</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  style={{ width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '6px', textAlign: 'right', fontSize: '14px' }} 
                />
                <span style={{ fontSize: '11px', color: '#d9534f', display: 'block', marginTop: '2px', textAlign: 'right' }}>6 أحرف على الأقل.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '3px', textAlign: 'right' }}>البريد الإلكتروني (الحقيقي حصراً)</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  style={{ width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '6px', textAlign: 'right', fontSize: '14px' }} 
                />
                <span style={{ fontSize: '11px', color: '#d9534f', display: 'block', marginTop: '2px', textAlign: 'right' }}>إذا وضعت بريداً وهمياً لن تتمكن من الدخول أبداً لعدم وصول رابط التفعيل!</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '3px', textAlign: 'right' }}>الجنس</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '6px', textAlign: 'right', fontSize: '14px' }}>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#333', marginBottom: '3px', textAlign: 'right' }}>العمر</label>
                  <select value={age} onChange={(e) => setAge(e.target.value)} style={{ width: '100%', padding: '10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '6px', textAlign: 'right', fontSize: '14px' }}>
                    <option value="">العمر</option>
                    {Array.from({ length: 70 }, (_, i) => i + 15).map(ageNum => (
                      <option key={ageNum} value={ageNum}>{ageNum}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" style={{ marginTop: '10px', width: '100%', padding: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                إنشاء حساب وإرسال رابط التفعيل
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

function AuthenticatedChatWorkspace({ username, email, role, onLogout }: { username: string; email: string; role: string; onLogout: () => void }) {
  const [currentUsername, setCurrentUsername] = useState<string>(() => getDisplayName(username));
  const [customRooms, setCustomRooms] = useState<Room[]>(() => {
    const saved = localStorage.getItem('saved_chat_rooms_v3');
    const deleted = JSON.parse(localStorage.getItem('deleted_chat_rooms_v3') || '[]');
    const defaultRooms: Room[] = [
      { id: 'general', name: 'المجلس العام', description: 'الغرفة العامة للدردشة', memberCount: 1, unreadCount: 0 },
      { id: 'admin-room', name: 'ادارة', description: 'غرفة الإدارة', memberCount: 1, unreadCount: 0 }
    ];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const filtered = parsed.filter((r: Room) => !deleted.includes(r.id));
        return filtered.length > 0 ? filtered : defaultRooms;
      } catch {
        return defaultRooms;
      }
    }
    return defaultRooms;
  });

  const rooms = useMemo(() => customRooms, [customRooms]);

  const [selectedRoomId, setSelectedRoomId] = useState('admin-room');
  const [screen, setScreen] = useState<'rooms' | 'chat' | 'online' | 'friends' | 'settings'>('chat');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>(() => {
    const saved = localStorage.getItem('persisted_chat_messages_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch { return {}; }
    }
    return {};
  });
  const [incomingMessages, setIncomingMessages] = useState<Message[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<OnlineUser[]>([]);

  const [activeYoutubeId, setActiveYoutubeId] = useState<string | null>(null);
  const [activeSongTitle, setActiveSongTitle] = useState<string>('تشغيل الأغنية');
  const [isYoutubeMinimized, setIsYoutubeMinimized] = useState(false);
  const [youtubePos, setYoutubePos] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - youtubePos.x,
      y: e.clientY - youtubePos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setYoutubePos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const [privateChatsOpen, setPrivateChatsOpen] = useState(false);
  const [activePrivateTarget, setActivePrivateTarget] = useState<string | null>(null);
  const [privateMessages, setPrivateMessages] = useState<Record<string, Array<{ sender: string; body: string }>>>(() => {
    const saved = localStorage.getItem('chat_private_messages');
    return saved ? JSON.parse(saved) : {};
  });
  const [privateInputText, setPrivateInputText] = useState('');
  const [unreadPrivateCount, setUnreadPrivateCount] = useState(0);

  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() => {
    const saved = localStorage.getItem('chat_friend_requests');
    return saved ? JSON.parse(saved) : [];
  });
  const [friendsList, setFriendsList] = useState<string[]>(() => {
    const saved = localStorage.getItem('chat_friends_list');
    return saved ? JSON.parse(saved) : [];
  });
  
  const isOwner = checkIsOwner(email, currentUsername) || role === 'admin';

  const [profileData, setProfileData] = useState<{ avatar: string; cover: string; songUrl: string; status: string; gender: string; country: string; joinDate: string; lastSeenText: string }>(() => {
    const loadedProf = getUserProfileData(currentUsername);
    const joinDate = getRealJoinDate(email || currentUsername);
    return {
      avatar: loadedProf.avatar && loadedProf.avatar !== 'Profile' ? loadedProf.avatar : '',
      cover: loadedProf.cover && loadedProf.cover !== 'Profile' ? loadedProf.cover : '',
      songUrl: loadedProf.songUrl || '',
      status: loadedProf.status || 'لا توجد حالة',
      gender: loadedProf.gender || 'ذكر',
      country: loadedProf.country || 'سوريا',
      joinDate,
      lastSeenText: 'متصل الآن'
    };
  });

  const [activeProfileUser, setActiveProfileUser] = useState<{ name: string; email: string; avatar?: string; cover?: string; songUrl?: string; status?: string; gender?: string; country?: string; joinDate?: string; lastSeenText?: string; roomName?: string; isOwnerRole?: boolean; isMyProfile?: boolean } | null>(null);

  const effectiveRole = isOwner ? 'admin' : role;
  const activeRoomId = selectedRoomId || rooms[0]?.id || 'admin-room';
  const activeRoom = rooms.find((room) => room.id === activeRoomId) || rooms[0];

  const { data: fetchedMessages } = useListChatMessages(activeRoomId, {
    query: { enabled: Boolean(activeRoomId), queryKey: getListChatMessagesQueryKey(activeRoomId) },
  });

  const { sendSocketMessage } = useLiveSocket(
    activeRoomId,
    currentUsername,
    effectiveRole,
    activeRoom?.name || 'المجلس العام',
    profileData.country,
    profileData.status,
    (payload) => {
      const message = payload as Partial<Message>;
      if (!message.roomId || !message.id) return;
      const resolvedAuthor = getDisplayName(message.author || '');
      const newMsg = { ...message, author: resolvedAuthor, isMine: (Boolean(currentUsername) && resolvedAuthor === currentUsername) || Boolean(message.isMine) } as Message;
      
      setIncomingMessages((current) => {
        return [...current.filter((item) => item.id !== newMsg.id), newMsg];
      });

      setLocalMessages((current) => {
        const roomMsgs = current[message.roomId] || [];
        if (!roomMsgs.some(m => m.id === newMsg.id)) {
          const nextMsgs = [...roomMsgs, newMsg];
          const updatedAll = { ...current, [message.roomId]: nextMsgs };
          localStorage.setItem('persisted_chat_messages_v3', JSON.stringify(updatedAll));
          return updatedAll;
        }
        return current;
      });
    },
    (payload) => {
      if (Array.isArray(payload)) {
        setPresenceUsers((prev) => {
          const map = new Map<string, OnlineUser>();
          prev.forEach(u => map.set(u.name, u));
          (payload as OnlineUser[]).forEach(u => {
            const resName = getDisplayName(u.name);
            map.set(resName, { ...u, name: resName, lastSeen: u.lastSeen || Date.now() });
          });
          if (currentUsername && !map.has(currentUsername)) {
            map.set(currentUsername, {
              id: `user-${currentUsername}`,
              name: currentUsername,
              initials: currentUsername.charAt(0),
              role: effectiveRole as any,
              status: profileData.status,
              lastSeen: Date.now(),
              roomName: activeRoom?.name || 'المجلس العام',
              country: profileData.country
            });
          }
          return Array.from(map.values());
        });
      }
    },
  );

  useEffect(() => {
    if (!currentUsername) return;
    if (isOwner) {
      localStorage.setItem(`is_owner_user_${currentUsername}`, 'true');
    }
    
    setPresenceUsers((prev) => {
      const map = new Map<string, OnlineUser>();
      prev.forEach(u => map.set(u.name, u));
      
      map.set('Superbot', {
        id: 'bot-protection-permanent',
        name: 'Superbot',
        initials: 'SB',
        role: 'bot',
        status: 'نشط للفلترة والرد التلقائي 🛡️',
        lastSeen: Date.now(),
        roomName: activeRoom?.name || 'المجلس العام',
        country: 'سوريا'
      });

      map.set(currentUsername, {
        id: `user-${currentUsername}`,
        name: currentUsername,
        initials: currentUsername.charAt(0),
        role: effectiveRole as any,
        status: profileData.status,
        lastSeen: Date.now(),
        roomName: activeRoom?.name || 'المجلس العام',
        country: profileData.country
      });
      return Array.from(map.values());
    });
  }, [currentUsername, effectiveRole, isOwner, activeRoom, profileData]);

  const messages = useMemo(() => {
    const serverMessages = ((fetchedMessages ?? []) as Message[]).map(m => ({ ...m, author: getDisplayName(m.author) })).filter((message) => message.roomId === activeRoomId);
    const local = (localMessages[activeRoomId] ?? []).map(m => ({ ...m, author: getDisplayName(m.author) }));
    const incoming = incomingMessages.map(m => ({ ...m, author: getDisplayName(m.author) })).filter((message) => message.roomId === activeRoomId);
    
    const combined = [...serverMessages, ...incoming, ...local];
    const uniqueMap = new Map();
    combined.forEach(m => uniqueMap.set(m.id, m));
    return Array.from(uniqueMap.values());
  }, [activeRoomId, fetchedMessages, incomingMessages, localMessages]);

  const selectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setScreen('chat');
    setDrawerOpen(false);
  };

  const handleCreateRoom = (roomName: string) => {
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: roomName,
      description: 'غرفة جديدة أنشأها صاحب الموقع',
      memberCount: 1,
      unreadCount: 0,
    };
    const updatedRooms = [...rooms, newRoom];
    setCustomRooms(updatedRooms);
    localStorage.setItem('saved_chat_rooms_v3', JSON.stringify(updatedRooms));
    setSelectedRoomId(newRoom.id);
    setScreen('chat');
  };

  const handleDeleteRoom = (roomId: string) => {
    const deleted = JSON.parse(localStorage.getItem('deleted_chat_rooms_v3') || '[]');
    const newDeleted = [...deleted, roomId];
    localStorage.setItem('deleted_chat_rooms_v3', JSON.stringify(newDeleted));

    const updated = rooms.filter(r => r.id !== roomId);
    setCustomRooms(updated);
    localStorage.setItem('saved_chat_rooms_v3', JSON.stringify(updated));

    if (selectedRoomId === roomId) {
      setSelectedRoomId('admin-room');
    }
  };

  const appendLocalMessage = useCallback((message: Message) => {
    const resolvedMsg = { ...message, author: getDisplayName(message.author) };
    setLocalMessages((current) => {
      const roomMsgs = current[resolvedMsg.roomId] ?? [];
      const updatedRoomMsgs = [...roomMsgs, resolvedMsg];
      const next = { ...current, [resolvedMsg.roomId]: updatedRoomMsgs };
      localStorage.setItem('persisted_chat_messages_v3', JSON.stringify(next));
      return next;
    });

    const text = message.body.toLowerCase();
    if (message.author !== 'Superbot') {
      setTimeout(() => {
        let botReplyText = '';
        if (text.includes('مرحبا') || text.includes('السلام') || text.includes('أهلاً')) {
          botReplyText = `أهلاً بك يا ${resolvedMsg.author} في غرفة ${activeRoom?.name || 'الدردشة'}! Superbot يرحب بك 🌸`;
        } else if (text.includes('رابط') || text.includes('http')) {
          botReplyText = `⚠️ تنبيه من Superbot: ممنوع نشر الروابط الخارجية في هذه الغرفة يا ${resolvedMsg.author}!`;
        } else if (text.includes('بوت')) {
          botReplyText = `أنا Superbot المسؤول عن الحماية والفلترة والرد التلقائي في هذه الغرفة 🛡️`;
        }

        if (botReplyText) {
          const botMsg: Message = {
            id: `bot-reply-${Date.now()}`,
            roomId: message.roomId,
            author: 'Superbot',
            authorInitials: 'SB',
            authorRole: 'bot',
            body: botReplyText,
            sentAt: new Date().toISOString(),
            isMine: false,
            kind: 'text',
            duration: ''
          };
          setLocalMessages((current) => {
            const rMsgs = current[botMsg.roomId] ?? [];
            if (!rMsgs.some(m => m.id === botMsg.id)) {
              const updated = [...rMsgs, botMsg];
              const nextAll = { ...current, [botMsg.roomId]: updated };
              localStorage.setItem('persisted_chat_messages_v3', JSON.stringify(nextAll));
              return nextAll;
            }
            return current;
          });
        }
      }, 800);
    }
  }, [activeRoom]);

  const handleDeleteMessage = (msgId: string) => {
    setLocalMessages((current) => {
      const roomMsgs = current[activeRoomId] ?? [];
      const filtered = roomMsgs.filter(m => m.id !== msgId);
      const next = { ...current, [activeRoomId]: filtered };
      localStorage.setItem('persisted_chat_messages_v3', JSON.stringify(next));
      return next;
    });
    setIncomingMessages((current) => current.filter(m => m.id !== msgId));
  };

  const handleUpdateProfile = (newData: { avatar: string; cover: string; songUrl: string; status: string; gender: string; country: string }) => {
    const updated = { ...profileData, ...newData };
    setProfileData(updated);
    localStorage.setItem(`user_profile_${currentUsername}`, JSON.stringify(updated));
  };

  const handleAdminRename = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    localStorage.setItem('chat_real_username', trimmed);
    if (isOwner) {
      localStorage.setItem(`is_owner_user_${trimmed}`, 'true');
    }

    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: trimmed });
      } catch (err) {
        console.error("Error updating firebase display name:", err);
      }
    }

    setCurrentUsername(trimmed);
    setPresenceUsers(prev => prev.map(u => ({ ...u, name: trimmed })));

    if (activeProfileUser) {
      setActiveProfileUser({ ...activeProfileUser, name: trimmed });
    }
  };

  const openMyProfile = () => {
    setActiveProfileUser({
      name: currentUsername,
      email: email,
      ...profileData,
      roomName: activeRoom?.name || 'المجلس العام',
      isOwnerRole: isOwner,
      isMyProfile: true
    });
  };

  const openUserProfile = (userName: string) => {
    const resolvedTargetName = getDisplayName(userName);
    const isSelf = resolvedTargetName === currentUsername;
    const targetIsBot = resolvedTargetName === 'Superbot';
    const targetIsOwner = checkIsOwner(undefined, resolvedTargetName);
    const targetProf = getUserProfileData(resolvedTargetName);
    const foundUser = presenceUsers.find(u => u.name === resolvedTargetName);
    
    setActiveProfileUser({
      name: resolvedTargetName,
      email: '',
      avatar: isSelf ? profileData.avatar : targetProf.avatar,
      cover: isSelf ? profileData.cover : targetProf.cover,
      songUrl: isSelf ? profileData.songUrl : targetProf.songUrl,
      status: targetIsBot ? 'نشط للفلترة والرد التلقائي 🛡️' : (isSelf ? profileData.status : targetProf.status),
      gender: isSelf ? profileData.gender : targetProf.gender,
      country: isSelf ? profileData.country : targetProf.country,
      joinDate: getRealJoinDate(resolvedTargetName),
      roomName: foundUser?.roomName || activeRoom?.name || 'المجلس العام',
      isOwnerRole: targetIsOwner,
      isMyProfile: isSelf
    });
  };

  return (
    <main dir="rtl" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#eef2f5', overflow: 'hidden', position: 'relative' }}>
      <TopBar 
        onMenu={() => setDrawerOpen(true)} 
        onOpenSettings={() => setScreen('settings')} 
        onOpenProfile={openMyProfile}
        onOpenPrivate={() => setPrivateChatsOpen(true)}
        onOpenFriends={() => setScreen('friends')}
        unreadPrivateCount={unreadPrivateCount}
        friendRequestsCount={friendRequests.length}
      />
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onNavigate={(target) => { setScreen(target); setDrawerOpen(false); }} />
      
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {screen === 'rooms' ? (
          <RoomCards rooms={rooms} onSelect={selectRoom} isOwner={isOwner} onCreateRoom={handleCreateRoom} onDeleteRoom={handleDeleteRoom} />
        ) : screen === 'online' ? (
          <OnlineUsers users={presenceUsers} onSelectUser={(u) => openUserProfile(u.name)} />
        ) : screen === 'friends' ? (
          <FriendsView 
            friendRequests={friendRequests} 
            friendsList={friendsList} 
            onAccept={(id, from) => {
              const updated = friendRequests.filter(r => r.id !== id);
              setFriendRequests(updated);
              localStorage.setItem('chat_friend_requests', JSON.stringify(updated));
              const newFriends = [...friendsList, from];
              setFriendsList(newFriends);
              localStorage.setItem('chat_friends_list', JSON.stringify(newFriends));
              alert(`تم قبول طلب الصداقة وأصبح ${from} في أصدقائك!`);
            }} 
            onReject={(id) => setFriendRequests(friendRequests.filter(r => r.id !== id))} 
            onSendRequest={(targetName) => {
              const newReq: FriendRequest = { id: `req-${Date.now()}`, from: currentUsername, status: 'pending' };
              const updated = [...friendRequests, newReq];
              setFriendRequests(updated);
              localStorage.setItem('chat_friend_requests', JSON.stringify(updated));
              alert(`تم إرسال طلب صداقة إلى ${targetName} بنجاح!`);
            }} 
          />
        ) : screen === 'settings' ? (
          <SettingsView onBack={() => setScreen('chat')} onLogout={onLogout} />
        ) : activeRoom ? (
          <ChatView 
            room={activeRoom} 
            role={effectiveRole} 
            messages={messages} 
            canDeleteMessage={isOwner}
            onLocalMessage={appendLocalMessage} 
            onSend={sendSocketMessage} 
            onAvatarClick={openUserProfile} 
            onPlayYoutube={(id, title) => {
              setActiveYoutubeId(id);
              setActiveSongTitle(title);
              setIsYoutubeMinimized(false);
            }}
            onDeleteMessage={handleDeleteMessage}
          />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>لا توجد غرف متاحة</div>
        )}
      </div>

      <BottomBar
        active={screen}
        onRooms={() => setScreen('rooms')}
        onOnline={() => setScreen('online')}
        onFriends={() => setScreen('friends')}
        onSettings={() => setScreen('settings')}
      />

      {activeYoutubeId && (
        <div style={{
          position: 'fixed',
          top: `${youtubePos.y}px`,
          left: `${youtubePos.x}px`,
          zIndex: 2000,
          background: '#111',
          border: '2px solid #d4af37',
          borderRadius: '10px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
          width: isYoutubeMinimized ? '160px' : '300px',
          overflow: 'hidden',
          color: '#fff'
        }}>
          <div 
            onMouseDown={handleMouseDown}
            style={{
              background: '#1f2937',
              padding: '6px 10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'grab',
              borderBottom: '1px solid #374151',
              fontSize: '12px'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={activeSongTitle}>
              <Move size={14} /> {activeSongTitle}
            </span>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button 
                onClick={() => setIsYoutubeMinimized(!isYoutubeMinimized)} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                title={isYoutubeMinimized ? 'تكبير' : 'تصغير'}
              >
                {isYoutubeMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button 
                onClick={() => setActiveYoutubeId(null)} 
                style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontWeight: 'bold' }}
                title="إغلاق تماماً"
              >
                &times;
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: isYoutubeMinimized ? '0px' : '170px', background: '#000', overflow: 'hidden', transition: 'height 0.2s ease' }}>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1`}
              title={activeSongTitle}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      {privateChatsOpen && (
        <div style={{ position: 'fixed', bottom: '60px', right: '15px', width: '320px', height: '420px', background: '#1e293b', border: '2px solid #d4af37', borderRadius: '10px', display: 'flex', flexDirection: 'column', zIndex: 1100, boxShadow: '0 8px 25px rgba(0,0,0,0.6)', color: '#fff' }}>
          <div style={{ background: '#0f172a', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{activePrivateTarget ? `محادثة خاصة: ${activePrivateTarget}` : 'قائمة المحادثات الخاصة'}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {activePrivateTarget && <button onClick={() => setActivePrivateTarget(null)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '12px' }}>الرجوع للقائمة</button>}
              <button onClick={() => setPrivateChatsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>
          </div>

          <div style={{ flex: 1, padding: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!activePrivateTarget ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>اختر مستخدماً للمراسلة الخاصة:</span>
                </div>
                {presenceUsers.filter(u => u.name !== currentUsername && u.name !== 'Superbot').map((user, idx) => (
                  <div key={idx} onClick={() => setActivePrivateTarget(user.name)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#334155', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', cursor: 'pointer' }}>
                    <span>{user.name}</span>
                    <span style={{ fontSize: '11px', color: '#38bdf8' }}>مراسلة</span>
                  </div>
                ))}
                {!presenceUsers.filter(u => u.name !== currentUsername && u.name !== 'Superbot').length && <p style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>لا يوجد مستخدمون متصلون حالياً</p>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(privateMessages[activePrivateTarget] || []).map((msg, i) => (
                    <div key={i} style={{ background: msg.sender === currentUsername ? '#0284c7' : '#475569', padding: '6px 10px', borderRadius: '6px', alignSelf: msg.sender === currentUsername ? 'flex-end' : 'flex-start', maxWidth: '80%', fontSize: '13px' }}>
                      {msg.body}
                    </div>
                  ))}
                  {!(privateMessages[activePrivateTarget] || []).length && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: '20px' }}>ابدأ المحادثة الخاصة الآن...</p>}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <input type="text" value={privateInputText} onChange={(e) => setPrivateInputText(e.target.value)} placeholder="اكتب رسالة خاصة..." onKeyDown={(e) => { if (e.key === 'Enter') { if (!privateInputText.trim() || !activePrivateTarget) return; const key = activePrivateTarget; const updatedHistory = [...(privateMessages[key] || []), { sender: currentUsername, body: privateInputText }]; const nextPriv = { ...privateMessages, [key]: updatedHistory }; setPrivateMessages(nextPriv); localStorage.setItem('chat_private_messages', JSON.stringify(nextPriv)); setPrivateInputText(''); } }} style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', border: 'none', background: '#334155', color: '#fff', fontSize: '13px' }} />
                  <button onClick={() => { if (!privateInputText.trim() || !activePrivateTarget) return; const key = activePrivateTarget; const updatedHistory = [...(privateMessages[key] || []), { sender: currentUsername, body: privateInputText }]; const nextPriv = { ...privateMessages, [key]: updatedHistory }; setPrivateMessages(nextPriv); localStorage.setItem('chat_private_messages', JSON.stringify(nextPriv)); setPrivateInputText(''); }} style={{ background: '#d4af37', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>إرسال</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeProfileUser && (
        <ProfileModal 
          user={activeProfileUser} 
          isMyProfile={Boolean(activeProfileUser.isMyProfile)}
          onClose={() => setActiveProfileUser(null)} 
          isOwnerViewer={isOwner}
          onUpdateProfile={handleUpdateProfile}
          onAdminRename={handleAdminRename}
        />
      )}
    </main>
  );
}

export function ChatWorkspace() {
  const [username, setUsername] = useState<string>(() => localStorage.getItem('chat_real_username') || '');
  const [email, setEmail] = useState<string>(() => localStorage.getItem('chat_real_email') || '');
  const [role, setRole] = useState<string>(() => localStorage.getItem('chat_real_role') || 'member');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => Boolean(localStorage.getItem('chat_real_email')));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!user.emailVerified) {
          await signOut(auth);
          setIsLoggedIn(false);
          localStorage.removeItem('chat_real_email');
          localStorage.removeItem('chat_real_username');
          localStorage.removeItem('chat_real_role');
          return;
        }

        const mail = user.email || '';
        const name = user.displayName || localStorage.getItem('chat_real_username') || mail.split('@')[0] || 'مستخدم';
        setUsername(name);
        setEmail(mail);
        setRole(mail.toLowerCase() === OWNER_EMAIL.toLowerCase() ? 'admin' : 'member');
        setIsLoggedIn(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (name: string, mail: string, userRole: string) => {
    localStorage.setItem('chat_real_username', name);
    localStorage.setItem('chat_real_email', mail);
    localStorage.setItem('chat_real_role', userRole);
    setUsername(name);
    setEmail(mail);
    setRole(userRole);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('chat_real_email');
    localStorage.removeItem('chat_real_username');
    localStorage.removeItem('chat_real_role');
    setIsLoggedIn(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      {!isLoggedIn ? (
        <LoginView onLogin={handleLogin} />
      ) : (
        <AuthenticatedChatWorkspace username={username} email={email} role={role} onLogout={handleLogout} />
      )}
    </QueryClientProvider>
  );
}

export function SettingsPage() {
  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('chat_real_email');
    localStorage.removeItem('chat_real_username');
    localStorage.removeItem('chat_real_role');
    window.location.href = '/';
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }} dir="rtl">
        <SettingsView onBack={() => window.history.back()} onLogout={handleLogout} />
      </div>
    </QueryClientProvider>
  );
}
