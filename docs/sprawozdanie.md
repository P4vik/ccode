# Sprawozdanie z projektu — RuFlo Agent Dashboard

**Data:** 24 marca 2026
**Projekt:** `ccode` — REST API + sieć agentów AI z wizualizacją
**Repozytorium:** https://github.com/P4vik/ccode
**Autor:** bleki

---

## 1. Opis projektu

Projekt składa się z dwóch głównych części:

1. **REST API** — klasyczne API do zarządzania użytkownikami napisane w Node.js + Express
2. **Agent Dashboard** — wizualizacja sieci agentów AI w czasie rzeczywistym, integrująca dane z narzędzia ruflo v3

Całość działa jako lokalny serwer HTTP. Dashboard dostępny jest pod adresem `http://localhost:3010/dashboard.html`.

---

## 2. Technologie

| Warstwa | Technologia |
|---------|-------------|
| Backend | Node.js 18+, Express 4 |
| Testy | Jest, supertest |
| Wizualizacja | D3.js v7 (force-directed graph) |
| AI Orchestration | ruflo v3.5.42 CLI |
| Pamięć wektorowa | HNSW (ruflo memory DB) |
| Neural | MicroLoRA WASM (624k learn/s) |
| Przechowywanie | In-memory (brak bazy danych) |

---

## 3. Struktura plików

```
ccode/
├── src/
│   ├── app.js                  # Konfiguracja Express (bez listen)
│   ├── server.js               # Uruchomienie serwera HTTP na porcie z .env
│   ├── agents/
│   │   ├── store.js            # 56 symulowanych agentów, klastry, pary komunikacyjne
│   │   ├── simulator.js        # Generator zdarzeń (tick co 1.5s)
│   │   └── ruflo-bridge.js     # Pobieranie danych z CLI ruflo (execSync)
│   ├── routes/
│   │   └── users.js            # Endpointy REST API: GET/POST/DELETE /users
│   ├── middleware/
│   │   └── logger.js           # Logowanie requestów z timestampem i czasem odpowiedzi
│   ├── store/
│   │   └── users.js            # In-memory storage z auto-increment ID
│   └── public/
│       └── dashboard.html      # Dashboard z D3.js — cały frontend w jednym pliku
├── tests/
│   └── users.test.js           # 8 przypadków testowych (Jest + supertest)
├── docs/
│   └── sprawozdanie.md         # Ten dokument
├── .env                        # Klucze API i PORT (ignorowany przez git)
└── package.json
```

---

## 4. REST API — `/users`

