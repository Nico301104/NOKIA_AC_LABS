# Documentație Frontend — Nokia Ticket Filter

Această documentație explică, pe înțelesul oricui, cum este construit și cum funcționează
partea vizuală (frontend-ul) a aplicației **Nokia Ticket Filter**.

---

## Ce este frontend-ul?

Frontend-ul este tot ce vede și atinge utilizatorul: ecranele, butoanele, tabelele, meniurile.
El comunică cu un server (backend) pentru a obține și afișa datele despre tichete.

Tehnologiile folosite:

| Tehnologie | Rol |
|---|---|
| **React** | Construiește interfața vizuală din componente reutilizabile |
| **TypeScript** | Versiune mai sigură a JavaScript, cu verificare de tipuri |
| **Vite** | Unealtă care pornește și construiește aplicația rapid |
| **Axios** | Trimite cereri HTTP către server (backend) |
| **React Router** | Gestionează navigarea între pagini fără a reîncărca pagina |

---

## Structura fișierelor

```
frontend/src/
│
├── main.tsx                    ← Punctul de pornire al aplicației
├── App.tsx                     ← Rutele (harta paginilor)
├── index.css                   ← Stiluri globale
│
├── context/
│   └── AuthContext.tsx         ← Gestionează autentificarea (login/logout)
│
├── services/
│   └── api.ts                  ← Conexiunea cu serverul (backend)
│
├── components/
│   ├── NavBar.tsx              ← Bara de navigare de sus
│   └── ProtectedRoute.tsx      ← Protejează paginile pentru utilizatori neautentificați
│
└── pages/
    ├── Login.tsx               ← Pagina de autentificare
    ├── Login.css               ← Stiluri pentru pagina de login
    ├── Dashboard.tsx           ← Pagina principală cu statistici
    └── Dashboard.css           ← Stiluri pentru dashboard și tichete
```

---

## Descrierea fiecărui fișier

---

### `main.tsx` — Punctul de pornire

**Ce face:** Este primul fișier care rulează când se deschide aplicația. El „asamblează" toate
piesele împreună și le afișează în browser.

**Concret:** Învelește toată aplicația în trei straturi:
1. `BrowserRouter` — activează sistemul de navigare între pagini
2. `AuthProvider` — pune la dispoziție informațiile de autentificare (cine este logat)
3. `App` — afișează paginile propriu-zise

---

### `App.tsx` — Harta paginilor (rutele)

**Ce face:** Definește ce pagină se afișează în funcție de adresa URL din browser.

| URL | Ce se afișează |
|---|---|
| `/` | Redirecționează automat la `/login` |
| `/login` | Pagina de autentificare |
| `/dashboard` | Pagina principală (necesită login) |
| `/tickets` | Lista completă de tichete (necesită login) |
| orice altă adresă | Redirecționează la `/login` |

**Important:** Paginile `/dashboard` și `/tickets` sunt „protejate" — dacă un utilizator
neautentificat încearcă să le acceseze, este trimis automat la pagina de login.

---

### `context/AuthContext.tsx` — Sistemul de autentificare

**Ce face:** Este „creierul" care ține minte cine este logat și oferă funcțiile de login/logout
tuturor celorlalte componente ale aplicației.

**Date stocate despre utilizator:**
- `username` — numele utilizatorului (ex: Ion Popescu)
- `role` — rolul în sistem (ex: admin, user)
- `team` — echipa din care face parte

**Funcții disponibile:**

| Funcție | Ce face |
|---|---|
| `login(username, password)` | Trimite credențialele la server, primește un token de acces și salvează datele utilizatorului în browser |
| `logout()` | Șterge toate datele de autentificare din browser și deconectează utilizatorul |
| `isAuthenticated` | Indică dacă există un utilizator logat (adevărat/fals) |

