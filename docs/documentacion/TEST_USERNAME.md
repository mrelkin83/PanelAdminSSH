# Test de Username Hexadecimal

## Prueba esto:

1. **Abre la consola del navegador** (F12 → Console)

2. **Intenta crear el usuario** con nombre: `26b18e2158ff1ac`

3. **Copia el error completo** que aparece en:
   - La consola del navegador (F12)
   - La terminal del backend

4. **Envíame el error** para ver exactamente dónde está fallando

---

## Verificación Rápida

Ejecuta este comando en el backend para ver si hay validaciones adicionales:

```bash
cd C:/PanelAdminSSH-AMDRufus/backend
grep -r "username" src/services/admrufu.service.ts | head -20
```

---

## Mientras tanto...

Prueba con estos nombres para identificar el patrón:

✓ `testuser` - nombre tradicional
✓ `test123` - empieza con letra, tiene números
✓ `123test` - empieza con número
✓ `26b18e2` - formato hex corto
✓ `26b18e2158ff1ac` - formato hex largo

Indica cuáles funcionan y cuáles no.
