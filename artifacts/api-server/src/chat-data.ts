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