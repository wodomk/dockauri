# Dockauri

Panel webowy do zarządzania drukarkami 3D Elegoo z myślą o uruchamianiu w kontenerze LXC na Proxmoxie przez Dockera.

## O projekcie

Dockauri to otwartoźródłowy projekt, którego celem jest zbudowanie stabilnego panelu webowego do obsługi drukarek 3D Elegoo przez SDCP, WebSocket i JSON. Na obecnym etapie repozytorium zawiera już działający fundament: backend w Node.js + TypeScript z Fastify, SQLite, discovery SDCP i parserem statusów oraz frontend w React + Vite + TypeScript + Tailwind CSS.

## Wymagania

- Git
- Docker
- Docker Compose

## Instalacja

Instalacja polega na sklonowaniu repozytorium i uruchomieniu:

```bash
./install.sh
```

Cała dalsza konfiguracja będzie odbywać się w interfejsie webowym pod adresem wypisanym przez skrypt po zakończeniu procesu instalacyjnego.

## Aktualizacja

Aby zaktualizować projekt, uruchom:

```bash
./update.sh
```

Skrypt aktualizacyjny będzie docelowo pobierał najnowsze zmiany i restartował kontenery bez utraty danych trwałych.

## Konfiguracja

Konfiguracja aplikacji ma docelowo odbywać się z poziomu GUI. Już na tym etapie projekt zakłada, że ustawienia aplikacyjne trafią do tabeli `settings` w SQLite zamiast do plików konfiguracyjnych.

Aktualnie po stronie repozytorium działają następujące elementy bazowe:

- backendowy endpoint `/health`,
- zapis wykrytych drukarek do SQLite przez UDP discovery SDCP,
- connection manager WebSocket do drukarek z ujednoliconym `PrinterState`,
- ręczne dodawanie i usuwanie drukarek przez REST API,
- frontendowe widoki `/`, `/printers/:id` i `/settings` z live update przez WebSocket oraz historią wydruków w szczegółach drukarki,
- zapis interwału discovery do tabeli `settings`,
- trwały wolumen Dockera na plik bazy danych.

Uwagi infrastrukturalne:

- backend działa z `network_mode: host`, ponieważ discovery SDCP wymaga broadcastu UDP, który nie jest wiarygodny w domyślnej sieci bridge Dockera,
- to ustawienie zostało potwierdzone na docelowym LXC na Proxmoxie podczas discovery i odbioru danych z żywej drukarki.

Domyślne porty usług:

- `8080/tcp` - backend REST API, `/health` oraz kanał WebSocket dla frontendu, wystawione bezpośrednio przez hosta przez `network_mode: host`,
- `3000/udp` - discovery SDCP w sieci lokalnej, również wystawione bezpośrednio przez hosta,
- `4173/tcp` - frontend React uruchamiany przez Vite preview.

## Licencja

Projekt jest udostępniany na licencji PolyForm Noncommercial 1.0.0. W praktyce oznacza to, że kod pozostaje publicznie dostępny: można go czytać, forkować, modyfikować, używać do własnych niekomercyjnych celów i wysyłać poprawki przez pull requesty. Natomiast wykorzystanie tego kodu w produkcie albo usłudze, z której ktoś czerpie zysk, wymaga osobnej zgody autorów projektu. Pełny tekst licencji: https://polyformproject.org/licenses/noncommercial/1.0.0/ oraz plik `LICENSE`.
