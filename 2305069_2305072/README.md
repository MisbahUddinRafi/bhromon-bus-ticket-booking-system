# 🚌 bhromon: Bus Ticket Booking System

> **Revolutionizing the way people travel!**\
> A comprehensive, production-ready bus ticket booking platform with real-time seat management, secure payment processing, and an intuitive user interface.

---

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📋 Prerequisites](#-prerequisites)
- [🚀 Setup & Installation](#-setup--installation)
- [💾 Database Setup](#-database-setup)
- [📁 Project Structure](#-project-structure)
- [👥 API Overview](#-api-overview)
- [🎯 Usage Guide](#-usage-guide)
- [📖 Course Information](#-course-information)
- [👨‍💻 Developers](#-developers)

---

## ✨ Key Features

- 🎫 **Smart Seat Booking**: Interactive seat grid, 15-min hold timeout, up to 4 seats per booking
- 💳 **Multiple Payments**: Cash, Card, bKash, Nagad support
- 👤 **Dual-Role System**: Customer & Admin roles with JWT authentication
- 🗺️ **Route Management**: Multi-city routes with real-time seat tracking
- 🔐 **Security**: bcrypt encryption, JWT tokens, transaction control, cascading deletion
- 📊 **Admin Dashboard**: Bus fleet, routes, schedules, analytics management
- 🎨 **Responsive UI**: Desktop/tablet/mobile compatible with smooth animations
- ⏱️ **Smart Alerts**: Real-time confirmations with auto-dismiss notifications

---

## 🛠️ Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | ES6+ |
| **Backend** | Node.js, Express.js | 5.2.1 |
| **Database** | PostgreSQL | 8.0+ |
| **Authentication** | JWT (jsonwebtoken) | 9.0.3 |
| **Security** | bcrypt | 6.0.0 |
| **Database Driver** | pg (PostgreSQL client) | 8.17.2 |
| **CORS** | cors middleware | 2.8.6 |
| **Environment** | dotenv | 17.2.3 |

---

## 📋 Prerequisites

### Required Software
- **Node.js** v14+ ([Download](https://nodejs.org/))
- **PostgreSQL** v12+ ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))
- **GUI DB Tool**: pgAdmin 4 ([Free](https://www.pgadmin.org/)), Navicat Premium ([Paid](https://www.navicat.com/)), or DBeaver ([Free](https://dbeaver.io/))

### Verify Installation
```bash
node --version    # v14.0.0+
npm --version     # 6.0.0+
psql --version    # PostgreSQL version
git --version     # Git version
```

---

## 🚀 Setup & Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/bhromon-bus-ticket-booking-system.git
cd bhromon-bus-ticket-booking-system
```

### Step 2: Install Dependencies
```bash
npm install                    # Root dependencies
cd backend && npm install      # Backend dependencies
```

### Step 3: Configure .env
Create `backend/.env`:
```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bhromon_db
PORT=3000
NODE_ENV=development
JWT_SECRET=your_secret_key_here
```

### Step 4: Setup Database
Use **pgAdmin 4** or **Navicat**:
1. Create database: `bhromon_db`
2. Run SQL files in order: schema → procedures → triggers → seed
3. See [Database Setup](#-database-setup) section for detailed instructions

---

## 💾 Database Setup

**Use pgAdmin 4 (Free) or Navicat Premium (Paid) - NO Terminal Commands**

### Using pgAdmin 4

1. **Connect Server**: Right-click Servers → Create → Server. Enter localhost:5432 with postgres credentials
2. **Create Database**: Right-click Databases → Create → name it `bhromon_db`
3. **Run SQL Files** (in order, using Query Tool):
   - `database/schema/create_tables.sql`
   - `database/procedures/booking_functions.sql`
   - `database/triggers/booking_triggers.sql`
   - `database/triggers/bus_seat_trigger.sql`
   - `database/triggers/schedule_seat_trigger.sql`
   - `database/triggers/user_account_deletion_trigger.sql`
   - `database/seed/cities.sql`
   - `database/seed/busOperators.sql`
   - `database/seed/buses.sql`
   - `database/seed/routes.sql`
   - `database/seed/users.sql`

4. **Verify**: Run `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`

### Using Navicat Premium

1. **Connect**: Connection → PostgreSQL. Enter localhost:5432 with postgres credentials
2. **Create Database**: Right-click → New Database → name it `bhromon_db`
3. **Run SQL Files**: Right-click database → New Query → paste & execute each SQL file in order
4. **Verify**: Run verification query above

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Ensure PostgreSQL server is running |
| Auth failed | Verify password in `.env` matches your PostgreSQL setup |
| Foreign key error | Run SQL files in correct order |
| Database exists | Drop it first via GUI |

---

## 📁 Project Structure

```
bhromon-bus-ticket-booking-system/
│
├── 📄 README.md                          # This file
├── 📄 package.json                       # Root dependencies
│
├── 🗂️ backend/                           # Node.js/Express backend
│   ├── 📄 package.json                   # Backend dependencies
│   ├── 📄 .env                           # Environment variables (create this)
│   ├── src/
│   │   ├── 📄 app.js                     # Express app initialization
│   │   └── 📄 db.js                      # PostgreSQL connection
│   ├── controllers/
│   │   ├── 📄 auth.controller.js         # Authentication logic
│   │   ├── 📄 booking.controller.js      # Booking operations
│   │   ├── 📄 customer.controller.js     # Customer operations
│   │   ├── 📄 admin.controller.js        # Admin operations
│   │   └── 📄 profile.controller.js      # User profile management
│   ├── middleware/
│   │   └── 📄 auth.middleware.js         # JWT authentication middleware
│   └── routes/
│       ├── 📄 auth.routes.js             # Auth endpoints
│       ├── 📄 booking.routes.js          # Booking endpoints
│       ├── 📄 customer.routes.js         # Customer endpoints
│       ├── 📄 admin.routes.js            # Admin endpoints
│       └── 📄 profile.routes.js          # Profile endpoints
│
├── 🗂️ frontend/                          # Client-side application
│   ├── 📄 index.html                     # Home page
│   ├── pages/
│   │   ├── 📄 login.html                 # Login page
│   │   ├── 📄 signup.html                # Registration page
│   │   ├── 📄 customerDashboard.html     # Customer dashboard
│   │   ├── 📄 adminDashboard.html        # Admin dashboard
│   │   ├── 📄 schedules.html             # Bus schedules
│   │   ├── 📄 booking.html               # Booking confirmation
│   │   ├── 📄 payment.html               # Payment processing
│   │   ├── 📄 profile.html               # User profile
│   │   ├── 📄 passengerInfo.html         # Passenger details
│   │   └── 📄 alerts-demo.html           # Alert system demo
│   ├── js/
│   │   ├── 📄 login.js                   # Login logic
│   │   ├── 📄 signup.js                  # Registration logic
│   │   ├── 📄 schedules.js               # Schedule management
│   │   ├── 📄 booking.js                 # Booking logic
│   │   ├── 📄 payment.js                 # Payment processing
│   │   ├── 📄 customerDashboard.js       # Customer dashboard logic
│   │   ├── 📄 adminDashboard.js          # Admin dashboard logic
│   │   ├── 📄 profile.js                 # Profile management
│   │   ├── 📄 passengerInfo.js           # Passenger info handling
│   │   └── 📄 alerts.js                  # Alert utility functions
│   └── css/
│       └── 📄 styles.css                 # Global styles
│
└── 🗂️ database/                          # Database schemas and seed data
    ├── 📄 DATABASE_CHANGES.md            # Documentation of DB changes
    ├── schema/
    │   └── 📄 create_tables.sql          # Main schema with enums & tables
    ├── procedures/
    │   └── 📄 booking_functions.sql      # Database functions
    ├── triggers/
    │   ├── 📄 booking_triggers.sql       # Booking-related triggers
    │   ├── 📄 bus_seat_trigger.sql       # Bus seat triggers
    │   ├── 📄 schedule_seat_trigger.sql  # Schedule seat triggers
    │   └── 📄 user_account_deletion_trigger.sql  # User deletion cascade
    └── seed/
        ├── 📄 cities.sql                 # City data
        ├── 📄 busOperators.sql           # Bus operator data
        ├── 📄 buses.sql                  # Bus data
        ├── 📄 routes.sql                 # Route data
        └── 📄 users.sql                  # Sample user data
```

---

## 👥 API Overview

### Authentication Endpoints
- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/login` - User login
- **GET** `/api/auth/verify` - Verify JWT token

### Customer Endpoints
- **GET** `/api/customer/schedules` - Get all schedules
- **GET** `/api/customer/schedule-details/:scheduleId` - Get schedule details
- **GET** `/api/customer/schedule-seats/:scheduleId` - Get seat availability
- **POST** `/api/customer/booking/hold` - Hold seats temporarily
- **POST** `/api/customer/booking/confirm` - Confirm booking

### Admin Endpoints
- **POST** `/api/admin/buses/add` - Add new bus
- **POST** `/api/admin/schedules/create` - Create schedule
- **POST** `/api/admin/routes/create` - Create route
- **GET** `/api/admin/dashboard` - Get admin statistics

### Booking Endpoints
- **GET** `/api/booking/user-bookings` - Get user's bookings
- **POST** `/api/booking/payment` - Process payment
- **PUT** `/api/booking/cancel/:bookingId` - Cancel booking

### Profile Endpoints
- **GET** `/api/profile/user-info` - Get user profile
- **PUT** `/api/profile/update` - Update user profile

---

## 🎯 Usage Guide

### For Customers
1. Open `frontend/index.html` in browser (or `python -m http.server 8000` in frontend folder)
2. Sign Up → Login
3. Browse Schedules → Select seats (max 4) → Confirm booking
4. Choose payment method → Complete payment

### For Admins
1. Login with admin credentials
2. Access Admin Dashboard → Manage buses, routes, schedules, view analytics

### Start Backend Server
```bash
cd backend
npm install    # First time only
node src/app.js    # Start server on http://localhost:3000

# Optional: Install nodemon for auto-reload
npm install -g nodemon
nodemon src/app.js
```

---

## 📖 Course Information

📚 **Course**: CSE 216 (Database Sessional)  
🏫 **Institution**: Bangladesh University of Engineering and Technology (BUET)  
📚 **Course Type**: Term Project  
👨‍🏫 **Supervisor**: [**Niaz Rahman**](https://cse.buet.ac.bd/faculty/faculty_detail/niaz) (Lecturer, Department of CSE, BUET)

This project demonstrates practical application of database concepts including:
- Entity-Relationship modeling
- SQL and database design
- Transaction management
- Complex queries and procedures
- Data integrity and constraint enforcement
- Secure backend API development

---

## 👨‍💻 Developers

| Developer | Student ID | Role | Contact |
|-----------|------------|------|---------|
| **Md. Misbah Uddin Rafi** | 2305069 | Full Stack Developer | [GitHub](https://github.com/MisbahUddinRafi) |
| **Md Rakibul Hasan Sumon** | 2305072 | Full Stack Developer | [GitHub](https://github.com) |

---

## 📝 License

This project is developed as a term project for CSE 216 (Database Sessional) at BUET.

---

## 🤝 Support & Contribution

For issues or suggestions, please create an issue in the repository. Contributions are welcome!

---

## 🎉 Thank You!

Thank you for checking out **bhromon**! We hope this system makes your bus ticket booking experience smooth and enjoyable.

**Happy Traveling! 🚌✨**

---

<div align="center">

**Made with ❤️ by CSE L2T1 Students**

*BUET • 2026*

</div>

