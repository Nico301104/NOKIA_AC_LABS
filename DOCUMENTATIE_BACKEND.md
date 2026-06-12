# Documentație Backend — Nokia Ticket Filter

Această documentație explică, pe înțelesul oricui, **tot** ce face partea de server
(backend-ul) a aplicației **Nokia Ticket Filter**: ce conține fiecare fișier, ce face
fiecare funcție, cum circulă datele și cum comunică cu baza de date și cu frontend-ul.

> Document destinat prezentării. Este scris ca să poți răspunde la întrebări fără să
> presupui cunoștințe anterioare. La final există o secțiune **Întrebări frecvente**.

---

## 1. Ce este backend-ul?

Backend-ul este „creierul" și „magazia" aplicației: partea pe care utilizatorul **nu** o
vede direct. El **ține datele** (prin baza de date), **verifică cine are voie să facă ce**
(autentificare și roluri) și **execută acțiunile** cerute de frontend (login, listare
tichete, schimbare status, asignare, export). Frontend-ul doar **cere** și **afișează**;
backend-ul **decide** și **răspunde**.

Pe scurt, backend-ul este un **API** (o colecție de „endpoint-uri", adică adrese pe care
frontend-ul le poate apela) care primește cereri HTTP, vorbește cu baza de date SQL Server
și întoarce răspunsuri în format **JSON**.

### Tehnologii folosite

| Tehnologie | Rol |
|---|---|
| **Python 3** | Limbajul în care e scris serverul |
| **FastAPI** | Framework-ul web care definește endpoint-urile și generează documentația automată |
| **Uvicorn** | Serverul care rulează aplicația (pe portul 8000) |
| **SQLAlchemy** | „Traducătorul" între cod Python și tabelele bazei de date (ORM) |
| **pyodbc** | Driverul prin care Python se conectează la **SQL Server** |
| **Pydantic** | Verifică forma datelor primite/trimise (validare + serializare) |
| **python-jose** | Creează și verifică token-urile **JWT** (cardurile de acces) |
| **passlib + bcrypt** | Criptează (hash-uiește) parolele, ca să nu fie stocate „în clar" |
| **pandas + openpyxl** | Construiesc fișierele de **export** CSV / XLSX |
| **SQL Server (T-SQL)** | Baza de date + **proceduri stocate** care conțin logica grea |

### Cum pornește (pentru demo)

```bash
cd backend
# prima dată: instalează bibliotecile (vezi dependencies.txt)
uvicorn app.main:app --reload --port 8000
```

Serverul pornește la **http://localhost:8000**. FastAPI oferă automat o pagină de
documentație interactivă la **http://localhost:8000/docs** (Swagger UI), unde poți testa
fiecare endpoint cu mâna.

---

## 2. Structura fișierelor (starea actuală)

```
backend/
│
├── app/                          ← Codul aplicației (serverul propriu-zis)
│   ├── main.py                   ← Punctul de pornire (creează aplicația, CORS, rutele)
│   ├── config.py                 ← Citește setările din .env (DB, secret JWT, CORS)
│   ├── database.py               ← Conexiunea cu baza de date + sesiunile
│   ├── auth.py                   ← Parole criptate + token-uri JWT + „cine e logat"
│   ├── models.py                 ← Tabelele bazei de date descrise în Python (ORM)
│   ├── schemas.py                ← Forma datelor de intrare/ieșire (Pydantic)
│   └── routers/                  ← Endpoint-urile, grupate pe domenii
│       ├── auth.py               ← /auth/login, /auth/me
│       ├── tickets.py            ← /tickets/... (listare, filtre, export, acțiuni)
│       └── users.py              ← /users/my-team
│
├── database/                     ← Scripturi SQL pentru SQL Server
│   ├── tables.sql                ← Creează baza de date și tabelele
│   ├── procedures.sql            ← Procedurile de listare + statistici
│   ├── change_status.sql         ← Procedura de schimbare status
│   ├── auto_assign.sql           ← Procedura de preluare proprie (self-assign)
│   ├── admin_assign.sql          ← Procedura de asignare de către Team Admin
│   ├── new_status.sql            ← Adaugă statusurile 'Assigned' și 'Create'
│   ├── team_admin.sql            ← Adaugă coloana IS_TEAM_ADMIN în USERS
│   ├── dummy_data.sql / 500tickets.sql / ... ← Date de test
│   └── hashed_passw.sql          ← Parole de test (hash-uite)
│
├── create_user.py                ← Script ajutător: setează o parolă unui user existent
├── check_db.py                   ← Script ajutător: verifică conținutul bazei de date
├── dependencies.txt              ← Lista bibliotecilor de instalat (pip)
└── .env                          ← Setări locale (NU e în git: parole, secret JWT)
```

