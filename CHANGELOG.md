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

### Changed

- `GROUND_RULES.md` rozszerzono o obowiązek aktualizacji `README.md`, gdy jego treść przestaje być zgodna ze stanem repozytorium
- `GROUND_RULES.md` rozszerzono o jednoznacznie zapisany stack technologiczny projektu
- `README.md` zaktualizowano o bieżący stack, działające elementy i porty usług
- `GROUND_RULES.md` zmieniono tak, aby `git push` był obowiązkowym, automatycznym końcem każdej sesji
- `docker-compose.yml` zmieniono tak, aby backend korzystał z `network_mode: host` ze względu na broadcast UDP SDCP
