# Configuració de Secrets per GitHub Actions

Aquest document explica com configurar els secrets necessaris per poder publicar builds automàticament via GitHub Actions.

## 🔐 Secrets necessaris

### GITHUB_TOKEN (Automàtic)

Aquest token es genera automàticament per GitHub Actions. **No cal configurar-lo manualment**.

Té permisos per:

- Crear releases
- Pujar assets a releases
- Llegir el repositori

## ⚙️ Configuració del repositori GitHub

### 1. Habilitar GitHub Actions

1. Ves al repositori: https://github.com/aniollidon/palamblock-master
2. Settings → Actions → General
3. Assegura't que "Allow all actions and reusable workflows" està seleccionat
4. A "Workflow permissions", selecciona "Read and write permissions"
5. Marca ✅ "Allow GitHub Actions to create and approve pull requests"
6. Clica "Save"

### 2. Verificar permisos del GITHUB_TOKEN

El fitxer de workflow ja té configurats els permisos necessaris:

```yaml
permissions:
  contents: write # Per crear releases i pujar fitxers
  packages: write # Per publicar packages
```

## 🚀 Com activar el build automàtic

El workflow s'activa automàticament quan:

### 1. Fas push d'un tag amb el format `v*.*.*`

```bash
# Exemple: versió 1.0.0
git tag v1.0.0
git push origin v1.0.0
```

Això compilarà l'aplicació per Windows, Linux i macOS i crearà una release a GitHub.

### 2. Fas push a la branca master amb canvis a `palamMaster/`

```bash
git add palamMaster/
git commit -m "Actualització PalamMaster"
git push origin master
```

Això compilarà l'aplicació però NO crearà una release (només artifacts).

### 3. Execució manual

1. Ves a: https://github.com/aniollidon/palamblock-master/actions
2. Selecciona "Build PalamMaster"
3. Clica "Run workflow"
4. Selecciona la branca
5. Opcionalment, introdueix una versió
6. Clica "Run workflow"

## 📦 Resultats del build

### Artifacts (builds temporals)

Si el build s'executa sense tag (push normal o manual), els fitxers compilats es guarden com a artifacts:

1. Ves a: https://github.com/aniollidon/palamblock-master/actions
2. Clica a la execució del workflow
3. Baixa els artifacts:
   - `palammaster-windows` (exe)
   - `palammaster-linux` (AppImage, deb)
   - `palammaster-macos` (dmg, zip)

Els artifacts s'eliminen automàticament després de 90 dies.

### Releases (publicacions oficials)

Si el build s'executa amb un tag `v*.*.*`, es crea una release automàticament:

1. Ves a: https://github.com/aniollidon/palamblock-master/releases
2. La nova release contindrà:
   - Fitxers executables per Windows (.exe)
   - Fitxers per Linux (.AppImage, .deb)
   - Fitxers per macOS (.dmg, .zip)
   - Fitxers de metadades (.yml) per auto-updater
   - Release notes generades automàticament

## 🔄 Auto-updater

Perquè l'auto-updater funcioni correctament:

1. **Publica sempre amb tags de versió**
2. **Les versions han de seguir Semantic Versioning** (x.y.z)
3. **Els fitxers .yml són essencials** (es generen automàticament)
4. **Les releases han de ser públiques** (no drafts)

## 🛠️ Troubleshooting

### Error: "Resource not accessible by integration"

**Solució:**

1. Settings → Actions → General
2. Workflow permissions → "Read and write permissions"
3. Marca "Allow GitHub Actions to create and approve pull requests"

### Error: "Tag already exists"

**Solució:**

```bash
# Elimina el tag local i remot
git tag -d v1.0.0
git push --delete origin v1.0.0

# Crea'l de nou amb la versió correcta
git tag v1.0.1
git push origin v1.0.1
```

### El workflow no s'executa

**Verifica:**

1. Que el fitxer està a `.github/workflows/build-palammaster.yml`
2. Que el tag segueix el format `v*.*.*`
3. Que hi ha canvis a la carpeta `palamMaster/`

### Build falla a macOS

És normal si no tens icona `.icns`. Pots:

1. Generar la icona (veure ICONS.md)
2. O temporalment comentar el build de macOS al workflow

## 📝 Checklist pre-release

Abans de crear una release oficial:

- [ ] Actualitzar versió a `palamMaster/package.json`
- [ ] Provar l'aplicació localment (`npm run dev`)
- [ ] Crear icones per totes les plataformes (veure ICONS.md)
- [ ] Commitjar tots els canvis
- [ ] Crear tag amb el format correcte
- [ ] Pujar el tag a GitHub
- [ ] Esperar que GitHub Actions completi (15-30 min)
- [ ] Verificar la release a GitHub
- [ ] Provar descarregar i instal·lar
- [ ] Verificar que l'auto-updater funciona

## 🎯 Exemple complet de release

```bash
# 1. Actualitza versió a package.json
# "version": "1.0.1"

# 2. Commit
git add palamMaster/package.json
git commit -m "chore: bump version to 1.0.1"

# 3. Tag
git tag v1.0.1

# 4. Push
git push origin master
git push origin v1.0.1

# 5. Espera que GitHub Actions completi
# 6. Verifica la release a https://github.com/aniollidon/palamblock-master/releases
```
