# Dockauri Ground Rules

1. Wszystkie pliki w tym repozytorium muszą być zawsze zapisywane jako UTF-8 bez BOM, ponieważ spójne kodowanie zapobiega uszkodzonym polskim znakom, błędnym diffom i trudnym do diagnozowania problemom narzędziowym.
2. Konfiguracja użytkownika nie może być trzymana w plikach, ponieważ wszystko, co użytkownik może chcieć kiedyś zmienić, takie jak adresy IP drukarek, tryb autentykacji, hasła, ustawienia powiadomień czy wygląd, musi być konfigurowalne z poziomu GUI i zapisywane w bazie danych; pliki takie jak `.env` lub `config.yaml` mogą istnieć wyłącznie dla ustawień infrastrukturalnych ustalanych jednorazowo przy instalacji, na przykład portu nasłuchu kontenera.
3. Każda zmiana musi dać się uruchomić i przetestować wyłącznie przez Docker, ponieważ projekt zakłada środowisko kontenerowe uruchamiane przez `docker compose up` i nie może zależeć od lokalnej instalacji Node.js ani Pythona poza kontenerami.
4. Backend musi posiadać self-test przy starcie oraz wewnętrzny watchdog podczas działania, ponieważ aplikacja ma sprawdzać dostępność bazy danych, gotowość portów i próbę komunikacji z zarejestrowanymi drukarkami, wystawiać wynik pod `/health`, a w czasie pracy nadzorować reconnect połączeń WebSocket, logowanie awarii i próby ponownego połączenia.
5. Każda sesja robocza musi kończyć się dokładnie w tej kolejności: najpierw aktualizacją `CHANGELOG.md` zgodnie z konwencją Keep a Changelog z sekcjami Added, Changed, Fixed i Removed pod odpowiednim nagłówkiem z datą, równolegle z weryfikacją `README.md` i jego aktualizacją w tym samym commicie wtedy, gdy opis instalacji, wymagań, dostępnych funkcji albo struktury projektu przestaje być zgodny ze stanem repozytorium, następnie aktualizacją `TODO.md` przez odznaczenie wykonanych punktów i dopisanie nowych zadań, a na końcu wykonaniem `git add .`, opisowego `git commit` i `git push`, ponieważ tylko taka kolejność utrzymuje spójność historii zmian, dokumentacji, backlogu i stanu repozytorium.
6. `TODO.md` jest jedynym źródłem prawdy o backlogu, ponieważ żadna funkcjonalność nie może być dodawana przy okazji bez wcześniejszego wpisu w tym pliku, a każdy prompt roboczy musi odnosić się do konkretnego, ponumerowanego punktu z backlogu.
7. Duże, istniejące pliki frontendowe nie mogą być nigdy przepisywane strukturalnie w całości, ponieważ zmiany mają być wprowadzane punktowo, aby ograniczać ryzyko uszkodzenia kodowania znaków albo działającego kodu interfejsu.

## Stack technologiczny

- Backend: Node.js + TypeScript.
- Frontend: React + Vite + TypeScript + Tailwind CSS.
- Baza danych: SQLite przez `better-sqlite3`, z plikiem bazy przechowywanym w trwałym wolumenie Dockera zdefiniowanym w `docker-compose.yml`.
- Komunikacja backend-frontend: REST API oraz osobny kanał WebSocket do aktualizacji stanu aplikacji.
- Menedżer pakietów: npm; na obecnym etapie root `package.json` dokumentuje świadomą rezygnację z npm workspaces, ponieważ backend i frontend budują się niezależnie w osobnych kontekstach Dockera i nie istnieje jeszcze współdzielony pakiet typów, który uzasadniałby dodatkową złożoność.
