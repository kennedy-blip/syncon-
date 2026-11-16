# SyncPulse

Developer-focused real-time Pub/Sub event stream studio built with Vite, React, TypeScript, Tailwind CSS v4 and Vercel Serverless Functions.

## Local development
```bash
npm install
npm run dev
```
Vite alone does not execute `/api`; the UI automatically falls back to a local demo transport. Use `vercel dev` to run the serverless endpoints locally.

## Vercel deployment
Import this repository into Vercel. Vite builds to `dist`; functions under `/api` are deployed as Node.js serverless functions.

## API
- `POST /api/broadcast`: accepts `{ "channel": "room:dev", "event": "user.joined", "payload": {} }`
- `GET /api/broadcast`: returns channel and subscriber telemetry.
- `GET /api/stream?channel=room:dev`: Server-Sent Events stream. Omit channel to subscribe to the demo topics.

## Scaling limitation
The event hub is in-memory and instance-local. Vercel may run functions in separate ephemeral instances, so events and subscriber counts are not shared or durable across function instances. This is a functional simulator, not a production multi-instance broker. For real production fan-out, replace the hub with shared Redis/KV pub-sub and add authentication, rate limits and payload quotas.