**Cum funcționează loginul pas cu pas:**
1. Utilizatorul completează username și parolă
2. Aplicația trimite aceste date la server (`/auth/login`)
3. Serverul răspunde cu un **token** (un cod secret de identificare)
4. Aplicația salvează tokenul în `localStorage` (memoria locală a browserului)
5. Aplicația cere serverului datele utilizatorului (`/auth/me`) folosind tokenul
6. Datele (username, rol, echipă) sunt salvate și utilizatorul este logat

**Notă:** Datele sunt salvate în `localStorage`, astfel utilizatorul rămâne logat chiar dacă
reîncarcă pagina sau închide și redeschide browserul.

---

### `services/api.ts` — Conexiunea cu serverul

**Ce face:** Este „poșta" aplicației — tot ce se trimite sau se primește de la server trece prin
acest fișier.

**Configurare:**
- Se conectează la adresa `http://localhost:8000` (sau altă adresă definită în configurație)
- Timeout de 10 secunde (dacă serverul nu răspunde, afișează eroare)

**Comportament automat:**

1. **La fiecare cerere trimisă:** Dacă există un token de autentificare salvat, îl atașează
   automat la cerere. Astfel serverul știe că cererea vine de la un utilizator logat.

2. **La fiecare răspuns primit:** Dacă serverul răspunde cu eroarea `401` (neautorizat —
   tokenul a expirat sau este invalid), șterge automat datele de autentificare și
   redirecționează utilizatorul la pagina de login.

---

### `components/ProtectedRoute.tsx` — Garda paginilor

**Ce face:** Verifică dacă utilizatorul este logat înainte de a-i permite accesul la o pagină.

**Logică simplă:**
- Dacă utilizatorul **este** logat → afișează pagina cerută
- Dacă utilizatorul **nu este** logat → îl trimite la `/login`

Această componentă este aplicată pe paginile Dashboard și Tickets.

---

### `components/NavBar.tsx` — Bara de navigare

**Ce face:** Afișează bara orizontală de sus, prezentă pe toate paginile după login.

**Conține:**
- Logo-ul Nokia și numele aplicației (stânga)
- Butoane de navigare: **DASHBOARD** și **TICHETE** (centru)
- Numele utilizatorului logat și echipa sa (dreapta)
- Butonul de **LOGOUT** (dreapta)

**Funcții:**

| Funcție | Ce face |
|---|---|
| `navBtn(path, label)` | Creează un buton de navigare; butonul paginii curente are un stil activ (subliniat vizual) |
| `handleLogout()` | Apelează funcția de logout din AuthContext și redirecționează la pagina de login |

---

### `pages/Login.tsx` — Pagina de autentificare

**Ce face:** Afișează formularul de login prin care utilizatorul se identifică în aplicație.

**Vizual:**
- Fundal cu efecte decorative (sfere colorate violet și verde)
- Card central cu câmpurile USERNAME și PAROLĂ
- Buton de autentificare
- Mesaj de eroare dacă credențialele sunt greșite

**Stări interne:**

| Variabilă | Ce reprezintă |
|---|---|
| `username` | Textul scris în câmpul de username |
| `password` | Textul scris în câmpul de parolă |
| `error` | Mesajul de eroare afișat utilizatorului |
| `loading` | Dacă aplicația așteaptă răspunsul de la server (butonul devine inactiv) |

**Funcții:**

| Funcție | Ce face |
|---|---|
| `handleSubmit(e)` | Preia datele din formular, apelează `login()` din AuthContext; dacă reușește, navighează la `/dashboard`; dacă eșuează, afișează eroarea |

---

### `pages/Dashboard.tsx` — Pagina principală

**Ce face:** Afișează o privire de ansamblu asupra tichetelor — statistici și un tabel cu
ultimele 10 tichete.

**Secțiuni vizuale:**
1. **Carduri de statistici** — 4 cifre mari: Total tichete, Deschise, Finalizate, Critice
2. **Tabel recent** — primele 10 tichete cu butonul „TOATE →" care duce la pagina Tichete

**Stări interne:**

| Variabilă | Ce reprezintă |
|---|---|
| `tickets` | Lista de tichete primite de la server |
| `total` | Numărul total de tichete din baza de date |
| `loading` | Dacă datele se încarcă încă |

