import { Router, type IRouter } from "express";
import {
  ListChatMessagesParams,
  ListChatMessagesResponse,
  ListChatRoomsResponse,
} from "@workspace/api-zod";
import { getRoomMessages, rooms } from "../chat-data";

const router: IRouter = Router();

router.get("/chat/rooms", (_req, res) => {
  res.json(ListChatRoomsResponse.parse(rooms));
});

router.get("/chat/rooms/:roomId/messages", (req, res) => {
  const parsedParams = ListChatMessagesParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: "معرّف الغرفة غير صالح" });
    return;
  }

  const room = rooms.find(({ id }) => id === parsedParams.data.roomId);
  if (!room) {
    res.status(404).json({ error: "الغرفة غير موجودة" });
    return;
  }

  res.json(ListChatMessagesResponse.parse(getRoomMessages(room.id)));
});

export default router;