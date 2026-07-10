# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Inicjalizacja repozytorium projektu Dockauri
- Root `package.json` z decyzją o niewłączaniu npm workspaces na tym etapie
- Szkielet backendu Node.js + TypeScript z Fastify, SQLite, SDCP discovery i `/health`
- Szkielet frontendu React + Vite + TypeScript + Tailwind CSS z routingiem `/` i `/settings`
- Dockerfile dla backendu i frontendu oraz realne build contexty w `docker-compose.yml`
- Parser statusów SDCP i ujednolicony model `PrinterState` dla backendu i frontendu
- Endpointy REST do ręcznego dodawania, usuwania i listowania drukarek oraz do zapisu ustawień discovery
- Frontendowe karty drukarek z live update przez WebSocket i formularzem ręcznego dodawania drukarki
- Sekcja ustawień discovery z zapisem do SQLite oraz lista drukarek z możliwością usuwania
- Logika motywu `light` / `dark` / `system` z zapisem w `settings` oraz szybkim przełącznikiem w nagłówku

### Changed

- `GROUND_RULES.md` rozszerzono o obowiązek aktualizacji `README.md`, gdy jego treść przestaje być zgodna ze stanem repozytorium
- `GROUND_RULES.md` rozszerzono o jednoznacznie zapisany stack technologiczny projektu
- `README.md` zaktualizowano o bieżący stack, działające elementy i porty usług
- `GROUND_RULES.md` zmieniono tak, aby `git push` był obowiązkowym, automatycznym końcem każdej sesji
- `docker-compose.yml` zmieniono tak, aby backend korzystał z `network_mode: host` ze względu na broadcast UDP SDCP
- Licencję projektu zmieniono z MIT na PolyForm Noncommercial 1.0.0
- Sekcję „Wygląd” w ustawieniach podłączono do realnego przełącznika motywu zamiast placeholdera

### Fixed

- Zapytania REST z frontendu na porcie 4173 do backendu na porcie 8080 otrzymują poprawne nagłówki CORS
- Postęp wydruku jest wyliczany z pól czasowych SDCP `CurrentTicks` i `TotalTicks`, z proporcją warstw wyłącznie jako fallbackiem
- Własny broadcast discovery `M99999` jest odfiltrowywany przed próbą parsowania JSON i nie generuje fałszywych ostrzeżeń
