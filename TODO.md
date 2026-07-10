# TODO

**Rdzeń (MVP)**
- [x] Discovery drukarek przez UDP broadcast przy starcie usługi - broadcast `M99999` na `3000/udp`, zapis nowych drukarek do SQLite i aktualizacja `last_known_ip` / `last_seen_at` potwierdzone na realnym LXC z żywą drukarką
- [x] Discovery cykliczne w tle, aktualizacja adresów IP po MainboardID
- [x] Dodawanie drukarki ręcznie po adresie IP (z poziomu GUI)
- [x] Connection manager - jedno długożyjące połączenie WebSocket per drukarka, reconnect z backoffem
- [x] Rejestr drukarek w bazie danych (SQLite)
- [x] Endpoint i strona `/health` z pełnym testem startowym

**Panel / GUI**
- [ ] Widok kart wszystkich drukarek (styl Bambu Handy) - funkcjonalny grid z live statusem potwierdzono na żywych danych z prawdziwej drukarki; docelowy design bambulabowy czeka na osobny prompt
- [x] Widok szczegółowy pojedynczej drukarki
- [x] Podgląd kamery na żywo (proxy MJPEG)
- [ ] Wykresy temperatur w czasie rzeczywistym (dysza, stół, komora)
- [x] Przełącznik jasny / ciemny motyw
- [ ] Responsywność mobile + desktop
- [ ] Ekran ustawień - discovery, autentykacja, wygląd, drukarki - sekcje discovery, drukarki i wybór motywu działają, autentykacja pozostaje do osobnego promptu

**Autentykacja**
- [ ] Tryb bez logowania (domyślny)
- [ ] Tryb login/hasło włączany z poziomu Settings, hasła haszowane w bazie
- [ ] Wraz z wdrożeniem autentykacji z GUI zawęzić konfigurację CORS do dozwolonych originów i powiązać ją z wybranym trybem dostępu

**Historia i dane**
- [ ] Pełna, bezterminowa historia wydruków w bazie danych - działa podstawowy zapis migawek przy przejściu w stan terminalny; wymaga dalszego dopracowania logiki deduplikacji i korelacji z zadaniami wydruku
- [ ] Widok historii w GUI

**Backlog odłożony (nie na MVP)**
- [ ] Endpoint pod powiadomienia o zakończeniu/błędzie wydruku (np. integracja z Telegramem)
- [ ] Podgląd 3D plików G-code w GUI (decyzja o przechowywaniu plików na serwerze zależy od tego punktu)
- [ ] Integracja z Cloudflare Access do zdalnego dostępu
- [ ] Obsługa wielu użytkowników / współdzielenie widoku
- [ ] Sterowanie drukarką (start / pauza / stop / ruchy osi) z poziomu GUI

**Nowe zadania techniczne**
- [x] Wygenerować i commitować prawdziwe `package-lock.json` dla backendu i frontendu oraz zmienić oba Dockerfile z `npm install` na `npm ci` - wykonane bezpośrednio w środowisku wdrożeniowym z Dockerem na CT i zsynchronizowane z głównym repozytorium
- [x] Zweryfikować `network_mode: host` dla backendu w docelowym LXC na Proxmoxie i potwierdzić broadcast SDCP w realnej sieci - potwierdzone z żywą drukarką
- [ ] Dopracować zapis historii wydruków tak, aby restart backendu i ponowne połączenie nie tworzyły fałszywych wpisów terminalnych
- [ ] Zaimplementować logikę sekcji „Autentykacja” po osobnym prompcie
- [ ] Dopracować docelowy design i ergonomię sekcji „Wygląd” w osobnym prompcie
