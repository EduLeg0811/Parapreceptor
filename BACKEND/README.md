# Parapreceptor Backend

Backend FastAPI do Parapreceptor.

## Desenvolvimento

1. Crie e ative um ambiente Python:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Instale dependencias:

```powershell
pip install -r requirements.txt
```

3. Crie `.env` a partir de `.env.example` e configure `OPENAI_API_KEY`.

4. Inicie pelo script da raiz:

```powershell
.\run-server.cmd
```

Se a execucao de scripts PowerShell estiver liberada, `.\run-server.ps1` tambem funciona.

Ou rode manualmente:

```powershell
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8787 --reload
```

API: `http://localhost:8787`
Docs: `http://localhost:8787/docs`

## Dados locais

Arquivos temporarios ficam em `server-data/`, que nao deve ser versionado.
