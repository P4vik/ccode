# Users API

REST API zbudowane w Node.js + Express z in-memory storage. Projekt demonstracyjny z paginacją, walidacją danych, error handlingiem i logowaniem requestów.

## Tech stack

| Warstwa | Technologia |
|---------|-------------|
| Runtime | Node.js (CommonJS) |
| Framework | Express 4.x |
| Storage | In-memory (tablica JS) |
| Testy | Jest + supertest |

---

## Instalacja i uruchomienie

```bash
# 1. Wejdź do katalogu projektu
cd ccode

# 2. Zainstaluj zależności
npm install

# 3. Uruchom serwer (domyślnie port 3000)
npm start

# Opcjonalnie — inny port
PORT=8080 npm start
```

---

## Uruchamianie testów

```bash
npm test
```

Wynik: 11 przypadków testowych pokrywających wszystkie endpointy.

---

## Endpointy

### GET /users

Pobiera paginowaną listę użytkowników.

**Query params:**

| Parametr | Typ | Domyślnie | Opis |
|----------|-----|-----------|------|
| `page`   | int | 1         | Numer strony (≥ 1) |
| `limit`  | int | 10        | Elementów na stronę (1–100) |

**Przykład:**
```bash
curl http://localhost:3000/users
curl http://localhost:3000/users?page=2&limit=5
```

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Anna Kowalska",
      "email": "anna@example.com",
      "createdAt": "2026-01-10T08:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 3,
  "totalPages": 1
}
```

---

### POST /users

Dodaje nowego użytkownika.

**Body (JSON):**

| Pole    | Typ    | Wymagane | Opis |
|---------|--------|----------|------|
| `name`  | string | tak      | Imię i nazwisko |
| `email` | string | tak      | Poprawny adres e-mail (unikatowy) |

**Przykład:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Piotr Zielony", "email": "piotr@example.com"}'
```

**Response 201:**
```json
{
  "id": 4,
  "name": "Piotr Zielony",
  "email": "piotr@example.com",
  "createdAt": "2026-03-23T10:00:00.000Z"
}
```

**Response 400 (błąd walidacji):**
```json
{
  "error": "Błąd walidacji.",
  "details": [
    "Pole \"name\" jest wymagane i nie może być puste.",
    "Pole \"email\" musi być poprawnym adresem e-mail."
  ]
}
```

**Response 409 (duplikat e-mail):**
```json
{
  "error": "Użytkownik z e-mailem \"piotr@example.com\" już istnieje."
}
```

---

### DELETE /users/:id

Usuwa użytkownika o podanym ID.

**Przykład:**
```bash
curl -X DELETE http://localhost:3000/users/1
```

**Response 204:** *(brak body)*

**Response 404:**
```json
{
  "error": "Użytkownik o ID 999 nie istnieje."
}
```

---

## Struktura projektu

```
ccode/
├── package.json
├── src/
│   ├── app.js                # Konfiguracja Express (middleware + routes)
│   ├── server.js             # Punkt wejścia — .listen()
│   ├── routes/
│   │   └── users.js          # GET, POST, DELETE /users
│   ├── middleware/
│   │   └── logger.js         # Middleware logujący requesty
│   └── store/
│       └── users.js          # In-memory storage + logika CRUD
└── tests/
    └── users.test.js         # Testy Jest + supertest
```

---

## Propozycje ulepszeń

### 1. Walidacja Joi / Zod
Zastąpienie ręcznych instrukcji `if` deklaratywnym schematem:
```js
// Zamiast 10 linii ifów:
const schema = z.object({
  name:  z.string().min(1),
  email: z.string().email(),
});
const result = schema.safeParse(req.body);
```
**Korzyść:** Mniej kodu, łatwiejsze rozszerzanie, automatyczne komunikaty błędów.

### 2. Repository pattern
Wydzielenie warstwy dostępu do danych za interfejsem:
```
routes/users.js  →  services/userService.js  →  repositories/userRepository.js
```
**Korzyść:** Zamiana in-memory na bazę danych (np. PostgreSQL) wymaga zmiany tylko w repozytorium, bez dotykania routerów i serwisów.

### 3. Strukturalny logger (Winston / Pino)
Zastąpienie `console.log` loggerem z poziomami i formatem JSON:
```js
logger.info({ method: 'GET', path: '/users', status: 200, ms: 5 });
```
**Korzyść:** Logi łatwe do parsowania przez systemy monitorowania (ELK, Datadog, Grafana Loki). Konfigurowalny poziom logowania w zależności od środowiska.
