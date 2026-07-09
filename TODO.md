# TODO

**Rdzeń (MVP)**
- [ ] Discovery drukarek przez UDP broadcast przy starcie usługi
- [ ] Discovery cykliczne w tle, aktualizacja adresów IP po MainboardID
- [ ] Dodawanie drukarki ręcznie po adresie IP (z poziomu GUI)
- [ ] Connection manager - jedno długożyjące połączenie WebSocket per drukarka, reconnect z backoffem
- [ ] Rejestr drukarek w bazie danych (SQLite)
- [ ] Endpoint i strona `/health` z pełnym testem startowym

**Panel / GUI**
- [ ] Widok kart wszystkich drukarek (styl Bambu Handy)
- [ ] Widok szczegółowy pojedynczej drukarki
- [ ] Podgląd kamery na żywo (proxy MJPEG)
- [ ] Wykresy temperatur w czasie rzeczywistym (dysza, stół, komora)
- [ ] Przełącznik jasny / ciemny motyw
- [ ] Responsywność mobile + desktop
- [ ] Ekran ustawień - discovery, autentykacja, wygląd, drukarki

**Autentykacja**
- [ ] Tryb bez logowania (domyślny)
- [ ] Tryb login/hasło włączany z poziomu Settings, hasła haszowane w bazie

**Historia i dane**
- [ ] Pełna, bezterminowa historia wydruków w bazie danych
- [ ] Widok historii w GUI

**Backlog odłożony (nie na MVP)**
- [ ] Endpoint pod powiadomienia o zakończeniu/błędzie wydruku (np. integracja z Telegramem)
- [ ] Podgląd 3D plików G-code w GUI (decyzja o przechowywaniu plików na serwerze zależy od tego punktu)
- [ ] Integracja z Cloudflare Access do zdalnego dostępu
- [ ] Obsługa wielu użytkowników / współdzielenie widoku
- [ ] Sterowanie drukarką (start / pauza / stop / ruchy osi) z poziomu GUI
