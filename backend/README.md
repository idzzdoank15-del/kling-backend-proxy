# Kling Backend Proxy (Freepik API)

This backend fixes CORS by calling Freepik from the server (server-to-server).  
Your Canvas/React front-end calls this backend instead of calling Freepik directly.

## Routes
- GET `/health`
- POST `/api/kling/:model` (multipart/form-data: `image` + `prompt` + optional fields)
- GET `/api/kling/:model/:id`

## Local run
```bash
cd backend
npm i
cp .env.example .env
npm run start
# open http://localhost:8787/health
```

## Security (recommended)
Set `APP_TOKEN` in hosting. Then your front-end must send header:
`x-app-token: <APP_TOKEN>`

## Freepik API key
Recommended: set `FREEPIK_API_KEY` in hosting env (so UI doesn't need to send it).
If not set, UI can send `x-freepik-api-key` header.
