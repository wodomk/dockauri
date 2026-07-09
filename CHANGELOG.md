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

### Changed

- `GROUND_RULES.md` rozszerzono o obowiązek aktualizacji `README.md`, gdy jego treść przestaje być zgodna ze stanem repozytorium
- `GROUND_RULES.md` rozszerzono o jednoznacznie zapisany stack technologiczny projektu
- `README.md` zaktualizowano o bieżący stack, działające elementy i porty usług
