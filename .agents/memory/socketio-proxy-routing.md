---
name: Socket.io preview routing
description: WebSocket proxy paths must be declared on the service that owns the Socket.io server.
---

Declare `/socket.io` in the owning API artifact service paths and use the same path in the browser client. A root web artifact alone does not forward Socket.io traffic to a separate API service.

**Why:** The shared preview proxy only forwards explicitly declared service paths; an undeclared Socket.io path fails silently while REST can still work.

**How to apply:** When adding Socket.io to an Express API behind artifact routing, update the API artifact routing through the validated artifact metadata flow before debugging client connection state.