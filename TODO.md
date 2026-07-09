# TODO

**Rdzeń (MVP)**
- [ ] Discovery drukarek przez UDP broadcast przy starcie usługi - działa broadcast `M99999` na `3000/udp`, zapis nowych drukarek do SQLite i aktualizacja `last_known_ip` / `last_seen_at`; do dopracowania obsługa środowisk sieciowych Dockera i testy na docelowej instalacji
- [ ] Discovery cykliczne w tle, aktualizacja adresów IP po MainboardID - działa domyślny interwał w kodzie; do zrobienia przeniesienie interwału do ustawień GUI i tabeli `settings`
- [ ] Dodawanie drukarki ręcznie po adresie IP (z poziomu GUI)
- [ ] Connection manager - jedno długożyjące połączenie WebSocket per drukarka, reconnect z backoffem - działa nawiązywanie połączeń, reconnect i emitowanie surowych ramek; brakuje parsera pełnego statusu drukarki
- [x] Rejestr drukarek w bazie danych (SQLite)
- [x] Endpoint i strona `/health` z pełnym testem startowym

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

**Nowe zadania techniczne**
- [ ] Przenieść interwał discovery z wartości domyślnej w kodzie do ustawień GUI zapisywanych w tabeli `settings`
- [ ] Zweryfikować docelowy model sieci Dockera dla broadcastu SDCP w LXC na Proxmoxie
