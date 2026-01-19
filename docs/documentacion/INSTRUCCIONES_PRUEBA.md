# 🧪 INSTRUCCIONES DE PRUEBA

## ✅ Todo está listo. Ahora solo falta probar.

---

## 🚀 Paso 1: Reiniciar Servidores

### Backend:
```bash
cd C:/PanelAdminSSH-AMDRufus/backend

# Si está corriendo, presiona Ctrl+C
npm run dev
```

**Deberías ver:**
```
📡 Server: http://localhost:3001
```

---

### Frontend:
```bash
cd C:/PanelAdminSSH-AMDRufus/frontend

# Si está corriendo, presiona Ctrl+C
npm run dev
```

**Deberías ver:**
```
➜  Local:   http://localhost:5173/
```

---

## 🧪 Paso 2: Probar Nombres Hexadecimales

### A. Ve al navegador:
http://localhost:5173/

### B. Inicia sesión:
- Email: `mr.elkin@hotmail.com`
- Password: `Mayte2024*#`

### C. Crear usuario con nombre hexadecimal:

1. **Click en "Usuarios SSH"** (sidebar izquierdo)

2. **Click en "Nuevo Usuario SSH"** (botón azul arriba a la derecha)

3. **Modo:** Selecciona **"Un VPS"** o **"Múltiples VPS"**

4. **Llena el formulario:**
   ```
   Usuario SSH: 26b18e2158ff1ac
   Contraseña: test123456
   Días de validez: 30
   VPS: [Selecciona tu VPS]
   ```

5. **Click en "Crear Usuario"**

### ✅ RESULTADO ESPERADO:
- ✅ Usuario creado exitosamente
- ✅ Aparece en la lista de usuarios
- ✅ Sin errores en consola

### ❌ Si hay error:
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Copia el error y envíamelo

---

## 📊 Paso 3: Probar Monitor de VPS

### A. Ve a Monitor:
1. **Click en "Monitor"** (sidebar izquierdo)

### B. Verifica que se muestren todas tus VPS con:
- ✅ Estado (Online/Offline)
- ✅ Barra de CPU con porcentaje
- ✅ Barra de RAM con porcentaje y MB
- ✅ Barra de Disco con porcentaje
- ✅ Uptime (tiempo activo)
- ✅ Lista de puertos abiertos

### C. Prueba el selector de intervalo:
- Cambia entre: **5s**, **10s**, **30s**, **1 minuto**
- Observa que las métricas se actualizan

### ✅ RESULTADO ESPERADO:
- ✅ Ves todas tus VPS en tarjetas
- ✅ Las métricas se actualizan automáticamente
- ✅ Los colores cambian según el uso (verde, amarillo, rojo)

---

## 🔍 Paso 4: Verificar en el Backend

### Abre otra terminal y ejecuta:
```bash
cd C:/PanelAdminSSH-AMDRufus/backend
node scripts/check-vps.js
```

**Deberías ver:**
```
✅ VPS encontrados:
1. [Nombre del VPS]
   ID: ...
   Usuarios SSH: 1  (el que acabas de crear)
```

---

## 📝 Paso 5: Probar Otros Formatos de Username

Prueba crear usuarios con estos nombres para verificar que todos funcionan:

```bash
✅ 1234567890         # Solo números
✅ abc123             # Alfanumérico tradicional
✅ test-user          # Con guión
✅ test_user          # Con guión bajo
✅ 26b18e2158ff1ac    # Hexadecimal largo
✅ a1b2c3             # Hexadecimal corto
```

---

## ⚠️ Posibles Problemas y Soluciones

### Error: "VPS not found"
**Solución:** Asegúrate de tener al menos un VPS agregado en "Admin VPS"

### Error: "Failed to connect to VPS via SSH"
**Solución:**
1. Ve a "Admin VPS"
2. Verifica las credenciales SSH del VPS
3. Prueba con "Omitir validación SSH" marcado

### Error: "User already exists on this VPS"
**Solución:** El usuario ya fue creado antes. Usa otro nombre.

### Monitor no muestra métricas:
**Solución:**
1. Verifica que el VPS esté online
2. Verifica las credenciales SSH del VPS
3. Revisa los logs del backend

---

## 🎯 Checklist de Funcionalidades

Marca lo que ya probaste:

- [ ] ✅ Crear usuario con nombre hexadecimal (`26b18e2158ff1ac`)
- [ ] ✅ Crear usuario con nombre que empieza con número
- [ ] ✅ Crear usuario en un solo VPS
- [ ] ✅ Crear usuario en múltiples VPS
- [ ] ✅ Ver Monitor con todas las VPS
- [ ] ✅ Métricas de CPU/RAM/Disk se actualizan
- [ ] ✅ Cambiar intervalo de actualización del Monitor
- [ ] ✅ VPS muestra estado correcto (Online/Offline)

---

## 📞 Si Encuentras Problemas

### 1. Revisa logs del backend:
- Mira la terminal donde corre `npm run dev` del backend
- Busca líneas con `[ERROR]` o errores en rojo

### 2. Revisa consola del navegador:
- Presiona F12
- Ve a la pestaña "Console"
- Busca errores en rojo

### 3. Envíame:
- El error exacto que aparece
- Los logs del backend (si hay)
- Los logs del frontend (consola)
- Qué paso estabas haciendo cuando falló

---

## 🎉 Si Todo Funciona

¡Felicitaciones! El sistema ahora:

✅ **Permite nombres hexadecimales** como `26b18e2158ff1ac`
✅ **Muestra métricas completas** de todas las VPS
✅ **Usa comandos Linux directos** (más rápido y confiable)
✅ **Monitor en tiempo real** con actualización configurable

---

## 📚 Documentación Adicional

- `SOLUCION_IMPLEMENTADA.md` - Explicación técnica completa
- `IMPLEMENTACION_COMPLETA.md` - Documentación del sistema de monitoreo
- `API_DOCUMENTATION.md` (en carpeta modelo) - Referencia de endpoints

---

**Última actualización:** 2025-12-27
**Estado:** ✅ Listo para probar
