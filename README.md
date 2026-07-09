# Dockauri

Panel webowy do zarządzania drukarkami 3D Elegoo z myślą o uruchamianiu w kontenerze LXC na Proxmoxie przez Dockera.

## O projekcie

Dockauri to otwartoźródłowy projekt, którego celem jest zbudowanie stabilnego panelu webowego do obsługi drukarek 3D Elegoo przez SDCP, WebSocket i JSON. Na tym etapie repozytorium zawiera jedynie szkielet projektu, dokumentację organizacyjną i podstawowe pliki startowe dla kolejnych etapów prac.

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

Konfiguracja aplikacji ma docelowo odbywać się z poziomu GUI. Na obecnym etapie repozytorium nie zawiera jeszcze gotowego panelu ani aktywnej konfiguracji runtime.

## Licencja

Projekt jest udostępniany na licencji MIT. Szczegóły znajdują się w pliku `LICENSE`.
