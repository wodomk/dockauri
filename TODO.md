# TODO

**Rdzeń (MVP)**
- [ ] Discovery drukarek przez UDP broadcast przy starcie usługi - działa broadcast `M99999` na `3000/udp`, zapis nowych drukarek do SQLite i aktualizacja `last_known_ip` / `last_seen_at`; do domknięcia zostaje walidacja `network_mode: host` na docelowym LXC
- [x] Discovery cykliczne w tle, aktualizacja adresów IP po MainboardID
- [x] Dodawanie drukarki ręcznie po adresie IP (z poziomu GUI)
- [x] Connection manager - jedno długożyjące połączenie WebSocket per drukarka, reconnect z backoffem
- [x] Rejestr drukarek w bazie danych (SQLite)
- [x] Endpoint i strona `/health` z pełnym testem startowym

**Panel / GUI**
- [ ] Widok kart wszystkich drukarek (styl Bambu Handy) - działa funkcjonalny grid z live statusem; docelowy design bambulabowy czeka na osobny prompt
- [ ] Widok szczegółowy pojedynczej drukarki
- [ ] Podgląd kamery na żywo (proxy MJPEG)
- [ ] Wykresy temperatur w czasie rzeczywistym (dysza, stół, komora)
- [ ] Przełącznik jasny / ciemny motyw
- [ ] Responsywność mobile + desktop
- [ ] Ekran ustawień - discovery, autentykacja, wygląd, drukarki - sekcje discovery i drukarki działają, autentykacja i wygląd pozostają placeholderami do osobnych promptów

**Autentykacja**
- [ ] Tryb bez logowania (domyślny)
- [ ] Tryb login/hasło włączany z poziomu Settings, hasła haszowane w bazie

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
- [ ] Zweryfikować `network_mode: host` dla backendu w docelowym LXC na Proxmoxie i potwierdzić broadcast SDCP w realnej sieci
- [ ] Dopracować zapis historii wydruków tak, aby restart backendu i ponowne połączenie nie tworzyły fałszywych wpisów terminalnych
- [ ] Zaimplementować logikę sekcji „Autentykacja” po osobnym prompcie
- [ ] Zaimplementować logikę sekcji „Wygląd” po osobnym prompcie
