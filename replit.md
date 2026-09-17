# واصل — Arabic Real-Time Chat

واصل مساحة دردشة عربية RTL لحظية للفرق، مع غرف محادثة، حضور مباشر، رسائل صوتية، وواجهة داكنة متجاوبة.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/arabic-chat/src/pages/chat-workspace.tsx` — مساحة الدردشة والدرج والحضور والرسائل الصوتية.
- `artifacts/arabic-chat/src/index.css` — ألوان وطبقات واجهة واصل وحركاتها.
- `artifacts/api-server/src/chat-data.ts` — بيانات الغرف والرسائل التجريبية والحضور في الذاكرة.
- `artifacts/api-server/src/index.ts` — خادم Socket.io وأحداث الغرف والرسائل.
- `lib/api-spec/openapi.yaml` — عقد REST للغرف وسجل الرسائل.

## Architecture decisions

- واجهة الويب تستخدم React/Vite، بينما يبقى REST وSocket.io في خادم Express المشترك.
- الرسائل والحضور في هذه النسخة محفوظان في الذاكرة لتقديم تجربة لحظية دون فرض تسجيل دخول أو قاعدة بيانات.
- مسار Socket.io مكشوف عبر `/socket.io` في توجيه خادم API حتى يعمل WebSocket خلف المعاينة والنشر.

## Product

- تصفح غرف الفريق والبحث عنها، عرض سجل المحادثة، إرسال الرسائل، وتشغيل معاينات الصوت.
- حضور مباشر مع حالات الاتصال، شارات المشرفين، ودرج تنقل متجاوب على الهاتف.
- صفحة تفضيلات عربية للوضع الهادئ وأصوات الرسائل.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
