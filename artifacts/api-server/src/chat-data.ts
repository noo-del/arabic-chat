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
    memberCount: 0,
    unreadCount: 0,
  },
  {
    id: "design",
    name: "التصميم والإبداع",
    description: "نشارك الأفكار ونبنيها",
    memberCount: 0,
    unreadCount: 0,
  },
  {
    id: "random",
    name: "استراحة",
    description: "حديث خفيف خارج العمل",
    memberCount: 0,
    unreadCount: 0,
  },
];

export const messagesByRoom = new Map<string, ChatMessage[]>([
  ["general", []],
  ["design", []],
  ["random", []],
]);

export const onlineUsers: OnlineUser[] = [];

export const getRoomMessages = (roomId: string) =>
  messagesByRoom.get(roomId) ?? [];
