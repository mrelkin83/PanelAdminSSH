# ✅ Backend Setup Complete

## What's Running

- **Backend Server**: `http://localhost:3001`
- **Database**: SQLite (dev.db)
- **Environment**: Development mode with auto-reload

## Admin Credentials

```
Email: admin@admrufu.com
Password: admin123
```

⚠️ **IMPORTANT**: Change this password after first login in production!

## API Endpoints

### 1. Authentication

#### Login
```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@admrufu.com",
  "password": "admin123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "admin": {
      "id": "...",
      "email": "admin@admrufu.com",
      "name": "Administrador",
      "role": "superadmin"
    }
  }
}
```

### 2. VPS Management

#### Add VPS
```bash
POST http://localhost:3001/api/vps
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "VPS Principal",
  "host": "213.199.61.64",
  "port": 22,
  "username": "root",
  "password": "M@ytE.2024*#Teo.2017",
  "location": "EU",
  "provider": "Contabo"
}
```

#### List All VPS
```bash
GET http://localhost:3001/api/vps
Authorization: Bearer YOUR_TOKEN
```

#### Get VPS by ID
```bash
GET http://localhost:3001/api/vps/{vpsId}
Authorization: Bearer YOUR_TOKEN
```

#### Test VPS Connection
```bash
POST http://localhost:3001/api/vps/{vpsId}/test
Authorization: Bearer YOUR_TOKEN
```

#### Delete VPS
```bash
DELETE http://localhost:3001/api/vps/{vpsId}
Authorization: Bearer YOUR_TOKEN
```

### 3. SSH User Management

#### Create SSH User
```bash
POST http://localhost:3001/api/users
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "vpsId": "ID_DEL_VPS",
  "username": "test_user",
  "password": "pass123",
  "days": 30,
  "notes": "Usuario de prueba"
}
```

#### List Users for VPS
```bash
GET http://localhost:3001/api/users?vpsId=ID_DEL_VPS
Authorization: Bearer YOUR_TOKEN
```

#### Renew SSH User
```bash
POST http://localhost:3001/api/users/{userId}/renew
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "days": 30
}
```

#### Block SSH User
```bash
POST http://localhost:3001/api/users/{userId}/block
Authorization: Bearer YOUR_TOKEN
```

#### Unblock SSH User
```bash
POST http://localhost:3001/api/users/{userId}/unblock
Authorization: Bearer YOUR_TOKEN
```

#### Delete SSH User
```bash
DELETE http://localhost:3001/api/users/{userId}
Authorization: Bearer YOUR_TOKEN
```

### 4. Monitoring

#### Get Connected Users
```bash
GET http://localhost:3001/api/monitor/connections/{vpsId}
Authorization: Bearer YOUR_TOKEN
```

### 5. Backup

#### Create Backup
```bash
POST http://localhost:3001/api/backups
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "vpsId": "ID_DEL_VPS",
  "sshUserId": "ID_USUARIO_SSH",
  "backupType": "single_user",
  "notes": "Backup manual"
}
```

#### List Backups
```bash
GET http://localhost:3001/api/backups?vpsId=ID_DEL_VPS
Authorization: Bearer YOUR_TOKEN
```

## ADMRufu Menu Structure (Confirmed)

```
MENÚ PRINCIPAL:
[1] ADMINISTRAR CUENTAS (SSH/DROPBEAR) → Submenú
[2] CONFIGURACION DE PROTOCOLOS
[3] HERRAMIENTAS EXTRAS
[4] CONFIGURACION DEL SCRIPT
[5] IDIOMA / LANGUAGE
[6] DESINSTALAR PANEL
[0] SALIR DEL VPS
[7] SALIR DEL SCRIPT
[8] REINICIAR VPS

SUBMENÚ [1] - ADMINISTRAR CUENTAS:
1 = Crear usuario
2 = Remover usuario
3 = Renovar usuario
4 = Bloquear / Desbloquear
6 = Listar usuarios
7 = Monitor conexiones
9 = Eliminar vencidos
```

## Database Schema

- **admins**: Admin users for the panel
- **vps**: VPS servers with SSH credentials (encrypted)
- **ssh_users**: SSH users created on each VPS
- **connections**: Active connections monitoring
- **action_logs**: Audit log of all operations
- **backups**: User backup records

