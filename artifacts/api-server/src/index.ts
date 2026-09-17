import app from "./app";
import { logger } from "./lib/logger";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  getRoomMessages,
  messagesByRoom,
  type ChatMessage,
} from "./chat-data";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// مصفوفة فارغة لتخزين المستخدمين الحقيقيين وإلغاء الأسماء الوهمية
let liveUsers: any[] = [];

const broadcastPresence = () => {
  io.emit("presence:update", liveUsers);
};

io.on("connection", (socket) => {
  // إرسال القائمة الحقيقية (الفارغة مبدئياً) بدلاً من الوهمية
  socket.emit("presence:update", liveUsers);

  socket.on("room:join", (roomId: string) => {
    socket.join(roomId);
    socket.emit("room:history", getRoomMessages(roomId));
  });

  socket.on(
    "message:send",
    (payload: { roomId: string; body: string; author?: string }) => {
      const body = payload?.body?.trim();
      if (!body || !payload.roomId) {
        return;
      }

      const message: ChatMessage = {
        id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        roomId: payload.roomId,
        author: payload.author?.trim() || "أنت",
        authorInitials: payload.author?.charAt(0) || "أ",
        authorRole: "member",
        body,
        sentAt: new Intl.DateTimeFormat("ar", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date()),
        isMine: false,
        kind: "text",
        duration: "",
      };

      const roomMessages = messagesByRoom.get(payload.roomId) ?? [];
      roomMessages.push(message);
      messagesByRoom.set(payload.roomId, roomMessages.slice(-100));
      io.to(payload.roomId).emit("message:new", message);
    },
  );

  socket.on("disconnect", () => {
    broadcastPresence();
  });
});

httpServer.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});