> **Notă despre arhitectură:** logica „grea" (filtrare, sortare, paginare, regulile de
> asignare) stă în **proceduri stocate SQL Server**, iar Python doar le **apelează**
> (`EXEC dbo.NumeProcedura`). Avantaj: viteză și logică centralizată în baza de date.

---

## 3. Descrierea fiecărui fișier

### `app/main.py` — Punctul de pornire
Primul fișier care rulează. Aici se „naște" aplicația:
1. `Base.metadata.create_all(...)` — la pornire, creează tabelele care încă nu există.
2. Creează aplicația `FastAPI` (titlu, versiune).
3. Adaugă **CORS** — permite frontend-ului (de pe alt port/adresă) să facă cereri.
   Adresele permise vin din `CORS_ORIGINS` (din `.env`).
4. „Lipește" cele trei grupuri de endpoint-uri: `auth`, `tickets`, `users`.
5. Definește un endpoint simplu `GET /` (**health check**) care răspunde
   `{"status": "online"}` — util ca să verifici rapid că serverul e pornit.

---

### `app/config.py` — Setările aplicației
Citește configurarea din fișierul `.env` (sau din variabile de mediu) și o pune la
dispoziție prin obiectul `settings`. Folosește `pydantic-settings`, deci dacă o setare
obligatorie lipsește, aplicația **nu pornește** (te avertizează clar).

