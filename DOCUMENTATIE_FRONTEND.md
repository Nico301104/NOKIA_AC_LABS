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