**Funcții ajutătoare:**

| Funcție | Ce face |
|---|---|
| `statusStyle(status)` | Returnează culorile pentru badge-ul de status (ex: Open = albastru, Closed = gri, Resolved = verde, Pending = galben) |
| `priorityColor(priority)` | Returnează culoarea pentru punctul de prioritate (ex: Critical = roșu, Low = verde) |
| `formatDate(dt)` | Transformă data din format tehnic în format românesc lizibil (ex: `21.05.2026`) |

**Cum funcționează la deschidere:**
1. Pagina se încarcă
2. Se face automat o cerere la server pentru primele 10 tichete
3. Se calculează statisticile din datele primite
4. Se afișează cardurile și tabelul

---

### `pages/Tickets.tsx` — Pagina completă de tichete

**Ce face:** Afișează **toate** tichetele cu funcționalități avansate: paginare, sortare și
export în format CSV.

**Funcționalități:**
- **Paginare** — navigare prin pagini (10 / 25 / 50 tichete per pagină)
- **Sortare** — după Data, Prioritate sau Status (crescător/descrescător)
- **Export CSV** — descarcă toate tichetele ca fișier Excel/CSV

**Stări interne:**

| Variabilă | Ce reprezintă |
|---|---|
| `data` | Datele primite de la server (tichete + info paginare) |
| `loading` | Dacă datele se încarcă |
| `error` | Mesaj de eroare dacă ceva nu funcționează |
| `exporting` | Dacă exportul CSV este în curs |
| `page` | Pagina curentă |
| `limit` | Câte tichete se afișează pe pagină |
| `sortBy` | Câmpul după care se sortează |
| `sortOrder` | Direcția sortării (asc = crescător, desc = descrescător) |

**Funcții:**

| Funcție | Ce face |
|---|---|
| `fetchTickets()` | Cere de la server tichetele pentru pagina și sortarea curentă |
| `handleSortBy(field)` | Schimbă câmpul de sortare; dacă se apasă același câmp, inversează direcția |
| `handleExport()` | Cere serverului fișierul CSV și îl descarcă automat în calculator |

**Componente interne (mini-componente):**

| Componentă | Ce face |
|---|---|
| `SortableTh` | Un antet de coloană pe care se poate da click pentru sortare; afișează o săgeată ↑ sau ↓ când coloana este activă |
| `PagBtn` | Un buton de paginare (Prima pagină «, Anterior ‹, Următor ›, Ultima pagină ») |

---

## Fluxul complet al unui utilizator

```
1. Utilizatorul deschide aplicația
        ↓
2. Este redirecționat la /login
        ↓
3. Completează username și parolă → apasă Autentificare
        ↓
4. Aplicația trimite datele la server și primește un token
        ↓
5. Utilizatorul este redirecționat la /dashboard
        ↓
6. Dashboard-ul încarcă automat ultimele 10 tichete și afișează statistici
        ↓
7. Utilizatorul poate naviga la /tickets pentru lista completă
        ↓
8. Pe pagina Tichete poate: schimba pagina, sorta coloanele, exporta CSV
        ↓
9. Utilizatorul apasă LOGOUT → este redirecționat la /login
```

---

## Cum comunică frontend-ul cu serverul

Toate cererile trec prin `api.ts`. Iată cele mai importante:

| Cerere | La ce foloseștte |
|---|---|
| `POST /auth/login` | Trimite username + parolă, primește token |
| `GET /auth/me` | Obține datele utilizatorului logat |
| `GET /tickets/` | Obține lista de tichete (cu paginare și sortare) |
| `GET /tickets/export` | Descarcă toate tichetele ca fișier CSV |

---

## Rezumat rapid