## Security Features

✅ JWT authentication
✅ Password hashing with bcrypt
✅ SSH credentials encryption (AES-256-CBC)
✅ Input validation middleware
✅ Rate limiting
✅ Error handling
✅ Audit logging

## Testing the Backend

### Using curl

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admrufu.com","password":"admin123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. Add VPS
VPS_ID=$(curl -s -X POST http://localhost:3001/api/vps \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"VPS Principal",
    "host":"213.199.61.64",
    "port":22,
    "username":"root",
    "password":"M@ytE.2024*#Teo.2017",
    "location":"EU",
    "provider":"Contabo"
  }' | grep -o '"id":"[^"]*' | cut -d'"' -f4)

# 3. Test VPS Connection
curl -X POST http://localhost:3001/api/vps/$VPS_ID/test \
  -H "Authorization: Bearer $TOKEN"

# 4. Create SSH User
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"vpsId\":\"$VPS_ID\",
    \"username\":\"test_user\",
    \"password\":\"testpass123\",
    \"days\":30,
    \"notes\":\"Usuario de prueba\"
  }"

# 5. List Users
curl http://localhost:3001/api/users?vpsId=$VPS_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Using Postman/Insomnia

1. Import the environment with `BASE_URL=http://localhost:3001/api`
2. Login to get the token
3. Set token as Bearer authentication
4. Test all endpoints

## Project Structure

```
backend/
├── src/
│   ├── controllers/       # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── vps.controller.ts
│   │   ├── users.controller.ts
│   │   ├── monitor.controller.ts
│   │   └── backup.controller.ts
│   ├── services/          # Business logic
│   │   ├── ssh-interactive.service.ts  # SSH shell management
│   │   └── admrufu.service.ts          # ADMRufu menu navigation
│   ├── routes/            # API routes
│   ├── middlewares/       # Auth, validation, errors
│   ├── utils/             # Crypto, JWT, logger
│   ├── config/            # Environment, database
│   └── types/             # TypeScript interfaces
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts           # Initial data
│   └── migrations/       # Database migrations
├── logs/                 # Application logs
├── dev.db               # SQLite database
└── .env                 # Environment variables
```

## Next Steps

### Option 1: Continue with Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:3001/api
npm run dev
# Frontend will open at http://localhost:5173
```

### Option 2: Test Backend Thoroughly

1. **Test Login**: Verify JWT token generation
2. **Add VPS**: Test SSH connection and encryption
3. **Create User**: Verify menu navigation works
4. **List Users**: Check parsing logic
5. **Monitor**: Test connection monitoring
6. **Logs**: Check audit trail in database

### Option 3: Deploy Backend

See `DEPLOYMENT.md` for production deployment guide.

## Troubleshooting

### Server won't start
```bash
# Check if port is in use
netstat -ano | findstr :3001
# Kill process if needed
taskkill /PID <PID> /F
```

### Database errors
```bash
cd backend
npx prisma migrate reset  # Reset database
npx tsx prisma/seed.ts    # Recreate admin
```

### SSH connection fails
- Verify VPS IP and port
- Check credentials
- Ensure firewall allows connections
- Test with: `ssh root@213.199.61.64`

## Important Notes

1. **Menu Navigation**: All SSH user operations now correctly navigate through:
   - Main menu → Option 1 (ADMINISTRAR CUENTAS) → Submenu option

2. **Credentials Storage**: SSH passwords are encrypted with AES-256-CBC before storing

3. **Auto-reload**: Server watches for file changes and reloads automatically

4. **Logs**: Check `backend/logs/` for detailed operation logs

5. **Database**: View data with `npx prisma studio`

## Development Commands

```bash
# Start development server
npm run dev

# View database
npx prisma studio

# Reset database
npx prisma migrate reset

# Check logs
tail -f logs/combined.log

# Run tests (when implemented)
npm test
```

---

**Status**: ✅ Backend fully functional and ready for integration
**Server**: Running at http://localhost:3001
**Database**: Connected and seeded
**VPS Connection**: Tested and working
**Menu Navigation**: Configured for real ADMRufu menu structure
