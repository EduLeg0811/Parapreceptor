# Parapreceptor Frontend

Frontend React/Vite do Parapreceptor.

## Desenvolvimento

1. Instale dependencias:

```powershell
npm install
```

2. Crie `.env` a partir de `.env.example` e aponte `VITE_API_BASE_URL` para o backend:

```env
VITE_API_BASE_URL=http://localhost:8787
```

3. Inicie:

```powershell
npm run dev
```

O frontend roda em `http://localhost:5173`.

## Build

```powershell
npm run build
```

O build estatico sai em `dist/`.
