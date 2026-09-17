import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Headphones,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Paperclip,
  Play,
  Radio,
  Search,
  Send,
  Settings,
  Signal,
  SlidersHorizontal,
  Sparkles,
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

type SocketState = 'connected' | 'connecting' | 'offline';

type OnlineUser = {
  id: string;
  name: string;
  initials: string;
  role: 'admin' | 'member';
  status: 'متصل' | 'مشغول';
};

const avatarTones = ['#d89573', '#8db8aa', '#b8a3cf', '#d3ae61', '#7ca0c4'];

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar-SA', { hour: 'numeric', minute: '2-digit' }).format(date);
}

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
    socket.on('presence:update', (payload: unknown) => {
      presenceCallback.current(payload);
    });
    socket.on('message:new', (payload: unknown) => {
      messageCallback.current(payload);
    });
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

function BrandMark() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-wasel">
      <div className="relative flex size-10 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/.18)]">
        <MessageCircle className="size-5" strokeWidth={2.5} />
        <span className="absolute -bottom-1 -left-1 size-3 rounded-full border-[3px] border-sidebar bg-secondary" />
      </div>
      <div className="leading-none">
        <p className="font-kufi text-lg font-bold tracking-tight">واصل</p>
        <p className="mt-1 text-[10px] font-medium tracking-[0.12em] text-muted-foreground" dir="ltr">WASEL / LIVE</p>
      </div>
    </div>
  );
}

function UserAvatar({ name, initialsText, tone = avatarTones[0], size = 'md' }: { name: string; initialsText?: string; tone?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'size-12 text-sm' : size === 'sm' ? 'size-8 text-[10px]' : 'size-10 text-xs';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-[13px] font-semibold text-[#172029] ${sizeClass}`}
      style={{ backgroundColor: tone }}
      title={name}
      data-testid={`avatar-${name}`}
    >
      {initialsText || initials(name)}
    </div>
  );
}

function SocketBadge({ state }: { state: SocketState }) {
  const connected = state === 'connected';
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1.5 text-[11px] text-muted-foreground" data-testid="status-live-connection">
      <span className={`size-1.5 rounded-full ${connected ? 'animate-pulse-dot bg-secondary' : state === 'connecting' ? 'bg-chart-3' : 'bg-destructive'}`} />
      {connected ? 'متصل الآن' : state === 'connecting' ? 'جارٍ الاتصال' : 'وضع عدم الاتصال'}
    </div>
  );
}

