#!/bin/bash

# Fix backup.controller.ts - Add returns
sed -i 's/res\.status(201)\.json(/return res.status(201).json(/' controllers/backup.controller.ts
sed -i 's/res\.status(500)\.json(/return res.status(500).json(/' controllers/backup.controller.ts
sed -i 's/res\.json(/return res.json(/' controllers/backup.controller.ts
sed -i 's/res\.status(404)\.json(/return res.status(404).json(/' controllers/backup.controller.ts

# Fix monitor.controller.ts - Add returns
sed -i 's/res\.json(/return res.json(/' controllers/monitor.controller.ts
sed -i 's/res\.status(/return res.status(/' controllers/monitor.controller.ts

# Fix middleware
sed -i 's/next();/return next();/' middlewares/*.ts
sed -i 's/next();$/return next();/' middlewares/*.ts

# Fix JWT imports
sed -i 's/import jwt from/import jwt, { SignOptions } from/' utils/jwt.ts
sed -i 's/return jwt.sign(payload, config.JWT_SECRET, {/const options: SignOptions = {/' utils/jwt.ts
sed -i 's/expiresIn: config.JWT_EXPIRES_IN,/expiresIn: config.JWT_EXPIRES_IN,\n  };\n  return jwt.sign(payload, config.JWT_SECRET, options);/' utils/jwt.ts

# Add unused variable prefixes
sed -i 's/(req: Request, res: Response)/(_req: Request, res: Response)/' controllers/monitor.controller.ts

echo "Basic fixes applied"
