# 🎬 Movie Pirates

An advanced, premium AI-powered movie and television series catalog application built using Next.js, Google Firebase Genkit with Gemini 2.0 Flash, MongoDB, and Tailwind CSS.

---

## 🚀 Technologies Used

Here are the core technologies, libraries, and design tools powering the Movie Pirates universe:

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Google Genkit](https://img.shields.io/badge/Firebase_Genkit-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_2.0_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-F107A3?style=for-the-badge&logo=framer&logoColor=white)
![Shadcn UI](https://img.shields.io/badge/Shadcn_UI-000000?style=for-the-badge&logo=shadcnui&logoColor=white)

---

## ✨ Features

- 🧠 **AI Suggestion Engine**: Enter prompts (like *"sci-fi movies with twist endings similar to Interstellar"*) and get AI-curated recommendations powered by Genkit and Gemini 2.0 Flash, resolving suggestions instantly from local database content.
- 🧱 **Interactive Movie Walls**:
  - **Drag-to-Explore Grid**: Smooth 2D scrolling movie card array powered by Framer Motion.
  - **Infinite Grid Zoom**: Interactive movie browser with controls for zooming (`Zoom In`, `Zoom Out`) and dragging.
- 💬 **Dynamic Rating & Review System**: Recalculates movie average ratings in real-time inside MongoDB whenever reviews are submitted or deleted.
- 🔒 **User Session & Dashboards**: Full login, signup, session activity tracking, and user profile page displaying personal review counts and history.
- ⚙️ **Admin Control Panel**: Comprehensive metrics dashboards containing monthly signup trends, visitor statistics, user logs, movie CRUD controls, and review moderating capabilities.
- 🛡️ **Robust Image Handling**: Fallback sanitization for external poster URLs and unconfigured hosts (such as IMDb detail pages), replacing invalid formats with dynamic placeholders.
- 🌓 **Sleek Glassmorphism Design System**: Beautiful custom layout featuring high-contrast dark modes, vibrant gradients, and micro-animations.

---

## 📁 Project Directory Structure

Here is a breakdown of the repository's directory architecture:

```text
├── src/
│   ├── ai/                          # Genkit Flows, Schemas & Initialization
│   │   ├── flows/                   # Server Actions wrapping Genkit flows
│   │   │   ├── admin-data-flow.ts   # Metrics aggregation for dashboard
│   │   │   ├── movie-management.ts  # CRUD flows for movies/series
│   │   │   ├── review-flow.ts       # Submission, deletion, listing flows
│   │   │   └── user-profile-flow.ts # Profile & history queries
│   │   ├── schemas/                 # Zod schemas for request/response validation
│   │   └── genkit.ts                # Genkit initialization with Gemini configuration
│   ├── app/                         # Next.js App Router (pages & endpoints)
│   │   ├── admin/                   # Admin console panels
│   │   ├── auth/                    # Authorization routes (login/register)
│   │   ├── movies/                  # Movie detailed listings
│   │   └── dashboard/               # Client profile management
│   ├── components/                  # Shared React UI Components
│   │   ├── ui/                      # Radix & Shadcn raw styling blocks
│   │   ├── Header.tsx               # Navigation bar with user dropdown
│   │   ├── MovieCard.tsx            # Poster cards with URL sanitizers
│   │   └── StarRating.tsx           # Rating bar selection component
│   ├── context/                     # Global React contexts
│   ├── hooks/                       # Custom hooks (e.g. useToast)
│   ├── lib/                         # Shared utility functions & MongoDB clients
│   └── types/                       # Core TypeScript declarations
├── next.config.ts                   # Next.js bundler and image domain parameters
├── tailwind.config.ts               # Custom typography and palette tokens
├── components.json                  # Shadcn configurations
└── package.json                     # Scripts and system package specifications
```

---

## 🛠️ Getting Started

Follow these steps to run the application locally on your machine:

### 1. Prerequisite Checklist
- **Node.js** (v18+ recommended)
- **NPM** or **Yarn**
- **MongoDB Database URL** (local connection or MongoDB Atlas instance)
- **Google Gemini API Key**

### 2. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/Rbaskey/movie.pirates.git
npm install
```

### 3. Environment Variable Configuration
Create a `.env.local` or `.env` file in the root directory and add the following keys:
```env
# MongoDB Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=movie1

# Google Gemini API key for Genkit flows
GEMINI_API_KEY=AIzaSy...

# Authentication Tokens
JWT_SECRET=your_jwt_secret_key_here
```

### 4. Running the Development Server
Execute the Next.js development script on port `9002`:
```bash
npm run dev
```
Open [http://localhost:9002](http://localhost:9002) in your browser to view the application.

---

## 📜 Dev Commands Reference

- `npm run dev` — Run the local Next.js dev server (forces Webpack compiler on port 9002).
- `npm run build` — Build production bundle.
- `npm run start` — Run production server.
- `npm run typecheck` — Run TypeScript type checking compiler compilation checks.
- `npm run genkit:dev` — Start the Genkit Developer UI interface.

---

Made with ❤️ by [Rbaskey](https://github.com/Rbaskey).
