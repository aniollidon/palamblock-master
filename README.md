## PalamBlock - PalamMaster

[![Última release](https://img.shields.io/github/v/release/aniollidon/palamblock-master?include_prereleases&sort=semver&color=blue)](https://github.com/aniollidon/palamblock-master/releases/latest)

---

### Còpies de les captures de grup

Al visor de captures d'un grup, selecciona una sessió i prem **Descarregar**.
La còpia `.pb.zip` conté les captures i les metadades de la sessió seleccionada,
no altres captures de les sessions individuals. Es requereix una versió de
palamSRV amb suport d'exportació i permisos per al grup. Si la sessió ha canviat,
actualitza el desplegable abans de tornar-ho a provar.
El nom proposat inclou el grup i el dia d'inici de la sessió en hora local:
`captures-grup-AAAA-MM-DD.pb.zip`. Es pot modificar abans de desar-lo.

Per obrir una còpia, selecciona **Obrir una còpia local...** al desplegable o
arrossega el fitxer al visor de captures. Cal estar connectat i autenticat en
obrir-lo. Les còpies obertes es recorden fins a tancar sessió o l'aplicació;
el fitxer original no es modifica. Si el grup existeix al servidor actual,
se selecciona; si no existeix, la còpia s'obre en context històric.

Els fitxers no estan xifrats i poden contenir dades personals i imatges dels
alumnes: cal conservar-los en un lloc adequat. L'obertura valida el contingut
sense extreure les imatges a disc. Els límits són 50.000 captures, 16 MiB per
imatge i 50 GiB per al ZIP i per al contingut descomprimit. La preparació,
descàrrega i validació mostren el progrés i es poden cancel·lar.

### Descarrega l'última versió

#### Instal·ladors

[![Windows Setup](https://img.shields.io/badge/Windows-Instal·lador-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/aniollidon/palamblock-master/releases/latest/download/PalamBlock-Setup.exe)
[![Windows Portable](https://img.shields.io/badge/Windows-Portable-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/aniollidon/palamblock-master/releases/latest/download/PalamBlock-Portable.exe)

[![macOS DMG](https://img.shields.io/badge/macOS-DMG-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/aniollidon/palamblock-master/releases/latest/download/PalamBlock.dmg)

[![Linux AppImage](https://img.shields.io/badge/Linux-AppImage-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/aniollidon/palamblock-master/releases/latest/download/PalamBlock-x64.AppImage)
[![Ubuntu/Debian](https://img.shields.io/badge/Ubuntu/Debian-DEB-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)](https://github.com/aniollidon/palamblock-master/releases/latest/download/palamblock_amd64.deb)

#### Instal·lació ràpida

**Ubuntu/Debian:**

```bash
wget https://github.com/aniollidon/palamblock-master/releases/latest/download/palamblock_amd64.deb
sudo dpkg -i palamblock_amd64.deb
```

**AppImage (qualsevol distribució Linux):**

```bash
wget https://github.com/aniollidon/palamblock-master/releases/latest/download/PalamBlock-x64.AppImage
chmod +x PalamBlock-x64.AppImage
./PalamBlock-x64.AppImage
```

---
