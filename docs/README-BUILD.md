# PalamMaster - Guia de Build i Publicació

### Executar en mode desenvolupament

```bash
npm run dev
```

### Executar en mode producció (local)

```bash
npm start
```

### Build per a la plataforma actual

```bash
npm run build
```

Els fitxers compilats es crearan a `dist/`

Pista: Errors Windows 11-> Configuració → Privadesa i seguretat → Per a desenvolupadors -> Activa "Mode de desenvolupador"

### Build per plataforma específica

```bash
# Windows
npm run build-win

# Linux
npm run build-linux

# macOS
npm run build-mac
```

## Publicar actualitzacions a GitHub

### Configuració inicial (només una vegada)

#### 1. Crear Personal Access Token a GitHub

1. Ves a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Dona-li un nom: `PalamBlock Build Token`
4. Selecciona scopes:
   - ✅ `repo` (tots els sub-permisos)
   - ✅ `write:packages`
5. Copia el token generat

#### 2. Configurar token localment

**Windows PowerShell:**

```powershell
# Temporal (només per la sessió actual)
$env:GH_TOKEN = "el_teu_token_aqui"

# Permanent (per totes les sessions)
[System.Environment]::SetEnvironmentVariable('GH_TOKEN', 'el_teu_token_aqui', 'User')
```

**Linux/macOS:**

```bash
# Afegeix al final del fitxer ~/.bashrc o ~/.zshrc
export GH_TOKEN="el_teu_token_aqui"

# Recarrega la configuració
source ~/.bashrc  # o ~/.zshrc
```

### Versionat

Abans de publicar, actualitza la versió al `package.json`:

```json
{
  "version": "1.0.1" // Incrementa segons Semantic Versioning
}
```

**Semantic Versioning:**

- `1.0.0` → `1.0.1` - Patch (correccions de bugs)
- `1.0.0` → `1.1.0` - Minor (noves funcionalitats compatibles)
- `1.0.0` → `2.0.0` - Major (canvis incompatibles)

### Publicar via tag de Git

```bash
# 1. Assegura't que tens tots els canvis commitejats
git add .
git commit -m "Release v1.0.1"

# 2. Crea un tag amb la versió
git tag v1.0.1

# 3. Puja el tag a GitHub
git push origin v1.0.1

# 4. GitHub Actions automàticament crearà la release
```

### Publicar manualment

```bash
# Publica per a totes les plataformes
npm run publish

# O per plataforma específica
npm run publish-win
npm run publish-linux
npm run publish-mac
```

## 🔄 Sistema d'actualitzacions automàtiques

### Com funciona

1. L'aplicació comprova actualitzacions en iniciar (després de 3 segons)
2. Si hi ha actualització disponible, la descarrega en segon pla
3. Quan finalitza, mostra un diàleg a l'usuari
4. L'usuari pot instal·lar ara o més tard
5. En instal·lar, l'aplicació es tanca, s'actualitza i es torna a obrir

### Configuració

Al `package.json`, la secció `build.publish` està configurada per GitHub:

```json
"publish": {
  "provider": "github",
  "owner": "aniollidon",
  "repo": "PalamBlock",
  "releaseType": "release"
}
```

### Error: "GH_TOKEN not found"

Assegura't que has configurat la variable d'entorn `GH_TOKEN`.

### L'auto-updater no funciona en desenvolupament

És normal. L'auto-updater només funciona en builds compilats i signats.

### No es pot pujar a GitHub

Verifica que:

- El token té permisos `repo`
- El repositori existeix i tens accés
- La versió al `package.json` no existeix ja com release

## 📚 Recursos

- [Electron Builder](https://www.electron.build/)
- [Electron Updater](https://www.electron.build/auto-update)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- [Semantic Versioning](https://semver.org/)