| Fișier | Rolul în două cuvinte |
|---|---|
| `main.tsx` | Pornire aplicație |
| `App.tsx` | Harta paginilor |
| `AuthContext.tsx` | Login / logout |
| `api.ts` | Comunicare server |
| `ProtectedRoute.tsx` | Gardă pagini |
| `NavBar.tsx` | Meniu navigare |
| `Login.tsx` | Formular autentificare |
| `Dashboard.tsx` | Statistici rapide |
| `Tickets.tsx` | Listă completă tichete |


---

<!-- ================= MODUL 2 (KPI Dashboard) ================= -->

# Documentație Frontend — Nokia KPI Dashboard & Ticket Visualizer

Această documentație explică, pe înțelesul oricui, cum este construit și cum funcționează partea vizuală (frontend-ul) a aplicației Nokia Ticket Visualizer.

---

## Ce este frontend-ul?

Frontend-ul este interfața cu care interacționează utilizatorul: ecranele, graficele, tabelele și filtrele. Rolul lui principal în această aplicație este să preia datele brute despre tichete dintr-o bază de date (prin intermediul unui server/backend) și să le transforme în grafice vizuale interactive și ușor de urmărit.

Tehnologiile folosite:

| Tehnologie | Rol |
| :--- | :--- |
| **React** | Construiește interfața vizuală din componente reutilizabile |
| **TypeScript** | Oferă siguranță codului prin definirea strictă a tipurilor de date (**KPI** și **Ticket**) |
| **Vite** | Unealtă modernă care pornește și construiește aplicația ultra-rapid |
| **Recharts** | Biblioteca folosită pentru generarea graficelor (bare, donut charts, etc.) |

## Structura fișierelor

Aplicația folosește o structură organizată pe foldere dedicate pentru fiecare pagină și componentă majoră (combinație de fișier `.tsx` și folder propriu):

```text
frontend/
└── src/
    ├── types/                              ← Definirea structurilor de date (TypeScript)
    │   ├── KPI.ts                          ← Structura datelor pentru indicatorii de performanță
    │   └── Ticket.ts                       ← Structura datelor pentru tichete
    │
    ├── pages/                              ← Paginile principale ale aplicației
    │   ├── Home/
    │   │   └── Home.tsx                    ← Pagina de bun venit (introducere / landing)
    │   └── Dashboard/
    │       └── Dashboard.tsx               ← Pagina principală de analiză și grafice
    │
    └── components/                         ← Elementele vizuale reutilizabile
        ├── header/
        │   └── Header.tsx                  │ Bara de sus (meniu / logo)
        ├── footer/
        │   └── Footer.tsx                  │ Bara de jos (copyright / link-uri utilitare)
        │
        ├── KPIFilterBar/
        │   └── KPIFilterBar.tsx            ← Bara cu filtre (selectare perioadă, echipe, statusuri)
        │
        ├── KPICollapsibleDrawer/
        │   └── KPICollapsibleDrawer.tsx    ← Panou retractabil
        │
        └── KPIDashBoard/                   ← Zona centrală de vizualizare (Grafice și Carduri)
            ├── KPIDashBoard.tsx            ← Containerul principal care adună toate graficele
            ├── KPICard/
            │   └── KPICard.tsx             ← Casetă cu cifre cheie (ex: Total Tichete, Timp răspuns)
            ├── KPIBarChart/
            │   └── KPIBarChart.tsx         ← Grafic cu bare (ex: Tichete per echipă / pe luni)
            └── KPIDonutChart/
                └── KPIDonutChart.tsx       ← Grafic circular (ex: Distribuția după status/prioritate)
```

## Descrierea fiecărui fișier

### Secțiunea `types/` — Siguranța datelor

În TypeScript, aceste fișiere nu generează butoane sau ecrane, ci sunt „contracte” care se asigură că aplicația folosește datele corect și nu apar erori din cauza unor câmpuri lipsă sau greșite din baza de date.

* **`KPI.ts`:** Definește structura indicatorilor de performanță (ex: numere, procente, medii de timp).
* **`Ticket.ts`:** Definește proprietățile exacte ale unui tichet extras din baza de date (ex: `id`, `title`, `priority`, `status`, `created_at`, `assigned_team`).

