# KAVACH-INFINITY Platform

Enterprise-grade Railway Safety Management System with secure authentication and role-based access control.

## Features

- 🔐 **Secure Authentication** - bcrypt password hashing, JWT tokens, HTTP-only cookies
- 👥 **Role-Based Access** - Admin and User roles with different permissions
- 📊 **Dashboard** - Real-time system statistics and health monitoring
- 🚨 **Alerts System** - Critical, Warning, and Info level event tracking
- 📋 **Audit Logs** - Complete activity history with export capability
- 👤 **User Management** - Full CRUD operations (Admin only)
- ⚙️ **Settings** - Profile management and password changes

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MySQL 8.0+
- **Security**: bcryptjs, jsonwebtoken, helmet, rate-limiting
- **Frontend**: HTML5, CSS3, Vanilla JavaScript

## Quick Start

### Prerequisites

1. **Node.js** (v16 or higher)
2. **MySQL** (v8.0 or higher)

### Installation

1. **Create the MySQL Database**

   ```sql
   mysql -u root -p < database/schema.sql
   ```

2. **Configure Environment**

   Create `backend/.env` file:

   ```env
   # Server
   PORT=3000
   NODE_ENV=development

   # Database
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=kavach_infinity

   # Security
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
   JWT_EXPIRES_IN=24h
   BCRYPT_ROUNDS=10

   # CORS
   ALLOWED_ORIGINS=http://localhost:3000
   ```

3. **Install Dependencies**

   ```bash
   cd backend
   npm install
   ```

4. **Start the Server**

   ```bash
   npm start
   ```

5. **Access the Application**

   Open http://localhost:3000

## Demo Accounts

| Role  | Email            | Password   |
|-------|------------------|------------|
| Admin | admin@kavach.in  | Kavach@123 |
| User  | user@kavach.in   | User@123   |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Dashboard
- `GET /api/dashboard/stats` - System statistics
- `GET /api/dashboard/recent-activity` - Recent activity
- `GET /api/dashboard/alerts` - Active alerts

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event (Admin)
- `PUT /api/events/:id/resolve` - Resolve event
- `DELETE /api/events/:id` - Delete event (Admin)

### Audit Logs
- `GET /api/audit` - List audit logs
- `GET /api/audit/export` - Export logs (Admin)

### Settings
- `GET /api/settings/profile` - Get profile
- `PUT /api/settings/profile` - Update profile
- `PUT /api/settings/password` - Change password

## Project Structure

```
kavach-infinity-full/
├── backend/
│   ├── config/
│   │   ├── database.js     # MySQL connection pool
│   │   └── init.js         # Database initialization
│   ├── middleware/
│   │   └── auth.js         # JWT authentication
│   ├── routes/
│   │   ├── auth.js         # Authentication routes
│   │   ├── users.js        # User management
│   │   ├── audit.js        # Audit logs
│   │   ├── events.js       # System events
│   │   ├── dashboard.js    # Dashboard data
│   │   └── settings.js     # Settings
│   ├── server.js           # Express server
│   ├── package.json
│   └── .env
├── frontend/
│   ├── css/
│   │   └── style.css       # Enterprise dashboard styles
│   ├── js/
│   │   └── app.js          # Dashboard application
│   ├── index.html          # Login page
│   └── dashboard.html      # Main dashboard
└── database/
    └── schema.sql          # MySQL schema
```

## Security Features

- Password hashing with bcrypt (configurable rounds)
- JWT tokens with expiration
- HTTP-only cookies for token storage
- Rate limiting on authentication endpoints
- Helmet.js security headers
- Input validation with express-validator
- SQL injection prevention with parameterized queries
- CORS protection
- XSS prevention

## License

© 2026 Ministry of Railways, Government of India. All rights reserved.