| Setare | Ce reprezintă |
|---|---|
| `DATABASE_URL` | Adresa de conectare la SQL Server (cu driver, user, parolă, baza `ticketing`) |
| `SECRET_KEY` | Cheia secretă cu care se semnează token-urile JWT |
| `ALGORITHM` | Algoritmul de semnare (ex. `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Cât timp e valabil un token (implicit **480 min = 8h**) |
| `CORS_ORIGINS` | Adresele frontend-ului permise (ex. `http://localhost:5173`) |

`@lru_cache()` face ca setările să fie citite **o singură dată** și reținute (cache).

---

### `app/database.py` — Conexiunea cu baza de date
„Țeava" către SQL Server.
- **`engine`** — motorul de conexiune, construit din `DATABASE_URL`.
- **`SessionLocal`** — „fabrica" de sesiuni; fiecare cerere primește o sesiune proprie.
- **`Base`** — clasa de bază din care moștenesc toate modelele (tabelele) din `models.py`.
- **`get_db()`** — funcție specială (generator) care deschide o sesiune la începutul unei
  cereri și o **închide automat** la final, indiferent dacă a apărut o eroare. Toate
  endpoint-urile o folosesc prin `Depends(get_db)`.

---

### `app/auth.py` — Securitatea (parole + token-uri)
Conține tot ce ține de autentificare:

| Funcție | Ce face |
|---|---|
| `verify_password(plain, hashed)` | Verifică dacă parola introdusă corespunde celei criptate din DB |
| `get_password_hash(password)` | Criptează o parolă (bcrypt) pentru stocare |
| `create_access_token(data)` | Creează un JWT cu numele userului (`sub`) și data de expirare |
| `get_current_user(token, db)` | „Cine e logat?" — decodează token-ul, scoate numele și caută userul în DB |

`get_current_user` este **paznicul** endpoint-urilor protejate: orice endpoint care îl
cere prin `Depends(get_current_user)` poate fi accesat **doar cu un token valid**. Dacă
token-ul lipsește, e expirat, e falsificat sau userul nu mai există → răspunde **401
Unauthorized**.

> `oauth2_scheme` îi spune lui FastAPI să caute token-ul în header-ul
> `Authorization: Bearer <token>` (exact ce trimite frontend-ul automat).

---

### `app/models.py` — Tabelele bazei de date (în Python)
Descrie structura bazei de date sub formă de clase Python (ORM). Fiecare clasă = un tabel,
fiecare atribut = o coloană. Relațiile (`relationship`) leagă tabelele între ele.

| Clasă (tabel) | Ce reprezintă | Coloane importante |
|---|---|---|
| `Company` (`COMPANIES`) | Companiile clienților | `company_id`, `company_name` |
| `Team` (`TEAMS`) | Echipele (aparțin unei companii) | `team_id`, `team_name`, `company_id` |
| `User` (`USERS`) | Utilizatorii aplicației | `FullName`, `Email`, `Team`, `hashed_password` |
| `Status` (`STATUSES`) | Statusurile posibile ale unui tichet | `status_id`, `status_name` |
| `Priority` (`PRIORITIES`) | Prioritățile (Critical/High/...) | `priority_id`, `priority_name` |
| `IncidentTicket` (`INCIDENT_TICKETS`) | **Tichetul** (entitatea centrală) | `Ticket_Number` (cheie), date, categorii, descriere etc. |
| `SlaConfig` (`SLA_CONFIG`) | Timpul SLA per prioritate (ore) | `priority_id`, `sla_hours` |

> Tichetul (`IncidentTicket`) e legat prin **chei străine** de companie, echipă, status,
> prioritate și persoana asignată. Câmpurile de timp (`Submit_Datetime`,
> `Resolved_Datetime`, `Closed_Datetime`, `Last_Modified` etc.) marchează momentele
> importante din viața tichetului.

---

### `app/schemas.py` — Forma datelor (Pydantic)
Definește **cum trebuie să arate** datele care intră și ies din API. FastAPI le folosește
ca să **valideze** automat cererile și să **serializeze** răspunsurile în JSON.

| Schemă | Rol |
|---|---|
| `UserLogin` | Datele de login: `FullName` + `Password` (acceptă și `username`/`fullName`) |
| `Token` | Răspunsul la login: `access_token`, `token_type`, `expires_in` |
| `UserOut` | Datele userului returnate de `/auth/me`: `FullName`, `Team`, `Role` |
| `TicketOut` | Forma completă a unui tichet în răspuns |
| `PaginatedTickets` | Răspunsul paginat: `items`, `total`, `page`, `pages` |
| `ChangeTicketStatusRequest` | Corpul cererii de schimbare status: `NewStatusId` |
| `SelfAssignTicketRequest` | Corpul cererii de preluare proprie: `UserFullName` |
| `AdminAssignTicketRequest` | Corpul asignării de admin: `AdminFullName` + `TargetUserFullName` |

> **`AliasChoices`** permite ca frontend-ul să trimită numele câmpului în mai multe
> variante (ex. `username`, `fullName`, `FullName`) — toate sunt acceptate. Asta face
> comunicarea cu frontend-ul mai tolerantă.

---

### `app/routers/auth.py` — Autentificarea
Grupul de endpoint-uri cu prefixul `/auth`.

| Endpoint | Metodă | Ce face |
|---|---|---|
| `/auth/login` | POST | Verifică user + parolă și întoarce un token JWT |
| `/auth/me` | GET | Întoarce datele userului logat (necesită token) |

**Loginul, pas cu pas:**
1. Caută userul în DB după nume (cu `RTRIM` ca să ignore spațiile de la final).
2. Verifică parola cu `verify_password` (compară hash-ul).
3. Dacă userul nu există **sau** parola e greșită → **401** „Invalid username or password".
4. Dacă e corect → creează un token cu numele userului și îl întoarce împreună cu durata
   de valabilitate (`expires_in`, în secunde).

`/auth/me` folosește `get_current_user`: doar cu un token valid întoarce `FullName`,
`Team` și `Role`.

---

### `app/routers/users.py` — Echipa utilizatorului
Un singur endpoint: **`GET /users/my-team`** (protejat).
Întoarce echipa userului curent: numele echipei + lista colegilor, fiecare cu `FullName`,
`Email`, `Team` și **`IsTeamAdmin`** (dacă e administrator de echipă). Frontend-ul îl
folosește în modalul de detalii ca să știe cine poate asigna și cui.

---

### `app/routers/tickets.py` — Inima backend-ului
Grupul de endpoint-uri cu prefixul `/tickets`. Aici se întâmplă aproape tot ce ține de
tichete. Toate endpoint-urile de **acțiune** și exportul cer un user logat.

#### A) `GET /tickets/` — Listarea paginată (cu filtre și sortare)
Cel mai folosit endpoint. Primește parametri și **apelează procedura stocată**
`dbo.GetPaginatedTickets` (prin `exec_tickets_procedure`).

**Parametri acceptați:**

| Parametru | Valori | Ce face |
|---|---|---|
| `page` | număr | Pagina curentă |
| `limit` | 10 / 25 / 50 | Câte tichete pe pagină |
| `sort_by` | `SUBMIT_DATETIME`, `STATUS`, `PRIORITY`, `COMPANY`, `TEAM` | După ce se sortează |
| `sort_order` | `ASC` / `DESC` | Crescător / descrescător |
| `search` | text | Caută în număr, status, prioritate, companie, echipă |
| `status` | text | Filtrează după status |
| `team` | text | Filtrează după echipă |
| `start_date` / `end_date` | dată | Interval de timp (după data de înregistrare) |

Procedura întoarce **două seturi de rezultate**: (1) tichetele paginate și (2) numărul
total de tichete care trec de filtre. Python citește ambele (`nextset()`), calculează
numărul de pagini și răspunde cu structura `PaginatedTickets`.

#### B) Liste pentru dropdown-uri
Endpoint-uri simple care întorc liste de nume, sortate alfabetic:

| Endpoint | Întoarce |
|---|---|
| `GET /tickets/teams` | Lista echipelor |
| `GET /tickets/companies` | Lista companiilor |
| `GET /tickets/statuses` | Lista statusurilor |
| `GET /tickets/priorities` | Lista priorităților |

#### C) `GET /tickets/export` — Exportul (CSV / XLSX)
Construiește un fișier cu tichetele filtrate. Spre deosebire de listare, **nu** folosește
o procedură stocată, ci interoghează direct prin SQLAlchemy + **pandas**.
- **Filtre:** `priority`, `status`, `assigned_person` (valoarea `"All"` = fără filtru).
- **Sortare:** `submit_datetime`, `priority` (Critical→Low) sau `status`.
- **CSV:** întoarce un fișier text descărcabil (`tickets.csv`).
- **XLSX:** întoarce un Excel îngrijit — antet îngroșat, primul rând „înghețat", lățimi de
  coloană auto-ajustate și filtre activate (`tickets.xlsx`).

#### D) Acțiuni pe tichete (apelează proceduri stocate)
Fiecare acțiune trimite comanda către o procedură SQL și, la eroare, face `rollback` și
întoarce mesajul de eroare ca **400**.

| Endpoint | Metodă | Procedură apelată | Ce face |
|---|---|---|---|
| `/tickets/{nr}/status` | PATCH | `sp_ChangeTicketStatus` | Schimbă statusul (după ID) |
| `/tickets/{nr}/self-assign` | POST | `sp_SelfAssignTicket` | Userul își preia singur un tichet liber |
| `/tickets/{nr}/admin-assign` | POST | `sp_AdminAssignTicket` | Un Team Admin asignează unui coleg |

---

## 4. Baza de date și procedurile stocate

Logica de business „grea" stă în SQL Server, în proceduri stocate. Iată ce face fiecare:

### `dbo.GetPaginatedTickets` (în `procedures.sql`)
Inima listării. Pe scurt:
1. Transformă `start_date` / `end_date` (text) în date reale (`00:00:00` / `23:59:59`).
2. Construiește lista filtrată de tichete (`FilteredTickets`), legând tabelele (JOIN) și
   aplicând toate filtrele (status, echipă, interval, căutare).
3. Sortează după coloana cerută și aplică **paginarea** (`OFFSET ... FETCH NEXT`).
4. Întoarce, separat, **numărul total** de tichete care trec de filtre (pentru paginare).

### `dbo.GetDashboardStats` (în `procedures.sql`)
Calculează cifrele pentru cardurile de statistici: total, Open, In Progress, finalizate
(Closed+Resolved) și Critical — toate cu aceleași filtre opționale.

### `sp_ChangeTicketStatus` (în `change_status.sql`)
1. Verifică dacă ID-ul de status trimis există (altfel dă eroare).
2. Actualizează statusul și `LAST_MODIFIED_DATETIME`.
3. **Bonus automat:** dacă noul status e `Resolved`, salvează `RESOLVED_DATETIME`; dacă e
   `Closed`, salvează `CLOSED_DATETIME`.

### `sp_SelfAssignTicket` (în `auto_assign.sql`) — preluare proprie
1. Află echipa userului (dacă nu există → eroare).
2. **Verifică regula de preluare:** tichetul trebuie să fie `Open`, **fără echipă** și
   **fără persoană** asignată. Altfel → eroare.
3. Setează persoana = userul, echipa = echipa lui, status = `Assigned`.

### `sp_AdminAssignTicket` (în `admin_assign.sql`) — asignare de admin
1. Verifică dacă cel care cere e **Team Admin** (`IS_TEAM_ADMIN = 1`), altfel → eroare.
2. Verifică dacă colegul țintă există **și e în aceeași echipă** (un admin asignează doar
   în propria echipă).
3. Aplică aceeași regulă: tichetul trebuie să fie `Open` și complet liber.
4. Setează persoana = colegul, echipa = echipa adminului, status = `Assigned`.

> **De ce verificările sunt în proceduri și nu în Python?** Ca regulile să fie aplicate
> **la nivelul bazei de date**, indiferent cine apelează — sigur și consistent. Python doar
> transmite cererea și întoarce eventuala eroare către frontend.

### Tabele și scripturi auxiliare
- **`tables.sql`** — (re)creează baza `ticketing` și toate tabelele (Companies, Teams,
  Users, Statuses, Priorities, Incident_Tickets, Sla_Config).
- **`new_status.sql`** — adaugă statusurile `Assigned` și `Create`.
- **`team_admin.sql`** — adaugă coloana `IS_TEAM_ADMIN` (BIT) în `USERS`, implicit `0`.
- **`dummy_data.sql` / `500tickets.sql` / `100_unassigned_tickets.sql`** — date de test.
- **`hashed_passw.sql`** — setează parole de test (hash-uite).

---

## 5. Fluxul complet al unei cereri (exemplu: login + listare)

```
1. Frontend trimite POST /auth/login cu { FullName, Password }
2. routers/auth.py caută userul în DB și verifică parola (auth.py → verify_password)
3. Dacă e ok → create_access_token → întoarce { access_token, ... }
4. Frontend salvează token-ul și apelează GET /auth/me cu header Authorization: Bearer <token>
5. get_current_user decodează token-ul → găsește userul → întoarce FullName/Team/Role
6. Frontend cere GET /tickets/?page=1&limit=10&sort_by=...
7. routers/tickets.py apelează procedura dbo.GetPaginatedTickets în SQL Server
8. Procedura filtrează + sortează + paginează → întoarce tichetele + totalul
9. Backend formatează răspunsul (PaginatedTickets) și îl trimite ca JSON
10. La o acțiune (PATCH status / assign) → se apelează procedura corespunzătoare → commit
```

---

## 6. Cum comunică backend-ul cu frontend-ul

Backend-ul expune un API REST. Iată **toate** endpoint-urile și starea lor:

| Endpoint | Metodă | Protejat? | La ce folosește | Folosit de frontend? |
|---|---|---|---|---|
| `/` | GET | nu | Health check (server online?) | (tehnic) |
| `/auth/login` | POST | nu | Login → token | ✅ AuthContext |
| `/auth/me` | GET | da | Datele userului logat | ✅ AuthContext |
| `/tickets/` | GET | nu | Listă paginată + filtre + sortare | ✅ Dashboard |
| `/tickets/teams` | GET | nu | Lista echipelor | ✅ Dashboard |
| `/tickets/companies` | GET | nu | Lista companiilor | ⚠️ neutilizat încă |
| `/tickets/statuses` | GET | nu | Lista statusurilor | ⚠️ neutilizat încă |
| `/tickets/priorities` | GET | nu | Lista priorităților | ⚠️ neutilizat încă |
| `/tickets/export` | GET | da | Export CSV / XLSX | ✅ Dashboard |
| `/tickets/{nr}/status` | PATCH | da | Schimbă statusul | ✅ Modal |
| `/tickets/{nr}/self-assign` | POST | da | Preluare proprie | ✅ Modal |
| `/tickets/{nr}/admin-assign` | POST | da | Asignare de Team Admin | ✅ Modal |
| `/users/my-team` | GET | da | Echipa userului + cine e admin | ✅ Modal |

> **CORS:** backend-ul acceptă cereri doar de la adresele din `CORS_ORIGINS`. Fără asta,
> browserul ar bloca apelurile frontend-ului (politica „same-origin").

---

## 7. Concepte cheie (de știut la prezentare)

- **API REST:** o colecție de adrese (endpoint-uri) pe care frontend-ul le apelează prin
  HTTP (GET, POST, PATCH...) și care răspund în JSON.
- **ORM (SQLAlchemy):** scrii cod Python (clase/obiecte) în loc de SQL brut; biblioteca
  „traduce" în interogări SQL. Aici e folosit mai ales pentru export și pentru `/auth/me`.
- **Procedură stocată:** o „funcție" scrisă în SQL, salvată în baza de date. Logica grea
  (listare, asignare) stă acolo, iar Python doar o cheamă cu `EXEC`.
- **JWT:** un „card de acces" semnat criptografic, primit la login. Backend-ul îl verifică
  la fiecare cerere protejată. Expiră după 8 ore (configurabil).
- **Hash de parolă (bcrypt):** parolele **nu** se stochează în clar; se stochează o formă
  criptată ireversibil. La login se compară hash-urile.
- **Dependency Injection (`Depends`):** mecanismul prin care FastAPI „injectează" automat
  în fiecare endpoint sesiunea de DB (`get_db`) sau userul logat (`get_current_user`).
- **Validare (Pydantic):** datele primite sunt verificate automat după schemele din
  `schemas.py`; dacă lipsește un câmp sau are tip greșit, FastAPI răspunde cu eroare clară.
- **Roluri:** un **Team Admin** (`IS_TEAM_ADMIN = 1`) poate asigna tichete colegilor din
  propria echipă; un user obișnuit poate doar să preia singur tichete `Open` libere.

---

## 8. Întrebări frecvente (posibile la prezentare)

**Î: Unde stă logica aplicației — în Python sau în baza de date?**
R: E împărțită. Python (FastAPI) se ocupă de autentificare, validare, CORS și formatarea
răspunsurilor. Logica grea (filtrare/sortare/paginare și regulile de asignare) stă în
**proceduri stocate** SQL Server, pentru viteză și consistență.

**Î: Cum sunt protejate parolele?**
R: Nu se stochează niciodată în clar. Se salvează un **hash bcrypt** (ireversibil). La
login, parola introdusă e hash-uită și comparată cu cea din DB.

**Î: Ce e token-ul JWT și de unde vine?**
R: E un „card de acces" semnat cu `SECRET_KEY`, emis la login. Conține numele userului și
data de expirare. Frontend-ul îl trimite la fiecare cerere; backend-ul îl verifică în
`get_current_user`.

**Î: Ce se întâmplă dacă token-ul e invalid sau expirat?**
R: `get_current_user` aruncă **401 Unauthorized**. Frontend-ul (în `api.ts`) prinde 401-ul,
șterge sesiunea și trimite userul la `/login`.

**Î: Cine poate schimba statusul / asigna tichete?**
R: Schimbarea statusului și preluarea proprie — orice user logat (preluarea doar pe tichete
`Open` libere). Asignarea către un coleg — doar un **Team Admin**, și doar în propria echipă.
Regulile sunt verificate în procedurile stocate.

**Î: De ce schimbarea statusului cere un ID (număr), nu un nume?**
R: Pentru că tabelul `STATUSES` leagă fiecare nume de un `STATUS_ID`. Procedura
`sp_ChangeTicketStatus` primește ID-ul și actualizează direct. Frontend-ul ține maparea
nume→ID în `tickets.ts`.

**Î: Cum funcționează exportul?**
R: `/tickets/export` interoghează tichetele (cu filtre/sortare), le încarcă într-un
**DataFrame pandas** și generează fie un CSV, fie un XLSX (Excel formatat). Fișierul e
trimis ca descărcare (`StreamingResponse`).

**Î: De ce există endpoint-uri neutilizate (`/companies`, `/statuses`, `/priorities`)?**
R: Sunt pregătite pentru filtre viitoare în interfață (după companie/prioritate). Backend-ul
le are deja gata; frontend-ul le va folosi când se vor adăuga acele filtre.

**Î: Ce este CORS și de ce e nevoie?**
R: O regulă de securitate a browserului. Frontend-ul (port 5173) și backend-ul (port 8000)
sunt „origini diferite", deci backend-ul trebuie să permită explicit adresele frontend-ului
prin `CORS_ORIGINS`, altfel browserul blochează cererile.

**Î: Ce e fișierul `.env` și de ce nu e în git?**
R: Conține setări sensibile (adresa bazei de date cu user/parolă, `SECRET_KEY`). Nu se pune
în git din motive de securitate; fiecare mediu (dev/producție) are propriul `.env`.

---

## 9. Fișiere de configurare și ajutătoare

| Fișier | Rol în două cuvinte |
|---|---|
| `.env` | Setări locale (DB, secret JWT, CORS) — **nu** e în git |
| `dependencies.txt` | Comenzile `pip install` pentru toate bibliotecile |
| `create_user.py` | Setează/resetează parola (hash-uită) unui user existent |
| `check_db.py` | Verifică rapid conținutul unei baze de date locale (test) |

> **`create_user.py`** e util la demo: deoarece userii de test vin din `dummy_data.sql`
> fără parolă, scriptul le atribuie una (hash-uită) ca să te poți loga. Editezi numele și
> parola în fișier, apoi îl rulezi din folderul `backend`.

---

## 10. Rezumat rapid (un rând per fișier)

**Cod de aplicație (`app/`):**

| Fișier | Rol în două cuvinte |
|---|---|
| `main.py` | Pornire aplicație + CORS + rute |
| `config.py` | Citește setările din `.env` |
| `database.py` | Conexiunea + sesiunile DB |
| `auth.py` | Parole criptate + token-uri JWT |
| `models.py` | Tabelele bazei de date (ORM) |
| `schemas.py` | Forma datelor intrare/ieșire |
| `routers/auth.py` | Login + datele userului |
| `routers/tickets.py` | Listare + filtre + export + acțiuni |
| `routers/users.py` | Echipa userului curent |

**Baza de date (`database/`):**

| Fișier | Rol în două cuvinte |
|---|---|
| `tables.sql` | Creează baza + tabelele |
| `procedures.sql` | Listare paginată + statistici |
| `change_status.sql` | Procedura de schimbare status |
| `auto_assign.sql` | Procedura de preluare proprie |
| `admin_assign.sql` | Procedura de asignare de admin |
| `new_status.sql` | Adaugă statusuri (`Assigned`, `Create`) |
| `team_admin.sql` | Adaugă coloana `IS_TEAM_ADMIN` |
| `dummy_data.sql` / `500tickets.sql` / ... | Date de test |