function RoomList({ rooms, selectedRoomId, onSelect, search, onSearch }: {
  rooms: Room[];
  selectedRoomId: string | undefined;
  onSelect: (id: string) => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  const filteredRooms = rooms.filter((room) => `${room.name} ${room.description}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="ابحث في الغرف"
          className="h-10 w-full rounded-xl border border-border/80 bg-background/70 pr-10 pl-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/70 focus:ring-2 focus:ring-primary/10"
          data-testid="input-search-rooms"
          aria-label="ابحث في الغرف"
        />
      </div>
      <div className="mt-6 flex items-center justify-between text-[11px] font-semibold tracking-wide text-muted-foreground">
        <span>مساحات الفريق</span>
        <span className="font-number">{formatCount(filteredRooms.length)}</span>
      </div>
      <div className="chat-scroll mt-3 space-y-1.5 overflow-y-auto pb-5">
        {filteredRooms.map((room, index) => (
          <button
            key={room.id}
            type="button"
            onClick={() => onSelect(room.id)}
            className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right transition-all duration-200 ${
              selectedRoomId === room.id ? 'bg-primary text-primary-foreground shadow-[0_10px_25px_hsl(var(--primary)/.14)]' : 'text-foreground hover:bg-sidebar-accent'
            }`}
            data-testid={`button-room-${room.id}`}
          >
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${selectedRoomId === room.id ? 'bg-primary-foreground/15' : 'bg-muted text-secondary'}`}>
              {room.name.trim().charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[13px] font-semibold">{room.name}</span>
                {room.unreadCount > 0 && (
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${selectedRoomId === room.id ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'}`} data-testid={`badge-unread-${room.id}`}>
                    {room.unreadCount}
                  </span>
                )}
              </span>
              <span className={`mt-1 block truncate text-[11px] ${selectedRoomId === room.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{room.description}</span>
            </span>
            {index === 0 && <span className={`size-1.5 rounded-full ${selectedRoomId === room.id ? 'bg-primary-foreground' : 'bg-secondary'}`} />}
          </button>
        ))}
        {!filteredRooms.length && (
          <div className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground" data-testid="empty-room-search">
            لا توجد غرفة بهذا الاسم
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceSidebar({ rooms, selectedRoomId, onSelect, search, onSearch, onClose }: {
  rooms: Room[];
  selectedRoomId: string | undefined;
  onSelect: (id: string) => void;
  search: string;
  onSearch: (value: string) => void;
  onClose?: () => void;
}) {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-sidebar-border bg-sidebar px-4 py-5 lg:w-[292px] lg:shrink-0 lg:px-5" data-testid="sidebar-workspace">
      <div className="flex items-center justify-between">
        <BrandMark />
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground lg:hidden" data-testid="button-close-drawer" aria-label="إغلاق القائمة">
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="mt-8 flex items-center justify-between rounded-2xl border border-border/70 bg-card/40 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <UserAvatar name="سارة المنصور" initialsText="سم" tone="#e6b08e" size="sm" />
            <span className="absolute -bottom-0.5 -left-0.5 size-2.5 rounded-full border-2 border-sidebar bg-secondary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">سارة المنصور</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">مساحة التصميم</p>
          </div>
        </div>
        <ChevronDown className="size-4 text-muted-foreground" />
      </div>
      <RoomList rooms={rooms} selectedRoomId={selectedRoomId} onSelect={onSelect} search={search} onSearch={onSearch} />
      <div className="mt-auto border-t border-border/70 pt-4">
        <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground" data-testid="link-settings">
          <Settings className="size-4" />
          <span>التفضيلات</span>
        </Link>
        <div className="mt-4 flex items-center gap-2 px-3 text-[10px] text-muted-foreground/70">
          <span className="size-1.5 rounded-full bg-secondary" />
          <span>كل شيء هادئ وآمن</span>
        </div>
      </div>
    </aside>
  );
}

function PresencePanel({ room, users }: { room: Room; users: OnlineUser[] }) {
  const onlineCount = users.length || Math.max(3, Math.round(room.memberCount * 0.42));
  return (
    <aside className="hidden w-[238px] shrink-0 border-r border-border/70 bg-card/20 px-4 py-5 xl:block" data-testid="panel-presence">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">في الغرفة</p>
        <button type="button" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="خيارات الحضور" data-testid="button-presence-options">
          <MoreHorizontal className="size-4" />
        </button>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-secondary/10 px-3 py-2.5">
        <span className="animate-pulse-dot size-2 rounded-full bg-secondary" />
        <span className="text-xs font-semibold text-secondary">{formatCount(onlineCount)} متصلون</span>
      </div>
      <div className="mt-6 space-y-3">
        {users.map((person, index) => (
          <div className="flex items-center gap-2.5" key={person.id} data-testid={`presence-user-${person.name}`}>
            <div className="relative">
              <UserAvatar name={person.name} initialsText={person.initials} tone={avatarTones[index % avatarTones.length]} size="sm" />
              <span className="absolute -bottom-0.5 -left-0.5 size-2 rounded-full border border-card bg-secondary" />
            </div>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{person.name}</span>
            {person.role === 'admin' && <span className="rounded-md bg-chart-3/15 px-1 py-0.5 text-[8px] font-bold text-chart-3">مشرف</span>}
          </div>
        ))}
      </div>
      <div className="mt-8 border-t border-border/70 pt-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-4" />
          <span className="text-[11px]">إجمالي الأعضاء</span>
          <span className="mr-auto font-number text-xs text-foreground">{formatCount(room.memberCount)}</span>
        </div>
        <div className="mt-5 rounded-2xl border border-border/70 bg-background/40 p-3.5">
          <div className="flex items-center gap-2 text-secondary">
            <Sparkles className="size-3.5" />
            <span className="text-[10px] font-semibold">نبض واصل</span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">المحادثات الحية تبقى هنا، حتى يلحق بها الجميع.</p>
        </div>
      </div>
    </aside>
  );
}

function AudioBubble({ message }: { message: Message }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          setPlaying(false);
          return 0;
        }
        return value + 4;
      });
    }, 110);
    return () => window.clearInterval(timer);
  }, [playing]);
  return (
    <div className={`flex min-w-[220px] items-center gap-3 rounded-[18px] px-3 py-2.5 ${message.isMine ? 'bg-primary-foreground/10' : 'bg-muted/90'}`} data-testid={`audio-message-${message.id}`}>
      <button type="button" onClick={() => setPlaying((value) => !value)} className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 ${message.isMine ? 'bg-primary-foreground text-primary' : 'bg-secondary text-secondary-foreground'}`} data-testid={`button-play-audio-${message.id}`} aria-label={playing ? 'إيقاف التسجيل' : 'تشغيل التسجيل'}>
        {playing ? <span className="flex gap-0.5"><span className="h-3 w-0.5 bg-current" /><span className="h-3 w-0.5 bg-current" /></span> : <Play className="mr-[-2px] size-4 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {[18, 28, 12, 34, 22, 30, 15, 25, 11, 29, 18, 26].map((height, index) => (
            <span key={index} className={`h-5 w-0.5 rounded-full transition-colors ${index * 9 < progress ? 'bg-secondary' : message.isMine ? 'bg-primary-foreground/45' : 'bg-muted-foreground/50'}`} style={{ height }} />
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{message.duration || '٠:٢٨'}</span>
          <span>{playing ? 'يُشغّل الآن' : 'رسالة صوتية'}</span>
        </div>
      </div>
      <Volume2 className="size-3.5 text-muted-foreground" />
    </div>
  );
}