### Endpointy

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/users` | Lista użytkowników z paginacją |
| `POST` | `/users` | Dodanie nowego użytkownika |
| `DELETE` | `/users/:id` | Usunięcie użytkownika po ID |

### Walidacja (POST /users)
- Pole `name` jest wymagane
- Pole `email` jest wymagane i musi mieć poprawny format (regex)
- Email musi być unikalny (konflikt → HTTP 409)

### Paginacja (GET /users)
- Query params: `?page=1&limit=10`
- Odpowiedź: `{ data, page, limit, total, totalPages }`

### Kody odpowiedzi
- `200` — sukces (GET)
- `201` — zasób utworzony (POST)
- `204` — zasób usunięty (DELETE)
- `400` — błąd walidacji
- `404` — nie znaleziono
- `409` — konflikt (duplikat emaila)

---

## 5. Dashboard agentów

### Co pokazuje

Dashboard wyświetla **graf sieci agentów AI** przy użyciu D3.js force simulation. Węzły reprezentują agentów, linie między węzłami — komunikację.

W sieci widoczne są:
- **56 symulowanych agentów** (8 klastrów: orchestrator, security, memory, performance, github, SPARC, consensus, ops)
- **Prawdziwe agenty ruflo** (pobierane z `npx ruflo@latest agent list` co 5 sekund)

### Wizualizacja statusów

Każdy węzeł posiada kolorowy pierścień, który zmienia się w zależności od aktualnego statusu agenta:

| Status | Kolor pierścienia | Rozmiar węzła |
|--------|-----------------|---------------|
| `communicating` | 🟠 Pomarańczowy | Powiększony |
| `thinking` | 🔵 Niebieski | Normalny |
| `working` | Kolor klastra | Powiększony |
| `done` | 🟢 Zielony | Normalny |
| `idle` | Przezroczysty | Normalny |

### Komunikacja w czasie rzeczywistym

Co 1.5 sekundy jeden losowy event jest generowany:
- **40% szans** — agent zmienia status lub zadanie
- **35% szans** — dwaj agenci "komunikują się" (migająca linia między węzłami)
- **25% szans** — agent zmienia aktywność

30% komunikacji pochodzi z par ruflo (cross-cluster lub wewnątrz klastra ruflo).

### Polling

Dashboard odpytuje endpoint `/api/agents` co 1.5 sekundy przez HTTP polling (nie WebSocket). Odpowiedź zawiera pełny snapshot stanu sieci.

---

## 6. Integracja z ruflo

ruflo to narzędzie CLI do orkiestracji agentów AI. W projekcie pełni rolę rzeczywistego orkiestratora swarm.

### Co jest prawdziwe (dane z ruflo CLI)
- Lista aktywnych agentów: `npx ruflo@latest agent list`
- Typy agentów (coder, reviewer, tester, architect, security-auditor itd.)
- Czas ostatniej aktywności

### Co jest symulowane
- Statusy w czasie rzeczywistym (CLI zwraca zawsze `idle` — aplikacja nadpisuje cyklicznymi statusami `working/thinking/communicating`)
- Komunikacja między agentami na grafie (losowa, nie odpowiada realnym wywołaniom LLM)
- Aktywność 56 symulowanych agentów

### Konfiguracja ruflo użyta w projekcie
```bash
npx ruflo@latest daemon start
npx ruflo@latest memory init
npx ruflo@latest hive-mind spawn --topology hierarchical --queen-model claude-sonnet-4-5
npx ruflo@latest neural train --pattern coordination --examples 50
```

---

## 7. Testy

### Uruchomienie
```bash
npm test
```

### Przypadki testowe (8 sztuk)

| # | Test | Oczekiwany wynik |
|---|------|-----------------|
| 1 | GET /users | HTTP 200, poprawna struktura paginacji |
| 2 | GET /users?page=2&limit=2 | Poprawna paginacja |
| 3 | POST /users — poprawne dane | HTTP 201, zwrócony użytkownik |
| 4 | POST /users — brak name | HTTP 400 |
| 5 | POST /users — błędny email | HTTP 400 |
| 6 | POST /users — duplikat emaila | HTTP 409 |
| 7 | DELETE /users/:id — istniejący | HTTP 204 |
| 8 | DELETE /users/9999 — nieistniejący | HTTP 404 |

---

## 8. Uruchomienie projektu

```bash
# 1. Instalacja zależności
npm install

# 2. Uruchomienie serwera
node src/server.js

# 3. Dashboard agentów
# Otwórz w przeglądarce:
http://localhost:3010/dashboard.html

# 4. REST API
http://localhost:3010/users

# 5. Testy
npm test
```

---

## 9. Bezpieczeństwo

- Klucz API Anthropic przechowywany wyłącznie w `.env` (ignorowany przez git)
- Walidacja wszystkich danych wejściowych na granicach systemu
- Middleware logger nie loguje treści requestów (tylko metoda, URL, status, czas)
- `execSync` w ruflo-bridge ograniczony do stałej komendy (brak user input)

---

## 10. Potencjalne rozszerzenia

1. **Walidacja Zod/Joi** — zastąpienie ręcznych ifów deklaratywnymi schematami
2. **Repository pattern** — oddzielenie logiki biznesowej od routerów Express
3. **Prawdziwy event stream** — zastąpienie symulatora prawdziwymi eventami z `ruflo session events`
4. **WebSocket** — zamiast HTTP pollingu dla niższego latency dashboardu
5. **Baza danych** — np. SQLite zamiast in-memory storage dla trwałości danych
