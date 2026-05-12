# Configuración de Firebase para Persistencia de Datos

## ¿Por qué Firebase?

Firebase Firestore es una base de datos en la nube **GRATUITA** que permite:
- ✅ Los datos persisten entre actualizaciones de Render
- ✅ Acceso desde cualquier dispositivo
- ✅ Sincronización automática
- ✅ Hasta 1GB de almacenamiento gratis
- ✅ 50,000 lecturas/día gratis
- ✅ 20,000 escrituras/día gratis

## Pasos para Configurar (10 minutos)

### 1. Crear Proyecto en Firebase

1. Ve a: https://console.firebase.google.com/
2. Clic en **"Agregar proyecto"**
3. Nombre del proyecto: `proforma-appweb` (o el que prefieras)
4. Deshabilita Google Analytics (no lo necesitamos)
5. Clic en **"Crear proyecto"**

### 2. Configurar Firestore Database

1. En el menú izquierdo, clic en **"Firestore Database"**
2. Clic en **"Crear base de datos"**
3. Selecciona **"Comenzar en modo de producción"** o **"modo de prueba"**
4. Ubicación: `us-central` o el más cercano a ti
5. Clic en **"Habilitar"**

**IMPORTANTE:** Si elegiste modo producción, DEBES configurar las reglas (paso 5) o la app NO funcionará.

### 3. Obtener Configuración Web

1. En la página principal del proyecto, clic en el ícono **</> (Web)**
2. Nombre de la app: `Proforma AppWeb`
3. **NO marcar** "También configurar Firebase Hosting"
4. Clic en **"Registrar app"**
5. Aparecerá un código como este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

6. **COPIA ESTOS VALORES**

### 4. Pegar Configuración en tu Proyecto

1. Abre el archivo: `js/firebase-config.js`
2. Busca la sección que dice:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "tu-proyecto.firebaseapp.com",
    ...
```

3. **REEMPLAZA** todo el objeto `firebaseConfig` con los valores que copiaste

**ANTES:**
```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    ...
};
```

**DESPUÉS:**
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "proforma-appweb.firebaseapp.com",
    projectId: "proforma-appweb-12345",
    ...
};
```

4. **Guarda el archivo**

### 5. Configurar Reglas de Seguridad (CRÍTICO en modo producción)

1. En Firebase Console, ve a **"Firestore Database"**
2. Pestaña **"Reglas"**
3. **Reemplaza las reglas** con esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acceso público hasta diciembre 2026
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2026, 12, 31);
    }
  }
}
```

4. Clic en **"Publicar"**

**⚠️ CRÍTICO:** 
- Sin estas reglas, tu app **NO FUNCIONARÁ** en modo producción
- Esta regla permite acceso público hasta diciembre 2026
- Para más seguridad, puedes agregar autenticación de Firebase después
- Si la app no guarda/carga datos, revisa que estas reglas estén publicadas

### 6. Probar la Configuración

1. Abre tu aplicación
2. Inicia sesión
3. Agrega un cliente o producto
4. Ve a Firebase Console → Firestore Database
5. Deberías ver una colección llamada `proformaApp` con tus datos

### 7. Subir a GitHub y Render

```bash
git add .
git commit -m "Agregada base de datos Firebase para persistencia"
git push origin main
```

Render se actualizará automáticamente y tus datos estarán en la nube.

## Cómo Funciona

### Sistema Híbrido (Doble Respaldo)

La aplicación usa un sistema inteligente:

1. **localStorage** (Respaldo local)
   - Los datos se guardan en tu navegador
   - Funciona sin internet
   - Se mantiene entre sesiones

2. **Firebase Firestore** (Nube)
   - Los datos se guardan en la nube
   - Accesibles desde cualquier dispositivo
   - Persisten entre actualizaciones de Render

### Flujo de Datos

**Al GUARDAR:**
```
Usuario guarda → localStorage ✓ → Firebase ✓
```

**Al CARGAR:**
```
Firebase existe? → Sí: Usar Firebase → Sincronizar con localStorage
                 → No: Usar localStorage
```

### Si Firebase no está configurado

Si no configuras Firebase (dejas `TU_API_KEY_AQUI`), la aplicación:
- ✅ Funciona perfectamente con localStorage
- ⚠️ Los datos se pierden al actualizar Render
- ✅ No muestra errores

## Migrar Datos Existentes

Si ya tienes datos en localStorage:

1. Configura Firebase siguiendo los pasos anteriores
2. Inicia sesión en la aplicación
3. Haz cualquier cambio pequeño (edita un cliente)
4. Los datos se sincronizarán automáticamente a Firebase

## Verificar Estado de Firebase

Abre la consola del navegador (F12) y busca:

```
✅ "Firebase inicializado correctamente"
✅ "Datos guardados en Firestore: proformaApp"
✅ "Datos cargados desde Firestore: proformaApp"
```

O:

```
ℹ️ "Firebase no configurado. Usando localStorage como respaldo."
```

## Límites del Plan Gratuito

Firebase ofrece **GENEROSAMENTE**:

| Recurso | Límite Gratis | ¿Suficiente? |
|---------|---------------|--------------|
| Almacenamiento | 1 GB | ✅ Sí (miles de registros) |
| Lecturas/día | 50,000 | ✅ Sí (150 usuarios/día aprox) |
| Escrituras/día | 20,000 | ✅ Sí (60 registros/día aprox) |
| Eliminaciones/día | 20,000 | ✅ Sí |

**Tu aplicación usará:**
- ~1 escritura por cada guardado
- ~1 lectura al iniciar sesión
- ~100 KB por conjunto de datos completo

**Conclusión:** El plan gratuito es MÁS que suficiente para tu uso.

## Solución de Problemas

### "Firebase SDK no cargado"
- Verifica que tengas internet
- Los scripts de Firebase se cargan desde CDN

### "Error al inicializar Firebase"
- Revisa que copiaste correctamente el `firebaseConfig`
- Verifica que todos los campos estén entre comillas

### "Permission denied" o "PERMISSION_DENIED"
- **Causa:** Iniciaste en modo producción sin configurar reglas
- **Solución:** Ve a Firestore → Reglas → Copia las reglas del paso 5 → Publicar
- Verifica que la fecha sea futura (2026, 12, 31)
- Espera 1 minuto después de publicar

### Los datos no se sincronizan
- Abre la consola (F12) y busca errores
- Verifica que Firebase Console muestre la colección `proformaApp`

## Backup Manual

Puedes exportar tus datos en cualquier momento:

1. Abre Firebase Console
2. Ve a Firestore Database
3. Selecciona la colección `proformaApp`
4. Clic en los tres puntos → "Exportar"

## Desactivar Firebase

Si quieres volver a usar solo localStorage:

1. Abre `js/firebase-config.js`
2. Cambia:
```javascript
apiKey: "AIzaSy..."
```
Por:
```javascript
apiKey: "TU_API_KEY_AQUI"
```

La aplicación automáticamente usará solo localStorage.

## Soporte

Para más información sobre Firebase:
- Documentación: https://firebase.google.com/docs/firestore
- Consola: https://console.firebase.google.com/

---

**¡Listo!** Con Firebase configurado, tus datos estarán seguros en la nube y persistirán entre todas las actualizaciones de Render. 🎉
