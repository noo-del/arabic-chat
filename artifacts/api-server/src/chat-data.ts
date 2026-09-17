export type ChatRole = "admin" | "member";
export type ChatMessageKind = "text" | "audio";

export type ChatRoom = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  unreadCount: number;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  author: string;
  authorInitials: string;
  authorRole: ChatRole;
  body: string;
  sentAt: string;
  isMine: boolean;
  kind: ChatMessageKind;
  duration: string;
};

export type OnlineUser = {
  id: string;
  name: string;
  initials: string;
  role: ChatRole;
  status: "متصل" | "مشغول";
};

export const rooms: ChatRoom[] = [
  {
    id: "general",
    name: "المجلس العام",
    description: "مساحة الفريق اليومية",
    memberCount: 128,
    unreadCount: 3,
  },
  {
    id: "design",
    name: "التصميم والإبداع",
    description: "نشارك الأفكار ونبنيها",
    memberCount: 46,
    unreadCount: 0,
  },
  {
    id: "random",
    name: "استراحة",
    description: "حديث خفيف خارج العمل",
    memberCount: 82,
    unreadCount: 0,
  },
];

export const messagesByRoom = new Map<string, ChatMessage[]>([
  [
    "general",
    [
      {
        id: "msg-1",
        roomId: "general",
        author: "سارة أحمد",
        authorInitials: "سأ",
        authorRole: "admin",
        body: "صباح الخير يا فريق! تذكير سريع: اجتماعنا الأسبوعي اليوم الساعة 11.",
        sentAt: "09:41",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-2",
        roomId: "general",
        author: "محمد خالد",
        authorInitials: "مخ",
        authorRole: "member",
        body: "صباح النور! تمام، أضفت النقاط الأخيرة إلى جدول الأعمال.",
        sentAt: "09:44",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-3",
        roomId: "general",
        author: "أنت",
        authorInitials: "أ",
        authorRole: "member",
        body: "ممتاز، سأكون موجودًا قبل الموعد بدقائق.",
        sentAt: "09:46",
        isMine: true,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-4",
        roomId: "general",
        author: "ليان محمود",
        authorInitials: "لم",
        authorRole: "admin",
        body: "أرسلت ملخص الأسبوع الماضي لمن يحتاجه قبل الاجتماع.",
        sentAt: "09:52",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-5",
        roomId: "general",
        author: "ياسر علي",
        authorInitials: "يع",
        authorRole: "member",
        body: "ملاحظة صوتية",
        sentAt: "10:03",
        isMine: false,
        kind: "audio",
        duration: "0:28",
      },
      {
        id: "msg-6",
        roomId: "general",
        author: "سلمى",
        authorInitials: "سم",
        authorRole: "member",
        body: "Bonjour: 7700",
        sentAt: "10:06",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-7",
        roomId: "general",
        author: "Mohammed",
        authorInitials: "م",
        authorRole: "member",
        body: "انضم للغرفة (# Owner #)",
        sentAt: "10:08",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-8",
        roomId: "general",
        author: "عمر",
        authorInitials: "ع",
        authorRole: "member",
        body: "انضم للغرفة (# زائر #)",
        sentAt: "10:09",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-9",
        roomId: "general",
        author: "ايمان",
        authorInitials: "اي",
        authorRole: "member",
        body: "698671 انضم للغرفة (# زائر #)",
        sentAt: "10:10",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-10",
        roomId: "general",
        author: "بوسي",
        authorInitials: "ب",
        authorRole: "member",
        body: "9838 انضم للغرفة (# زائر #)",
        sentAt: "10:12",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-11",
        roomId: "general",
        author: "نظام مغلق",
        authorInitials: "ن",
        authorRole: "admin",
        body: "انضم للغرفة (# Owner #)",
        sentAt: "10:14",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-12",
        roomId: "general",
        author: "Google Voice",
        authorInitials: "GV",
        authorRole: "admin",
        body: "انضم للغرفة (# Owner #)",
        sentAt: "10:15",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-13",
        roomId: "general",
        author: "zezo8",
        authorInitials: "ز",
        authorRole: "member",
        body: "المولعه تحبني نسولف شوي",
        sentAt: "10:18",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-14",
        roomId: "general",
        author: "رسائل النظام",
        authorInitials: "رب",
        authorRole: "admin",
        body: "كن إيجابياً للحفاظ على جهودك أنت والجميع وبلغ الإدارة عن الأعضاء المخالفة التي تقوم بعمل فلود وتكرار لكسب نقاط بطريقة غير شرعية",
        sentAt: "10:20",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-15",
        roomId: "general",
        author: "Tmmmtttt",
        authorInitials: "ت",
        authorRole: "member",
        body: "انضم للغرفة (# زائر #)",
        sentAt: "10:22",
        isMine: false,
        kind: "text",
        duration: "",
      },
      {
        id: "msg-16",
        roomId: "general",
        author: "النظام الآلي",
        authorInitials: "ن",
        authorRole: "admin",
        body: "حياكم الله جميعاً، ممنوع طرح أي مشكلة علناً. إدارة الجروب ممنوع إرسال طلبات أو رسائل خاصة.",
        sentAt: "10:25",
        isMine: false,
        kind: "text",
        duration: "",
      },
    ],
  ],
  ["design", []],
  ["random", []],
]);

export const onlineUsers: OnlineUser[] = [
  { id: "sara", name: "سارة أحمد", initials: "سأ", role: "admin", status: "متصل" },
  { id: "layan", name: "ليان محمود", initials: "لم", role: "admin", status: "متصل" },
  { id: "mohammad", name: "محمد خالد", initials: "مخ", role: "member", status: "مشغول" },
  { id: "yaser", name: "ياسر علي", initials: "يع", role: "member", status: "متصل" },
  { id: "reem", name: "ريم ناصر", initials: "رن", role: "member", status: "متصل" },
];

export const getRoomMessages = (roomId: string) =>
  messagesByRoom.get(roomId) ?? [];