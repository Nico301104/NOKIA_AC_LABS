# Nokia AC Labs — Sistem de Ticketing

Aplicație completă de ticketing rezultată din combinarea celor trei module
(branch-urile `Modul_1`, `Modul_2`, `Modul_3`) într-o singură aplicație:

| Modul | Funcționalitate | Rute frontend | Endpoint-uri backend |
|-------|----------------|---------------|----------------------|
| **Modul 1** | Autentificare (JWT) + dashboard de tichete | `/login`, `/dashboard` | `/auth/*`, `/tickets/*`, `/users/*` |
| **Modul 2** | Dashboard KPI cu grafice (Recharts) | `/` (home), `/kpi` | `/kpi/*` |
| **Modul 3** | Asistent chat AI (Azure OpenAI → SQL) | `/chat` | `/chat`, `/history/{id}` |

## Structura proiectului

```
backend/
├── app/
│   ├── main.py            # FastAPI — include toate routerele
│   ├── config.py          # Setări din .env (pydantic-settings)
│   ├── database.py        # Engine SQLAlchemy + get_db
│   ├── models.py          # Modele ORM (companii, echipe, useri, tichete, SLA)
│   ├── auth.py, schemas.py
│   ├── ai_service.py      # Generare SQL + răspuns natural (Azure OpenAI) — Modul 3
│   └── routers/
│       ├── auth.py        # Login / JWT          (Modul 1)
│       ├── tickets.py     # CRUD tichete         (Modul 1)
│       ├── users.py       # Asignare admin       (Modul 1)
│       ├── kpi.py         # KPI + /kpi/tickets   (Modul 2)
│       └── chat.py        # /chat, /history      (Modul 3)
├── create_user.py
├── seed_tickets.py        # Generare 1000 tichete demo (Modul 2)
├── requirements.txt
└── .env.example           # Copiați ca .env și completați

database/
├── modul1_core/           # Tabele, proceduri, date demo (Modul 1)
├── modul2_kpi/            # setup.sql, insert.sql, proceduri KPI (Modul 2)
└── modul3_ai/             # schema.sql, proceduri conversații (Modul 3)

frontend/                  # React 19 + TypeScript + Vite + Recharts
└── src/
    ├── App.tsx            # Toate rutele combinate
    ├── pages/             # Login, Dashboard (M1) + home, dashboard KPI (M2)
    ├── components/        # NavBar, modale (M1) + KPI, header/footer (M2)
    ├── Chat.tsx, Chat.css # Asistent AI (M3)
    └── context/, services/
```

## Setup

### 1. Baza de date (SQL Server)
Rulați scripturile din `database/` (tabelele de bază din `modul1_core/tables.sql`
sau `modul2_kpi/setup.sql`, apoi procedurile fiecărui modul).

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
copy .env.example .env     # completați DATABASE_URL, SECRET_KEY, cheile Azure OpenAI
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

## Note de integrare (rezolvarea conflictelor)

- Cele trei module foloseau aceleași căi de fișiere (`backend/main.py`,
  `frontend/src/App.tsx` etc.) — au fost unificate sub structura Modulului 1
  (`backend/app/` cu routere separate).
- `GET /tickets` din Modul 2 a fost mutat pe `/kpi/tickets` pentru a nu se
  ciocni cu routerul de tichete al Modulului 1 (frontend-ul KPI a fost actualizat).
- Frontend-ul rulează pe React 19 + react-router-dom 7 (stack-ul Modulelor 2/3);
  paginile Modulului 1 au fost păstrate ca atare.
- Stilurile globale ale chatului AI au fost scopate în `Chat.css` ca să nu
  afecteze restul paginilor.
- `.env` a fost scos din git; folosiți `backend/.env.example` ca șablon.

Documentația detaliată per modul: `DOCUMENTATIE.md`, `DOCUMENTATIE_BACKEND.md`,
`DOCUMENTATIE_FRONTEND.md`.