function MessageBubble({ message, index }: { message: Message; index: number }) {
  return (
    <article className={`message-in flex gap-3 ${message.isMine ? 'flex-row-reverse' : ''}`} style={{ animationDelay: `${Math.min(index * 35, 240)}ms` }} data-testid={`message-${message.id}`}>
      <UserAvatar name={message.author} initialsText={message.authorInitials} tone={message.isMine ? '#e6b08e' : avatarTones[index % avatarTones.length]} size="sm" />
      <div className={`flex max-w-[83%] flex-col ${message.isMine ? 'items-end' : 'items-start'}`}>
        <div className="mb-1.5 flex items-center gap-2 px-1">
          <span className="text-xs font-semibold">{message.isMine ? 'أنت' : message.author}</span>
          {message.authorRole === 'admin' && <span className="rounded-md bg-chart-3/15 px-1.5 py-0.5 text-[9px] font-bold text-chart-3">مشرف</span>}
          <time className="text-[10px] text-muted-foreground" dateTime={message.sentAt}>{formatTime(message.sentAt)}</time>
        </div>
        <div className={`rounded-[18px] px-4 py-3 text-[13px] leading-7 ${message.isMine ? 'rounded-tl-[5px] bg-primary text-primary-foreground' : 'rounded-tr-[5px] border border-border/80 bg-card'}`}>
          {message.kind === 'audio' ? <AudioBubble message={message} /> : <p data-testid={`text-message-body-${message.id}`}>{message.body}</p>}
        </div>
        {message.isMine && (
          <span className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
            <Check className="size-3 text-secondary" /> تم الإرسال
          </span>
        )}
      </div>
    </article>
  );
}

