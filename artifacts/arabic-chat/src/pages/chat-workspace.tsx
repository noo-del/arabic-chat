import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
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
  MoreVertical,
  Paperclip,
  Play,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Sparkles,
  UserCircle,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import {
  getListChatMessagesQueryKey,
  useHealthCheck,
  useListChatMessages,
  useListChatRooms,
} from '@workspace/api-client-react';
import { io, type Socket } from 'socket.io-client';

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
  authorRole: 'admin' | 'member';
  body: string;
  sentAt: string;
  isMine: boolean;
  kind: 'text' | 'audio';
  duration: string;
};

type OnlineUser = {
  id: string;
  name: string;
  initials: string;
  role: 'admin' | 'member';
  status: 'متصل' | 'مشغول';
};

type SocketState = 'connected' | 'connecting' | 'offline';

const avatarColors = ['#f4a7bd', '#9fdbe3', '#f4d275', '#c5b3ef', '#f1aa83', '#acd69d'];
const authorColors = ['#c11563', '#e83d24', '#087db6', '#9f159d', '#188fba'];

function formatCount(value: number) {
  return new Intl.NumberFormat('ar-SA').format(value);
}

function useLiveSocket(
  roomId: string,
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
      if (roomId) socket.emit('room:join', roomId);
    });
    socket.on('presence:update', (payload: unknown) => presenceCallback.current(payload));
    socket.on('message:new', (payload: unknown) => messageCallback.current(payload));
    socket.on('disconnect', () => setSocketState('offline'));
    socket.io.on('reconnect_attempt', () => setSocketState('connecting'));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const sendSocketMessage = useCallback((message: Message) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('message:send', {
        roomId: message.roomId,
        body: message.body,
        author: 'سارة المنصور',
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
}: {
  name: string;
  initials?: string;
  index?: number;
  online?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const label = initials || name.slice(0, 2);
  return (
    <span className={`legacy-avatar legacy-avatar-${size}`} style={{ background: avatarColors[index % avatarColors.length] }} title={name}>
      {label}
      {online && <i className="legacy-online-dot" />}
    </span>
  );
}

function TopBar({ onMenu, onOpenOnline }: { onMenu: () => void; onOpenOnline: () => void }) {
  return (
    <header className="legacy-topbar">
      <div className="legacy-topbar-left">
        <button type="button" className="legacy-top-icon legacy-menu-button" onClick={onMenu} aria-label="فتح القائمة">
          <Menu />
        </button>
        <button type="button" className="legacy-top-icon legacy-top-label" aria-label="الكبار">
          <Gem />
          <small>الكبار</small>
        </button>
        <button type="button" className="legacy-top-icon legacy-top-label" aria-label="الأثرياء">
          <Crown />
          <small>الأثرياء</small>
        </button>
      </div>
      <div className="legacy-topbar-right">
        <button type="button" className="legacy-top-icon legacy-top-label" aria-label="الرسائل">
          <MessageCircle />
          <small>رسالة</small>
        </button>
        <button type="button" className="legacy-top-icon legacy-top-label legacy-notification" aria-label="الإشعارات">
          <Bell />
          <b>1</b>
          <small>إشعارات</small>
        </button>
        <button type="button" className="legacy-top-icon legacy-top-label" onClick={onOpenOnline} aria-label="الحساب">
          <UserCircle />
          <small>إعدادات</small>
        </button>
      </div>
    </header>
  );
}

function BottomBar({
  active,
  onRooms,
  onChat,
  onOnline,
  onSettings,
}: {
  active: 'rooms' | 'chat' | 'online' | 'settings';
  onRooms: () => void;
  onChat: () => void;
  onOnline: () => void;
  onSettings: () => void;
}) {
  return (
    <nav className="legacy-bottom-bar" aria-label="التنقل الرئيسي">
      <button type="button" className="legacy-bottom-tool" aria-label="التحكم">
        <SlidersHorizontal />
      </button>
      <button type="button" className="legacy-radio-button" aria-label="الراديو">
        <Play />
        <span>Radio</span>
      </button>
      <button type="button" className={active === 'rooms' || active === 'chat' ? 'legacy-bottom-link active' : 'legacy-bottom-link'} onClick={onRooms}>
        <Home />
        <span>الغرف</span>
      </button>
      <button type="button" className={active === 'online' ? 'legacy-bottom-link active' : 'legacy-bottom-link'} onClick={onOnline}>
        <Users />
        <span>المتصلين</span>
      </button>
      <button type="button" className={active === 'settings' ? 'legacy-bottom-link active' : 'legacy-bottom-link'} onClick={onSettings}>
        <Settings />
        <span>خيارات</span>
      </button>
    </nav>
  );
}

function SideDrawer({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (screen: 'rooms' | 'online') => void }) {
  return (
    <>
      <button type="button" className={open ? 'legacy-drawer-backdrop open' : 'legacy-drawer-backdrop'} onClick={onClose} aria-label="إغلاق القائمة" />
      <aside className={open ? 'legacy-drawer open' : 'legacy-drawer'} aria-label="القائمة الجانبية">
        <div className="legacy-drawer-head">
          <button type="button" onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </div>
        <button type="button" className="legacy-drawer-row">
          <span>متصل</span>
          <i className="legacy-drawer-green" />
        </button>
        <button type="button" className="legacy-drawer-row">
          <span>الأخبار</span>
          <span className="legacy-drawer-mark">▣</span>
        </button>
        <button type="button" className="legacy-drawer-row">
          <span>كبار الشخصيات</span>
          <Gem />
        </button>
        <button type="button" className="legacy-drawer-row">
          <span>الأثرياء</span>
          <Crown />
        </button>
        <button type="button" className="legacy-drawer-row">
          <span>بحث</span>
          <Search />
        </button>
        <button type="button" className="legacy-drawer-row" onClick={() => onNavigate('online')}>
          <span>الحساب</span>
          <span className="legacy-drawer-plus">+</span>
        </button>
        <button type="button" className="legacy-drawer-row">
          <span>تابعنا على فيسبوك</span>
          <b className="legacy-social">f</b>
        </button>
        <button type="button" className="legacy-drawer-row">
          <span>قناتنا على اليوتيوب</span>
          <b className="legacy-social youtube">▶</b>
        </button>
        <button type="button" className="legacy-drawer-row">
          <span>تطبيق الأندرويد</span>
          <span className="legacy-drawer-mark">♟</span>
        </button>
        <button type="button" className="legacy-drawer-row" onClick={() => onNavigate('rooms')}>
          <span>تحديث الصفحة</span>
          <span className="legacy-refresh">⟳</span>
        </button>
      </aside>
    </>
  );
}

function RoomCards({ rooms, onSelect }: { rooms: Room[]; onSelect: (roomId: string) => void }) {
  const flags = ['🇯🇴', '🌐', '🇪🇬', '🎭', '🇩🇿', '💃'];
  return (
    <section className="legacy-room-screen">
      <div className="legacy-room-brand">
        <div className="legacy-brand-lockup">
          <span className="legacy-brand-bubble">●●●</span>
          <strong>ARABI chat</strong>
        </div>
        <span className="legacy-brand-avatar">👨🏻</span>
      </div>
      <div className="legacy-room-list">
        {rooms.map((room, index) => (
          <article className="legacy-room-card" key={room.id}>
            <h2>
              <span className="legacy-room-flag">{flags[index % flags.length]}</span>
              غرفة {room.name.replace('المجلس العام', 'العامة')} |
              <b>{formatCount(room.memberCount)}</b>
              <Users />
            </h2>
            <button type="button" onClick={() => onSelect(room.id)}>
              <span>دخول الغرفة</span>
              <b>↪</b>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function OnlineUsers({ users }: { users: OnlineUser[] }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter((user) => user.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="legacy-online-screen">
      <div className="legacy-online-head">
        <button type="button" className="legacy-close-screen" aria-label="إغلاق">
          <X />
        </button>
        <div className="legacy-search-input">
          <Search />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="البحث عن أشخاص" aria-label="البحث عن أشخاص" />
        </div>
      </div>
      <div className="legacy-online-count">
        <Users /> {formatCount(filtered.length || users.length)} متصل
      </div>
      <div className="legacy-user-list">
        {filtered.map((user, index) => (
          <div className="legacy-user-row" key={user.id}>
            <div className="legacy-user-meta">
              <span className="legacy-flag">🇯🇴</span>
              <span className="legacy-gender">♀</span>
            </div>
            <strong>{user.name}</strong>
            <Avatar name={user.name} initials={user.initials} index={index} />
          </div>
        ))}
      </div>
    </section>
  );
}

function AudioMessage({ message }: { message: Message }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="legacy-audio">
      <button type="button" onClick={() => setPlaying((current) => !current)} aria-label="تشغيل المقطع الصوتي">
        {playing ? 'Ⅱ' : <Play />}
      </button>
      <div className="legacy-waveform">
        {[14, 22, 12, 28, 18, 31, 16, 25, 13, 22, 16, 29].map((height, index) => (
          <i key={index} style={{ height }} className={playing && index < 7 ? 'played' : ''} />
        ))}
      </div>
      <span>{message.duration || '0:28'}</span>
      <Volume2 />
    </div>
  );
}

function ChatMessageRow({ message, index }: { message: Message; index: number }) {
  const isSystem = message.author.includes('النظام') || message.body.includes('رسائل النظام');
  return (
    <article className={isSystem ? 'legacy-message-row legacy-system-row' : 'legacy-message-row'} style={{ ['--author-color' as string]: authorColors[index % authorColors.length] }}>
      <Avatar name={message.author} initials={message.authorInitials} index={index} size="sm" />
      <div className="legacy-message-content">
        <div className="legacy-message-line">
          <strong>{message.author}</strong>
          {message.authorRole === 'admin' && <span className="legacy-admin-crown">♛</span>}
          <span className="legacy-message-body">
            {message.kind === 'audio' ? <AudioMessage message={message} /> : message.body}
          </span>
        </div>
        {!isSystem && <Flag className="legacy-message-flag" />}
      </div>
    </article>
  );
}

function Composer({ roomId, onLocalMessage, onSend }: { roomId: string; onLocalMessage: (message: Message) => void; onSend: (message: Message) => void }) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = () => {
    const body = value.trim();
    if (!body) return;
    const message: Message = {
      id: `local-${Date.now()}`,
      roomId,
      author: 'سارة المنصور',
      authorInitials: 'سم',
      authorRole: 'member',
      body,
      sentAt: new Date().toISOString(),
      isMine: true,
      kind: 'text',
      duration: '',
    };
    onLocalMessage(message);
    onSend(message);
    setValue('');
    inputRef.current?.focus();
  };

  return (
    <div className="legacy-composer">
      <button type="button" aria-label="إرفاق ملف">
        <Paperclip />
      </button>
      <button type="button" aria-label="تسجيل صوتي">
        <Mic />
      </button>
      <div className="legacy-input-wrap">
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') sendMessage();
          }}
          placeholder="اكتب هنا..."
          aria-label="اكتب رسالة"
        />
        <span>☺</span>
      </div>
      <button type="button" className="legacy-send" onClick={sendMessage} aria-label="إرسال">
        <Send />
      </button>
    </div>
  );
}

function ChatView({
  room,
  messages,
  onLocalMessage,
  onSend,
}: {
  room: Room;
  messages: Message[];
  onLocalMessage: (message: Message) => void;
  onSend: (message: Message) => void;
}) {
  const health = useHealthCheck();
  return (
    <section className="legacy-chat-screen">
      <div className="legacy-chat-room-title">
        <span className="legacy-room-mini-icon">◉</span>
        <strong>{room.name}</strong>
        <span>{formatCount(room.memberCount)} متصل</span>
      </div>
      <div className="legacy-messages">
        {messages.map((message, index) => <ChatMessageRow key={message.id} message={message} index={index} />)}
        {!messages.length && <div className="legacy-empty-chat">لا توجد رسائل بعد. كن أول من يكتب هنا.</div>}
        {health.data?.status === 'ok' && <span className="legacy-health">متصل</span>}
      </div>
      <Composer roomId={room.id} onLocalMessage={onLocalMessage} onSend={onSend} />
    </section>
  );
}

function SettingsView({ onBack }: { onBack: () => void }) {
  return (
    <section className="legacy-settings-screen">
      <div className="legacy-settings-title">
        <button type="button" onClick={onBack} aria-label="رجوع"><ChevronLeft /></button>
        <h1>الإعدادات</h1>
      </div>
      <div className="legacy-settings-card">
        <label><span>الوضع الهادئ</span><input type="checkbox" /></label>
        <label><span>أصوات الرسائل</span><input type="checkbox" defaultChecked /></label>
        <label><span>اللغة</span><strong>العربية</strong></label>
      </div>
    </section>
  );
}

function ChatWorkspace() {
  const { data: fetchedRooms, isLoading: roomsLoading } = useListChatRooms();
  const rooms = useMemo(() => (fetchedRooms ?? []) as Room[], [fetchedRooms]);
  const [selectedRoomId, setSelectedRoomId] = useState('general');
  const [screen, setScreen] = useState<'rooms' | 'chat' | 'online' | 'settings'>('chat');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({});
  const [incomingMessages, setIncomingMessages] = useState<Message[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<OnlineUser[]>([]);
  const [, setLocation] = useLocation();
  const activeRoomId = selectedRoomId || rooms[0]?.id || 'general';
  const activeRoom = rooms.find((room) => room.id === activeRoomId) || rooms[0];
  const { data: fetchedMessages } = useListChatMessages(activeRoomId, {
    query: { enabled: Boolean(activeRoomId), queryKey: getListChatMessagesQueryKey(activeRoomId) },
  });

  const { sendSocketMessage } = useLiveSocket(
    activeRoomId,
    (payload) => {
      const message = payload as Partial<Message>;
      if (!message.roomId || !message.id) return;
      setIncomingMessages((current) => [
        ...current.filter((item) => item.id !== message.id),
        { ...message, isMine: message.author === 'سارة المنصور' || Boolean(message.isMine) } as Message,
      ]);
    },
    (payload) => {
      if (Array.isArray(payload)) setPresenceUsers(payload as OnlineUser[]);
    },
  );

  const messages = useMemo(() => {
    const serverMessages = ((fetchedMessages ?? []) as Message[]).filter((message) => message.roomId === activeRoomId);
    const local = localMessages[activeRoomId] ?? [];
    const incoming = incomingMessages.filter((message) => message.roomId === activeRoomId);
    return [...serverMessages, ...incoming, ...local].filter((message, index, array) => array.findIndex((item) => item.id === message.id) === index);
  }, [activeRoomId, fetchedMessages, incomingMessages, localMessages]);

  const selectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setScreen('chat');
    setDrawerOpen(false);
  };

  const appendLocalMessage = useCallback((message: Message) => {
    setLocalMessages((current) => ({ ...current, [message.roomId]: [...(current[message.roomId] ?? []), message] }));
  }, []);

  useEffect(() => {
    if (!rooms.length) return;
    if (!rooms.some((room) => room.id === selectedRoomId)) setSelectedRoomId(rooms[0].id);
  }, [rooms, selectedRoomId]);

  return (
    <main className="legacy-app-shell" dir="rtl">
      <TopBar onMenu={() => setDrawerOpen(true)} onOpenOnline={() => setScreen('online')} />
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onNavigate={(target) => { setScreen(target); setDrawerOpen(false); }} />
      <div className="legacy-main-content">
        {roomsLoading ? (
          <div className="legacy-loading">جاري تحميل الغرف...</div>
        ) : screen === 'rooms' ? (
          <RoomCards rooms={rooms} onSelect={selectRoom} />
        ) : screen === 'online' ? (
          <OnlineUsers users={presenceUsers} />
        ) : screen === 'settings' ? (
          <SettingsView onBack={() => setScreen('chat')} />
        ) : activeRoom ? (
          <ChatView room={activeRoom} messages={messages} onLocalMessage={appendLocalMessage} onSend={sendSocketMessage} />
        ) : (
          <div className="legacy-loading">لا توجد غرف متاحة</div>
        )}
      </div>
      <BottomBar
        active={screen}
        onRooms={() => setScreen('rooms')}
        onChat={() => setScreen('chat')}
        onOnline={() => setScreen('online')}
        onSettings={() => { setScreen('settings'); setLocation('/settings'); }}
      />
    </main>
  );
}

export function SettingsPage() {
  const [, setLocation] = useLocation();
  return <SettingsView onBack={() => setLocation('/')} />;
}

export { ChatWorkspace };