---

### Secțiunea `pages/` — Paginile aplicației

#### `Home.tsx` — Pagina de introducere
* **Ce face:** Este prima pagină pe care o vede utilizatorul.

#### `Dashboard.tsx` — Ecranul central de analiză
* **Ce face:** Este cea mai importantă pagină din aplicație. Se ocupă de starea globală a datelor: trimite cererile către baza de date, primește tichetele, aplică filtrele și pasează datele finale către componentele de grafice pentru a fi desenate pe ecran.

---

### Secțiunea `components/` — Elementele interfeței

#### `Header.tsx` & `Footer.tsx` — Cadranul aplicației
* **Header:** Bara orizontală superioară. Conține identitatea vizuală (Logo Nokia), titlul aplicației și butoanele de navigare între Home și Dashboard.
* **Footer:** Zona de subsol care închide elegant pagina, afișând detalii despre versiune sau drepturi de autor.

#### `KPIFilterBar.tsx` — Sistemul de filtrare
* **Ce face:** Permite utilizatorului să segmenteze datele. Conține elemente de selecție (dropdown-uri, selectoare de date sau bife) pentru a filtra tichetele (ex: afișează doar tichetele „Critice” sau doar pe cele ale echipei „Cloud”).
* **Cum funcționează:** Când utilizatorul schimbă un filtru, această componentă anunță `Dashboard.tsx`, care reîmprospătează automat graficele cu noile date selectate.

#### `KPICollapsibleDrawer.tsx` — Panou retractabil
* **Ce face:** Permite ascunderea graficelor pentru a reduce aglomerarea pe pagină.

---

### Sub-modulul `KPIDashBoard/` — Motorul grafic (Recharts)

Acest folder grupează tot ce ține de desenarea efectivă a indicatorilor vizuali.

#### `KPIDashBoard.tsx` — Organizatorul
Este „managerul” acestei zone. Primește setul complet de date filtrate și le împarte inteligent în pagină, așezând cardurile sus și graficele dedesubt într-o structură curată (grid).

#### `KPICard.tsx` — Cifrele de impact
Afișează mini-casete cu indicatori rapizi de performanță.
* *Exemplu:* Un card pentru „Tichete active”, unul pentru „Timp mediu de rezolvare” sau „Rata de succes”. Poate include o culoare de fundal specifică (ex: roșu dacă sunt prea multe tichete critice).

#### `KPIBarChart.tsx` — Graficul cu bare (Recharts)
Folosește librăria Recharts pentru a desena bare verticale sau orizontale. Este ideal pentru comparații de volum.
* *Exemplu:* Volumul de tichete rezolvate de Echipa A vs. Echipa B, sau numărul de tichete deschise în fiecare lună a anului.

#### `KPIDonutChart.tsx` — Graficul circular (Recharts)
Afișează datele sub formă de diagramă circulară (cu gaură în mijloc, tip gogoașă). Este ideal pentru a arăta proporții sau procente din total.
* *Exemplu:* Ce procent din totalul bazei de date sunt tichete cu statusul Open, Pending sau Closed.

---

## Fluxul complet al datelor (Cum funcționează aplicația)

```text
1. Utilizatorul intră pe aplicație (Home) și navighează la Dashboard
                          ↓
2. Dashboard-ul cere automat datele despre tichete de la server
                          ↓
3. Datele din baza de date ajung în frontend și sunt validate prin tipurile din Ticket.ts
                          ↓
4. Utilizatorul folosește "KPIFilterBar" (ex: selectează doar tichetele din luna curentă)
                          ↓
5. Datele sunt filtrate instant, iar Recharts redesenează automat:
    - KPICard (actualizează cifrele mari)
    - KPIBarChart (ajustează înălțimea barelor)
    - KPIDonutChart (recalculează feliile din cerc)
                          ↓
6. Dacă se dorește o analiză detaliată, se deschide "KPICollapsibleDrawer" pentru informații extra