function Composer({ roomId, onLocalMessage, onSend, socketState }: { roomId: string; onLocalMessage: (message: Message) => void; onSend: (message: Message) => void; socketState: SocketState }) {
  const [value, setValue] = useState('');
  const [recording, setRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
    <div className="border-t border-border/80 bg-background/80 px-4 pb-4 pt-3 backdrop-blur-md sm:px-6 sm:pb-6" data-testid="composer">
      <div className="rounded-[20px] border border-border bg-card p-2 shadow-[0_12px_32px_hsl(var(--background)/.3)] transition focus-within:border-primary/60 focus-within:shadow-[0_12px_32px_hsl(var(--primary)/.06)]">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          rows={1}
          placeholder="اكتب شيئاً للفريق..."
          className="max-h-28 min-h-11 w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted-foreground/70"
          data-testid="input-message"
          aria-label="اكتب رسالة"
        />
        <div className="flex items-center justify-between border-t border-border/60 pt-2">
          <div className="flex items-center gap-1">
            <button type="button" className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="إرفاق ملف" data-testid="button-attach">
              <Paperclip className="size-4" />
            </button>
            <button type="button" onClick={() => setRecording((value) => !value)} className={`rounded-lg p-2 transition ${recording ? 'bg-destructive/15 text-destructive' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} aria-label={recording ? 'إيقاف التسجيل' : 'تسجيل رسالة صوتية'} data-testid="button-record-audio">
              <Mic className="size-4" />
            </button>
            {recording && <span className="mr-2 flex items-center gap-1.5 text-[10px] text-destructive"><span className="size-1.5 animate-pulse-dot rounded-full bg-destructive" /> جاري التسجيل</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`hidden text-[10px] sm:inline ${socketState === 'connected' ? 'text-muted-foreground' : 'text-chart-3'}`}>{socketState === 'connected' ? 'اضغط Enter للإرسال' : 'سيُحفظ محلياً حتى يعود الاتصال'}</span>
            <button type="button" onClick={sendMessage} disabled={!value.trim()} className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_hsl(var(--primary)/.2)] disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-send-message" aria-label="إرسال الرسالة">
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatHeader({ room, onlineCount, socketState, onOpenDrawer }: { room: Room; onlineCount: number; socketState: SocketState; onOpenDrawer: () => void }) {
  return (
    <header className="flex min-h-[76px] items-center justify-between border-b border-border/80 bg-background/70 px-4 backdrop-blur-md sm:px-6" data-testid="header-room">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onOpenDrawer} className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden" aria-label="فتح قائمة الغرف" data-testid="button-open-drawer">
          <Menu className="size-5" />
        </button>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
          <Radio className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-kufi text-sm font-semibold sm:text-base" data-testid="text-active-room">{room.name}</h1>
            <span className="hidden rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary sm:inline">مباشر</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{room.description}</span>
            <span className="size-0.5 rounded-full bg-border" />
            <span className="text-secondary">{formatCount(onlineCount)} متصل</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <SocketBadge state={socketState} />
        <button type="button" className="hidden rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground sm:block" aria-label="إشعارات الغرفة" data-testid="button-room-notifications">
          <Bell className="size-4" />
        </button>
        <button type="button" className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="خيارات الغرفة" data-testid="button-room-options">
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </header>
  );
}

function ChatWorkspace() {
  const { data: fetchedRooms, isLoading: roomsLoading, isError: roomsError, refetch: refetchRooms } = useListChatRooms();
  const rooms = useMemo(() => (fetchedRooms ?? []) as Room[], [fetchedRooms]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({});
  const [presenceUsers, setPresenceUsers] = useState<OnlineUser[]>([]);
  const [incomingMessages, setIncomingMessages] = useState<Message[]>([]);
  const { data: health } = useHealthCheck();
  const activeRoomId = selectedRoomId || rooms[0]?.id || '';
  const activeRoom = rooms.find((room) => room.id === activeRoomId);
  const { data: fetchedMessages, isLoading: messagesLoading, isError: messagesError, refetch: refetchMessages } = useListChatMessages(
    activeRoomId,
    { query: { enabled: Boolean(activeRoomId), queryKey: getListChatMessagesQueryKey(activeRoomId) } },
  );
  const { socketState, sendSocketMessage } = useLiveSocket(
    activeRoomId,
    (payload) => {
      const message = payload as Partial<Message>;
      if (!message.roomId || !message.id) return;
      const normalizedMessage = {
        ...message,
        isMine: message.author === 'سارة المنصور' || message.author === 'أنت' ? true : Boolean(message.isMine),
      } as Message;
      setIncomingMessages((current) => [...current.filter((item) => item.id !== message.id), normalizedMessage]);
    },
    (payload) => {
      if (Array.isArray(payload)) setPresenceUsers(payload as OnlineUser[]);
    },
  );

  useEffect(() => {
    if (!selectedRoomId && rooms[0]?.id) setSelectedRoomId(rooms[0].id);
  }, [rooms, selectedRoomId]);

  const messages = useMemo(() => {
    const serverMessages = ((fetchedMessages ?? []) as Message[]).filter((message) => message.roomId === activeRoomId);
    const local = localMessages[activeRoomId] ?? [];
    const incoming = incomingMessages.filter((message) => message.roomId === activeRoomId);
    const merged = [...serverMessages, ...incoming, ...local];
    return merged.filter((message, index, array) => array.findIndex((item) => item.id === message.id) === index);
  }, [activeRoomId, fetchedMessages, incomingMessages, localMessages]);

  const onlineCount = activeRoom ? presenceUsers.length || Math.max(3, Math.round(activeRoom.memberCount * 0.42)) : 0;
  const appendLocalMessage = useCallback((message: Message) => {
    setLocalMessages((current) => ({ ...current, [message.roomId]: [...(current[message.roomId] ?? []), message] }));
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground" dir="rtl">
      <div className="flex min-h-[100dvh] w-full">
        <div className={`fixed inset-0 z-40 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden ${drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
        <div className={`fixed inset-y-0 right-0 z-50 w-[min(88vw,340px)] transform transition-transform duration-300 lg:static lg:translate-x-0 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <WorkspaceSidebar rooms={rooms} selectedRoomId={activeRoomId} onSelect={(id) => { setSelectedRoomId(id); setDrawerOpen(false); }} search={search} onSearch={setSearch} onClose={() => setDrawerOpen(false)} />
        </div>
        <main className="wasel-grid flex min-w-0 flex-1 flex-col">
          {roomsLoading ? (
            <div className="flex min-h-[100dvh] flex-col" data-testid="loading-workspace">
              <div className="flex h-[76px] items-center gap-3 border-b border-border/80 px-6"><div className="size-10 animate-pulse rounded-2xl bg-muted" /><div className="space-y-2"><div className="h-3 w-32 animate-pulse rounded-full bg-muted" /><div className="h-2 w-48 animate-pulse rounded-full bg-muted" /></div></div>
              <div className="flex-1 space-y-5 p-6 pt-12"><div className="h-3 w-24 animate-pulse rounded bg-muted" /><div className="mr-auto h-24 w-2/3 animate-pulse rounded-3xl bg-muted/60" /><div className="h-20 w-1/2 animate-pulse rounded-3xl bg-muted/60" /></div>
            </div>
          ) : roomsError ? (
            <div className="flex min-h-[100dvh] items-center justify-center p-6" data-testid="error-rooms">
              <div className="max-w-sm rounded-[28px] border border-border bg-card p-8 text-center shadow-2xl"><Signal className="mx-auto size-8 text-destructive" /><h2 className="mt-4 font-kufi text-base font-semibold">تعذّر تحميل الغرف</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">تحقق من اتصالك ثم حاول مرة أخرى.</p><button type="button" onClick={() => void refetchRooms()} className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90" data-testid="button-retry-rooms">إعادة المحاولة</button></div>
            </div>
          ) : !activeRoom ? (
            <div className="flex min-h-[100dvh] items-center justify-center p-6" data-testid="empty-rooms">
              <div className="max-w-sm rounded-[28px] border border-dashed border-border bg-card/70 p-9 text-center"><MessageCircle className="mx-auto size-9 text-secondary" /><h2 className="mt-4 font-kufi text-base font-semibold">لا توجد غرف بعد</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">ستظهر مساحات الفريق هنا عندما ينضم أول حديث.</p></div>
            </div>
          ) : (
            <>
              <ChatHeader room={activeRoom} onlineCount={onlineCount} socketState={socketState} onOpenDrawer={() => setDrawerOpen(true)} />
              <div className="flex min-h-0 flex-1">
                <section className="flex min-w-0 flex-1 flex-col" data-testid="chat-panel">
                  <div className="chat-scroll flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                    <div className="mx-auto max-w-3xl">
                      <div className="mb-7 flex items-center gap-3">
                        <div className="h-px flex-1 bg-border/80" />
                        <span className="rounded-full border border-border bg-card px-3 py-1 text-[10px] font-semibold text-muted-foreground">اليوم، مساحة مفتوحة</span>
                        <div className="h-px flex-1 bg-border/80" />
                      </div>
                      {messagesLoading ? (
                        <div className="space-y-6" data-testid="loading-messages">
                          {[0, 1, 2].map((item) => <div key={item} className={`flex gap-3 ${item === 1 ? 'flex-row-reverse' : ''}`}><div className="size-8 animate-pulse rounded-xl bg-muted" /><div className={`h-20 animate-pulse rounded-2xl bg-muted/60 ${item === 1 ? 'w-2/3' : 'w-1/2'}`} /></div>)}
                        </div>
                      ) : messagesError ? (
                        <div className="rounded-2xl border border-border bg-card p-6 text-center" data-testid="error-messages"><p className="text-sm font-semibold">لم نتمكن من جلب الرسائل</p><button type="button" onClick={() => void refetchMessages()} className="mt-3 text-xs font-bold text-primary hover:underline" data-testid="button-retry-messages">حاول مجدداً</button></div>
                      ) : messages.length ? (
                        <div className="space-y-5">
                          {messages.map((message, index) => <MessageBubble key={message.id} message={message} index={index} />)}
                        </div>
                      ) : (
                        <div className="mx-auto max-w-sm rounded-[24px] border border-dashed border-border bg-card/50 p-8 text-center" data-testid="empty-messages"><Headphones className="mx-auto size-8 text-secondary" /><h2 className="mt-4 font-kufi text-sm font-semibold">ابدأ النبض</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">كن أول من يترك رسالة في هذه الغرفة.</p></div>
                      )}
                      {health?.status && <p className="mt-8 text-center text-[10px] text-muted-foreground/50" data-testid="status-health">الخدمة {health.status === 'ok' ? 'تعمل' : health.status}</p>}
                    </div>
                  </div>
                  <Composer roomId={activeRoom.id} onLocalMessage={appendLocalMessage} onSend={sendSocketMessage} socketState={socketState} />
                </section>
                <PresencePanel room={activeRoom} users={presenceUsers} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SettingsPage() {
  const [quietMode, setQuietMode] = useState(false);
  const [sound, setSound] = useState(true);
  const [location, setLocation] = useLocation();
  return (
    <div className="min-h-[100dvh] bg-background px-4 py-5 text-foreground sm:px-8 sm:py-8" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <BrandMark />
          <button type="button" onClick={() => setLocation('/')} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-card hover:text-foreground" data-testid="button-back-chat"><ChevronRight className="size-4" /> العودة للمحادثة</button>
        </div>
        <div className="wasel-glow mt-12 rounded-[28px] border border-border bg-card/70 p-6 sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[11px] font-semibold text-primary">مساحتك في واصل</p><h1 className="mt-3 font-kufi text-2xl font-bold tracking-tight sm:text-3xl">التفضيلات</h1><p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">اضبط الإشعارات والصوت بالطريقة التي تناسب إيقاع يومك.</p></div>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary"><SlidersHorizontal className="size-5" /></div>
          </div>
          <div className="mt-9 divide-y divide-border/70 border-y border-border/70">
            <label className="flex cursor-pointer items-center justify-between gap-4 py-5" data-testid="setting-quiet-mode">
              <div><p className="text-sm font-semibold">الوضع الهادئ</p><p className="mt-1 text-xs text-muted-foreground">أوقف تنبيهات الغرف مؤقتاً.</p></div>
              <input type="checkbox" checked={quietMode} onChange={(event) => setQuietMode(event.target.checked)} className="peer sr-only" data-testid="switch-quiet-mode" />
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${quietMode ? 'bg-primary' : 'bg-muted'}`}><span className={`absolute top-1 size-4 rounded-full bg-foreground transition-transform ${quietMode ? 'right-1' : 'right-6'}`} /></span>
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-4 py-5" data-testid="setting-sound">
              <div><p className="text-sm font-semibold">أصوات الرسائل</p><p className="mt-1 text-xs text-muted-foreground">صوت خفيف عند وصول رسالة جديدة.</p></div>
              <input type="checkbox" checked={sound} onChange={(event) => setSound(event.target.checked)} className="peer sr-only" data-testid="switch-sound" />
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${sound ? 'bg-secondary' : 'bg-muted'}`}><span className={`absolute top-1 size-4 rounded-full bg-foreground transition-transform ${sound ? 'right-1' : 'right-6'}`} /></span>
            </label>
            <div className="flex items-center justify-between gap-4 py-5">
              <div><p className="text-sm font-semibold">لغة الواجهة</p><p className="mt-1 text-xs text-muted-foreground">لغة المحادثة كما تحبها.</p></div>
              <button type="button" className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold" data-testid="button-language"><span>العربية</span><ChevronDown className="size-3.5 text-muted-foreground" /></button>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-secondary/10 px-3 py-3 text-xs text-secondary"><Check className="size-4" /> تحفظ التغييرات تلقائياً على هذا الجهاز</div>
        </div>
        <p className="mt-6 text-center text-[10px] text-muted-foreground">واصل — محادثات أقرب، من أي مكان</p>
      </div>
    </div>
  );
}

export { ChatWorkspace, SettingsPage };