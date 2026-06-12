# Documentatie - Nokia Ticketing System

## Structura aplicatiei

```
Nokia_Team2/
├── backend/          # FastAPI (Python)
│   ├── app/
│   │   ├── main.py           # Entry point, CORS, routere
│   │   ├── auth.py           # JWT, bcrypt
│   │   ├── models.py         # Modele SQLAlchemy
│   │   ├── schemas.py        # Modele Pydantic (validare)
│   │   ├── config.py         # Setari din .env
│   │   ├── database.py       # Conexiune SQL Server
│   │   └── routers/
│   │       ├── auth.py       # POST /auth/login, GET /auth/me
│   │       └── tickets.py    # GET /tickets/, GET /tickets/export
└── frontend/         # React + Vite (TypeScript)
    └── src/
        ├── pages/
        │   ├── Login.tsx
        │   ├── Dashboard.tsx
        │   └── Tickets.tsx
        ├── services/api.ts   # Axios + interceptori
        └── context/AuthContext.tsx
```

---

## Flow general

```
Utilizator → Login → JWT token salvat in localStorage
           → Dashboard (10 tichete recente + statistici)
           → Tickets (tabel paginat, sortabil, exportabil)
```

---

## Autentificare

### Flow
1. Userul trimite `{ FullName, Password }` la `POST /auth/login`
2. Backend-ul cauta userul in tabela `USERS` dupa `FULL_NAME`
3. Parola e verificata cu **bcrypt** (`passlib`)
4. Daca e corecta, se genereaza un **JWT** semnat cu `SECRET_KEY` (valabil 480 minute)
5. Token-ul e returnat si salvat in `localStorage` pe frontend

### Protectie rute
Toate requesturile catre `/tickets/` si `/tickets/export` includ automat headerul:
```
Authorization: Bearer <token>
```
Asta se face prin interceptorul Axios din `services/api.ts`.

Daca token-ul expira sau e invalid (401), interceptorul sterge `localStorage` si redirecteaza la `/login`.

Pe backend, `get_current_user` din `auth.py` decodeaza JWT-ul si verifica ca userul exista in DB.

---

## Interogari (Query-uri)

### Tichete paginate — `GET /tickets/`
Se apeleaza stored procedure-ul `dbo.GetPaginatedTickets` via SQLAlchemy + `text()`.

**Parametri acceptati:**
| Param | Default | Descriere |
|---|---|---|
| `page` | 1 | Numarul paginii |
| `limit` | 10 | Tichete per pagina (10/25/50) |
| `sort_by` | SUBMIT_DATETIME | Coloana de sortare |
| `sort_order` | DESC | ASC sau DESC |
| `search` | null | Cauta in numar, status, prioritate, companie, echipa |
| `status` | null | Filtru status |
| `team` | null | Filtru echipa |
| `start_date` | null | Data inceput (YYYY-MM-DD) |
| `end_date` | null | Data sfarsit (YYYY-MM-DD) |

**Cum functioneaza paginarea:**
- `skip = (page - 1) * limit`
- Stored procedure-ul face `OFFSET @skip ROWS FETCH NEXT @limit ROWS ONLY`
- Se incarca **doar tichetele vizibile**, nu toate 500

**Sortare prioritate:**
Prioritatea nu se sorteaza alfabetic, ci dupa rang:
```
Critical=1, High=2, Medium=3, Low=4
```

**Returnare total:**
Stored procedure-ul returneaza **2 result set-uri**:
1. Tichetele paginate
2. `COUNT(*)` total (pentru calculul paginilor)

Backend-ul citeste ambele result set-uri accesand cursorul raw pyodbc direct (inainte ca SQLAlchemy sa il inchida).

### Dashboard — `GET /tickets/` cu `page=1&limit=10`
Dashboard-ul face un singur request la incarcare si afiseaza primele 10 tichete + statistici calculate local (open, in lucru, finalizate, critice).

---

## Export

### Endpoint: `GET /tickets/export?format=csv|xlsx`

**Parametri:**
| Param | Valori | Descriere |
|---|---|---|
| `format` | `csv` / `xlsx` | Formatul fisierului |
| `priority` | optional | Filtru prioritate |
| `status` | optional | Filtru status |
| `assigned_person` | optional | Filtru persoana |
| `sort_by` | submit_datetime / priority / status | Sortare |
| `sort_order` | asc / desc | Directie sortare |

**Necesita autentificare** (JWT in header).

**Cum functioneaza:**
1. Backend-ul construieste query-ul ORM (SQLAlchemy) cu filtrele primite
2. `pandas.read_sql()` executa query-ul si incarca rezultatele intr-un DataFrame
3. Pentru **CSV**: `df.to_csv()` → `StreamingResponse`
4. Pentru **XLSX**: `pd.ExcelWriter` cu `openpyxl` → header bold, freeze row 1, auto-width coloane, autofilter → `StreamingResponse`

**Pe frontend**, Axios primeste raspunsul ca `blob`, creeaza un URL temporar si declanseaza download-ul automat.

**Librarii necesare:**
```
pandas
openpyxl>=3.1
```

---

## Baza de date

- **Server:** `localhost\SQLEXPRESS`
- **Database:** `ticketing`
- **Autentificare:** Windows Authentication (Trusted_Connection)
- **Driver:** ODBC Driver 18 for SQL Server

**Tabele principale:**
- `INCIDENT_TICKETS` — tichetele
- `USERS` — utilizatori cu parole hashed bcrypt
- `STATUSES`, `PRIORITIES`, `COMPANIES`, `TEAMS` — tabele de referinta

**Stored procedures** (`backend/database/procedures.sql`):
- `dbo.GetPaginatedTickets` — tichete paginate + total count
- `dbo.GetKpiTotalTickets`, `GetKpiTicketsByStatus`, `GetKpiTicketsByPriority` etc. — KPI-uri

---

## Pornire aplicatie

```bash
# Backend
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- Docs API (Swagger): http://localhost:8000/docs
