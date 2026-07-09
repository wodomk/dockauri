# Dockauri

Panel webowy do zarządzania drukarkami 3D Elegoo z myślą o uruchamianiu w kontenerze LXC na Proxmoxie przez Dockera.

## O projekcie

Dockauri to otwartoźródłowy projekt, którego celem jest zbudowanie stabilnego panelu webowego do obsługi drukarek 3D Elegoo przez SDCP, WebSocket i JSON. Na obecnym etapie repozytorium zawiera już bazowy stack aplikacji: backend w Node.js + TypeScript z Fastify, SQLite i szkieletem komunikacji SDCP oraz frontend w React + Vite + TypeScript + Tailwind CSS.

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
- szkielet connection managera WebSocket do drukarek,
- frontendowe trasy `/` i `/settings`,
- trwały wolumen Dockera na plik bazy danych.

Domyślne porty kontenerów:

- `8080/tcp` - backend REST API, `/health` oraz kanał WebSocket dla frontendu,
- `3000/udp` - discovery SDCP w sieci lokalnej,
- `4173/tcp` - frontend React uruchamiany przez Vite preview.

## Licencja

Projekt jest udostępniany na licencji MIT. Szczegóły znajdują się w pliku `LICENSE`.
