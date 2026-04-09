# OFT-STATS

Sistema de estadística diaria para Oftalmología.

## Accesos
| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `ventanilla` | `oftalmo2024` | Registro diario |
| `admin` | `admin2024` | Acceso completo + borrar historial |

## Estructura de archivos
```
index.html   ← interfaz web completa
server.js    ← servidor Node.js (Express + WebSocket)
package.json ← dependencias
data.json    ← base de datos local (empieza vacía: {})
README.md    ← este archivo
```

## ⚠️ Problema con Railway y los datos

Railway usa un **sistema de archivos efímero**: cada vez que el servidor se reinicia (deploy nuevo, inactividad, caída), los cambios en `data.json` se pierden porque Railway vuelve al estado del repositorio de GitHub.

### Solución actual
El servidor guarda los datos en **memoria RAM** mientras está corriendo, y también intenta escribir en disco. Los datos se mantienen mientras el servidor NO se reinicia.

### Solución permanente (recomendada)
Para no perder datos entre reinicios, conecta una base de datos:

**Opción A — Railway PostgreSQL (gratuito en Railway):**
1. En tu proyecto Railway → "New Service" → "Database" → "PostgreSQL"
2. Copia la variable `DATABASE_URL` que aparece
3. Avísame y te actualizo el `server.js` para usarla

**Opción B — MongoDB Atlas (gratuito, 512 MB):**
1. Crear cuenta en https://www.mongodb.com/atlas
2. Crear cluster gratuito
3. Copiar el connection string
4. Avísame y te actualizo el `server.js`

## Despliegue en Railway

1. Sube todos los archivos a un repositorio GitHub
2. En railway.app → "New Project" → "Deploy from GitHub Repo"
3. Selecciona el repositorio
4. Railway detecta `package.json` automáticamente
5. Espera que el deploy termine (1-2 minutos)
6. Copia la URL pública (termina en `.up.railway.app`)
7. Abre esa URL en el navegador

## Uso en múltiples computadores

Todos los computadores deben acceder a la **misma URL de Railway**.  
Los datos se sincronizan en tiempo real vía WebSocket.

Si un computador muestra "LOCAL" en vez de "SERVIDOR", significa que no puede conectarse — verifica que la URL sea correcta.

## Modo sin servidor (local)

Si abres el `index.html` directamente (sin servidor), la app funciona en **modo local** — los datos se guardan solo en ese navegador y no se comparten con otros computadores.
