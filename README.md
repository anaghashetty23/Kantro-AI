# **KANTRO AI**

### *Your Break, Your Food, Your Time.*

KANTRO AI is an AI-powered college canteen pre-ordering and break-time management platform designed to make food ordering faster, smarter, and more convenient for students. It connects students, kitchen staff, and canteen administrators through a single platform.

The application allows students to explore the menu, place orders according to their lecture break schedules, and collect their food using a unique pickup code while helping kitchen staff manage orders and preparation efficiently.

---

## **Key Features**

### 1. AI-Assisted Food Ordering and Break Planning
Students can enter their break timings, explore the menu and receive AI-powered food recommendations based on their available time, budget and food preferences. The integrated AI assistant helps students make informed food choices and plan their orders around their class schedules.

### 2. Intelligent Pre-Ordering and Capacity-Based Scheduling
KANTRO AI allows students to place food orders in advance and select suitable pickup slots. The scheduling system evaluates preparation time, kitchen station workload, existing reservations and ingredient availability to determine whether an order can be prepared within the requested time. If a slot is unavailable, alternative pickup times can be suggested.

### 3. Smart Kitchen Coordination and Live Order Management
Kitchen employees receive organised student orders through their dashboard, with details such as food items, quantities, preparation deadlines and pickup times. Employees can update order statuses throughout the preparation process, while students and administrators can track the order progress through their respective portals.

### 4. Rescue My Break – Intelligent Delay Management
When an order is delayed, the kitchen employee or administrator can update its status. The system records the delay, notifies the student and displays the revised estimated pickup time. It can also suggest an alternative feasible pickup slot, which the student can accept, or the student can contact the administrator. This feature aims to minimise disruption to students' breaks and class schedules.

---

## **Technology Stack**

- **Frontend:** React.js
- **Programming Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Backend:** Node.js and Express.js
- **Database:** SQLite
- **Database Driver:** Better-SQLite3
- **Authentication:** bcryptjs and session-based authentication using HTTP-only cookies
- **AI Integration:** Google Gemini API
- **Icons:** Lucide React
- **Animations:** Motion
- **Package Manager:** Bun
- **Deployment:** Vercel
- **Version Control:** Git and GitHub

---

## **Project Structure**

```text
Kantro-AI/
│
├── .env.example
├── .gitignore
├── bun.lock
├── index.html
├── metadata.json
├── package.json
├── server.ts
├── tsconfig.json
├── vercel.json
├── vite.config.ts
│
├── api/
│   ├── [...path].ts
│   └── index.ts
│
├── server/
│   ├── db.ts
│   ├── gemini.ts
│   ├── routes.ts
│   ├── scheduling.ts
│   ├── scheduling.test.ts
│   ├── security.ts
│   └── security.test.ts
│
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    │
    ├── components/
    │   ├── Logo.tsx
    │   └── Navbar.tsx
    │
    ├── context/
    │   ├── AuthContext.tsx
    │   └── CartContext.tsx
    │
    ├── pages/
    │   ├── AIAssistantPage.tsx
    │   ├── AdminDashboard.tsx
    │   ├── AuthPages.tsx
    │   ├── CartPage.tsx
    │   ├── CheckoutPage.tsx
    │   ├── FullMenuPage.tsx
    │   ├── KitchenDashboard.tsx
    │   ├── LandingPage.tsx
    │   ├── MyOrdersPage.tsx
    │   ├── OrderConfirmationPage.tsx
    │   ├── ProfilePage.tsx
    │   └── StudentDashboard.tsx
    │
    ├── types/
    │   └── index.ts
    │
    └── utils/
        └── csrf.ts
```

---

## **Demo Login Credentials**

The application includes pre-configured demo accounts for hackathon evaluation and demonstration purposes.

| Role | Login ID | Password |
|---|---|---|
| Student | `DEMO2026` | `Student@123` |
| Kitchen Staff | `KITCHEN01` | `Kitchen@123` |
| Administrator | `ADMIN01` | `Admin@123` |

**Note:** These credentials are provided for demonstration purposes. Select the respective login portal to access each account.

---
