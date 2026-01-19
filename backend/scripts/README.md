# Scripts de Utilidad - Backend

## 🔐 Actualizar Credenciales del Administrador

Este script actualiza las credenciales del administrador principal del sistema.

### Credenciales Nuevas:
- **Email:** `mr.elkin@hotmail.com`
- **Password:** `Mayte2024*#`

---

## 📝 Uso del Script

### Opción 1: Script JavaScript (Recomendado)

```bash
cd backend
node scripts/update-admin.js
```

**Ventajas:**
- ✅ No requiere compilación
- ✅ Ejecución rápida
- ✅ Compatible con cualquier entorno Node.js

---

### Opción 2: Script TypeScript

```bash
cd backend
npx tsx scripts/update-admin-credentials.ts
```

**Ventajas:**
- ✅ Type-safe
- ✅ Mejor para desarrollo

---

## 🔄 Qué hace el script:

1. **Conecta a la base de datos** usando Prisma
2. **Busca el primer administrador** creado
3. **Si existe:**
   - Actualiza el email a `mr.elkin@hotmail.com`
   - Actualiza el password a `Mayte2024*#` (hasheado con bcrypt)
   - Asegura que el rol sea `superadmin`
   - Activa la cuenta
4. **Si NO existe:**
   - Crea un nuevo administrador con las credenciales especificadas
5. **Muestra información** del resultado

---

## 📊 Salida Esperada

### Si actualiza admin existente:
```
🔄 Actualizando credenciales del administrador...

✅ Credenciales actualizadas exitosamente!

📧 Email anterior: admin@example.com
📧 Email nuevo: mr.elkin@hotmail.com
🔑 Password nuevo: Mayte2024*#
👤 Rol: superadmin
🆔 ID: clx123abc456def789

🎉 Proceso completado. Ahora puedes iniciar sesión con:
   Email: mr.elkin@hotmail.com
   Password: Mayte2024*#
```

### Si crea nuevo admin:
```
🔄 Actualizando credenciales del administrador...

❌ No se encontró ningún administrador en la base de datos.
📝 Creando nuevo administrador...

✅ Administrador creado exitosamente!

📧 Email: mr.elkin@hotmail.com
🔑 Password: Mayte2024*#
👤 Rol: superadmin
🆔 ID: clx123abc456def789

🎉 Proceso completado. Ahora puedes iniciar sesión con:
   Email: mr.elkin@hotmail.com
   Password: Mayte2024*#
```

---

## ⚠️ Notas Importantes

1. **Base de datos debe estar configurada:**
   - Verifica que `DATABASE_URL` esté en el archivo `.env`
   - La base de datos debe estar accesible

2. **Prisma debe estar generado:**
   ```bash
   npx prisma generate
   ```

3. **El script es seguro:**
   - Solo actualiza el PRIMER administrador encontrado
   - No afecta otros administradores
   - No elimina datos existentes

4. **Password hasheado:**
   - El password se guarda hasheado con bcrypt (salt rounds: 10)
   - Nunca se almacena en texto plano

---

## 🧪 Verificar el Cambio

Después de ejecutar el script, puedes verificar el cambio de dos formas:

### 1. Probar login con la API:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mr.elkin@hotmail.com",
    "password": "Mayte2024*#"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "admin": {
      "id": "...",
      "email": "mr.elkin@hotmail.com",
      "name": "Administrator",
      "role": "superadmin"
    }
  }
}
```

### 2. Verificar en la base de datos:
```sql
SELECT id, email, role, "isActive", "createdAt"
FROM "Admin"
WHERE email = 'mr.elkin@hotmail.com';
```

---

## 🔧 Troubleshooting

### Error: "Cannot find module '@prisma/client'"
**Solución:**
```bash
cd backend
npm install
npx prisma generate
```

### Error: "Cannot connect to database"
**Solución:**
1. Verifica que PostgreSQL esté corriendo
2. Verifica el `DATABASE_URL` en `.env`
3. Ejecuta las migraciones:
   ```bash
   npx prisma migrate dev
   ```

### Error: "bcryptjs not found"
**Solución:**
```bash
npm install bcryptjs
```

---

## 📝 Cambiar las Credenciales

Si quieres cambiar a otras credenciales, edita los scripts:

### En `update-admin.js` o `update-admin-credentials.ts`:
```javascript
const NEW_EMAIL = 'tu-nuevo-email@example.com';
const NEW_PASSWORD = 'TuNuevoPassword123';
```

Luego ejecuta el script nuevamente.

---

## 🆘 Soporte

Si tienes problemas:
1. Verifica que el backend funcione: `npm run dev`
2. Revisa los logs del script
3. Verifica la conexión a la base de datos
4. Consulta la documentación de Prisma

---

**Creado:** 2025-12-27
**Versión:** 1.0.0
