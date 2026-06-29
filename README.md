# Web Scrapper API - Comprehensive Documentation

## Important Note

**This project was built from zero.** The entire codebase, architecture, scraping logic, authentication system, database models, quota management, and frontend were developed from scratch without any template or pre-existing scaffold beyond the initial Next.js project creation. Every component, API route, scraper, and utility function was written by hand to create a fully functional price comparison web scraper API.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Folder Structure](#architecture--folder-structure)
4. [Database Models](#database-models)
5. [Authentication System](#authentication-system)
6. [API Routes](#api-routes)
7. [Web Scrapers](#web-scrapers)
8. [Search Normalization & Scoring](#search-normalization--scoring)
9. [Quota & Rate Limiting](#quota--rate-limiting)
10. [Audit Logging](#audit-logging)
11. [Frontend Pages & Components](#frontend-pages--components)
12. [Environment Variables](#environment-variables)
13. [API Request/Response Formats](#api-requestresponse-formats)
14. [Setup & Installation](#setup--installation)
15. [Running the Project](#running-the-project)
16. [End-to-End Scraping Flow](#end-to-end-scraping-flow)
17. [Key Features & Design Decisions](#key-features--design-decisions)

---

## 1. Project Overview

The Web Scrapper API is a full-stack web application that scrapes product information from multiple e-commerce websites (Amazon.eg, Jumia.com.eg, Noon.com) to provide price comparison results. Users can search for any product, and the system returns results sorted by price with relevance filtering. The application includes user authentication, search history, saved products, quota management based on subscription plans, and comprehensive audit logging.

The application is built with a **right-to-left (RTL) Arabic-first UI** and supports both English and Arabic numerals in price parsing.

---

## 2. Technology Stack

| Layer | Technology | Version/Details |
|-------|-----------|-----------------|
| **Framework** | Next.js | 16.1.6 (App Router) |
| **Language** | TypeScript | 5.9.3 |
| **Runtime** | Node.js | Server-side rendering and API routes |
| **Scraping Engine** | Puppeteer | 24.37.1 (headless Chromium) |
| **Database** | MongoDB | Via Mongoose ODM |
| **Authentication** | NextAuth.js | 4.24.14 (JWT strategy) |
| **Styling** | Tailwind CSS | v4 with PostCSS |
| **UI Components** | lucide-react | Icons |
| **Animation/Effects** | ogl | WebGL light rays background |
| **Email** | Nodemailer | 7.0.13 (for verification emails) |
| **Password Hashing** | bcryptjs | 2.4.3 |
| **Utility Libraries** | clsx, class-variance-authority, tailwind-merge | Class name management |

---

## 3. Architecture & Folder Structure

```
web-scrapper/
├── .env                      # Environment variables
├── .env.local.example        # Example environment file
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── postcss.config.mjs        # PostCSS configuration
├── next.config.ts            # Next.js configuration
├── eslint.config.mjs         # ESLint configuration
├── components.json           # Component configuration
├── README.md                 # This file
│
├── app/                      # Next.js App Router pages and API routes
│   ├── layout.tsx            # Root layout with HTML lang="ar" dir="rtl"
│   ├── page.tsx              # Home page
│   ├── globals.css           # Global styles and CSS variables
│   ├── search/
│   │   └── page.tsx          # Search results page (main UI)
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── register/
│   │   └── page.tsx          # Registration page
│   ├── history/
│   │   └── page.tsx          # Search history page
│   ├── api/
│   │   ├── scrape/
│   │   │   └── route.ts      # Main scraping API endpoint (POST)
│   │   └── history/
│   │       ├── route.ts      # History CRUD (GET, POST, DELETE)
│   │       └── merge/
│   │           └── route.ts  # Merge history entries
│   └── test/
│       └── page.tsx          # Test page
│
├── components/               # Reusable React components
│   ├── AuthForm.tsx          # Login/Register form component
│   ├── EmptyState.tsx        # Empty state display
│   ├── ErrorBanner.tsx       # Error notification banner
│   ├── Footer.tsx            # Page footer
│   ├── Header.tsx            # Page header with navigation
│   ├── HowItWorksCards.tsx   # "How it works" feature cards
│   ├── InputSys.tsx          # Reusable input component
│   ├── LightRays.css         # Light rays animation styles
│   ├── LightRays.jsx         # WebGL background effect (ogl)
│   ├── LightRays.tsx         # Light rays component wrapper
│   ├── ProductCard.tsx       # Product display card
│   ├── Providers.tsx         # NextAuth session provider wrapper
│   ├── SaveSearchPrompt.tsx  # Save search prompt modal/component
│   ├── SearchBar.tsx         # Search input component
│   ├── SourceBadge.tsx       # Source/brand badge component
│   ├── UserMenu.tsx          # User dropdown menu
│   ├── useScraper.ts         # React hook for scraping operations
│   └── useSearchHistory.ts   # React hook for search history management
│
├── lib/                      # Core business logic
│   ├── auth/
│   │   ├── options.ts        # NextAuth configuration (Google + Credentials)
│   │   └── password.ts       # Password hashing/verification utilities
│   ├── db/
│   │   ├── models.ts         # Mongoose schemas and model definitions
│   │   └── mongodb.ts        # MongoDB connection singleton
│   ├── email/
│   │   └── send.ts           # Email sending utilities
│   ├── scrapers/
│   │   ├── amazon.ts         # Amazon.eg scraper implementation
│   │   ├── jumia.ts          # Jumia.com.eg scraper implementation
│   │   ├── noon.ts           # Noon.com scraper implementation
│   │   └── googleShopping.ts # Google Shopping scraper (placeholder)
│   ├── search/
│   │   ├── normalize.ts      # Product name normalization for comparison
│   │   ├── score.ts          # Relevance scoring algorithm
│   │   └── stopwords.ts      # Arabic stopwords for search
│   ├── audit.ts              # Audit logging utilities
│   ├── quota.ts              # Rate limiting and quota management
│   ├── types.ts              # Shared TypeScript interfaces
│   ├── utils.ts              # General utility functions
│   └── products.js           # Product data utilities
│
├── public/                   # Static assets
│   ├── icons/
│   │   ├── amazon-shopping-alt-svgrepo-com.svg
│   │   ├── arrow-left.svg
│   │   └── globe.svg
│   └── explore-svgrepo-com.svg
│
└── .kilo/                    # Kilo configuration (if applicable)
```

---

## 4. Database Models

All database models are defined in `lib/db/models.ts` using Mongoose schemas.

### 4.1 User Model

Stores user account information.

```typescript
{
  name: string,              // Required, trimmed
  email: string,             // Required, unique, lowercase, trimmed, indexed
  passwordHash: string,      // Select: false (excluded from queries by default)
  image: string,             // Optional profile image URL
  provider: 'credentials' | 'google',  // Auth provider type
  emailVerified: boolean,    // Default: false
  emailVerifiedAt: Date,     // Optional
  plan: 'free' | 'pro' | 'premium',    // Default: 'free', indexed
  planRenewsAt: Date,        // Optional subscription renewal date
  paymobCustomerId: string   // Optional payment integration ID
}
```

**Indexes:** `email` (unique), `plan`

### 4.2 SearchHistory Model

Stores user search history entries.

```typescript
{
  userId: ObjectId (ref: 'User'),  // Required, indexed
  query: string,                   // Required, trimmed
  timestamp: Date,                 // Default: Date.now, indexed
  resultCount: number,             // Default: 0
  bestPrice: number,               // Optional
  bestSource: string,              // Optional
  pinned: boolean,                 // Default: false
  savedProducts: [SavedProductSchema],  // Array of saved products
}
```

**Indexes:** `{ userId: 1, timestamp: -1 }`, `{ userId: 1, query: 1 }` (with case-insensitive collation)

### 4.3 SavedProduct Schema (Sub-document)

```typescript
{
  name: string,      // Required
  price: number,     // Required
  currency: string,  // Required
  seller: string,    // Required
  url: string,       // Required
  source: string,    // Required
  image: string      // Default: ''
}
```

### 4.4 EmailVerificationToken Model

Stores email verification tokens.

```typescript
{
  userId: ObjectId (ref: 'User'),    // Required, indexed
  tokenHash: string,                 // Required, unique, indexed
  expiresAt: Date,                   // Required, indexed (expires: 0 for TTL)
  consumedAt: Date                   // Optional
}
```

### 4.5 AuditLog Model

Stores audit trail for all significant actions.

```typescript
{
  userId: ObjectId (ref: User),  // Optional, indexed
  ip: string,                    // Optional, indexed
  action: string,                // Required, indexed
  query: string,                 // Optional
  resultCount: number,           // Optional
  meta: Mixed                    // Optional flexible metadata
}
```

**Indexes:** `{ createdAt: -1 }`, `{ ... }`

---

## 5. Authentication System

Authentication is handled via NextAuth.js v4 with JWT session strategy.

### Configuration: `lib/auth/options.ts`

**Session Strategy:** JWT with 30-day max age

**Providers:**

1. **Google OAuth** (optional - enabled only if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set)
2. **Credentials Provider** (email/password) - always enabled

### Key Behaviors:

- **Google Sign-In:** Automatically creates a new user if one doesn't exist with that email. Updates existing user's image and emailVerified status if signing in for the first time via Google.
- **Credentials Sign-In:** Validates email/password against stored bcrypt hash.
- **JWT Token:** Includes user `id`, `plan` (always 'free' on Google sign-in), and `emailVerified` status.
- **Session Refresh:** Periodically refreshes user data from database (plan, emailVerified) on each session callback.

### Password Utilities: `lib/auth/password.ts`

- Uses `bcryptjs` for hashing and verification
- Handles password comparison securely

---

## 6. API Routes

### 6.1 POST /api/scrape - Main Scraping Endpoint

**File:** `app/api/scrape/route.ts`

This is the core API endpoint that handles product scraping requests.

**Request:**
- `Content-Type: application/json`
- Body: `{ "query": "product name" }`
- Query length: 1-100 characters
- Requires authentication (session-based)

**Response (Success 200):**
```json
{
  "totalScraped": 45,
  "count": 42,
  "products": [
    {
      "name": "Product Name",
      "price": 12999,
      "currency": "EGP",
      "seller": "Amazon.eg",
      "url": "https://...",
      "source": "Amazon.eg",
      "image": "https://...",
      "score": 5,
      "relevance": 1.0
    }
  ],
  "quota": {
    "remaining": { "hour": 9, "day": 4 },
    "limit": { "perHour": 10, "perDay": 5 }
  }
}
```

**Response (Quota Exceeded 429):**
```json
{
  "error": "وصلت للحد اليومي. حاول بكره أو رقّي حسابك.",
  "quota": {
    "remaining": { "hour": 0, "day": 0 },
    "limit": { "perHour": 10, "perDay": 5 },
    "reason": "day"
  }
}
```

**Error Responses:**
- `400`: Invalid body or missing/invalid query
- `429`: Rate limit exceeded

### 6.2 GET/POST/DELETE /api/history - Search History Management

**File:** `app/api/history/route.ts`

- **GET**: Returns last 100 search history entries for authenticated user
- **POST**: Creates a new search history entry
- **DELETE**: Deletes all non-pinned history entries for the user

### 6.3 POST /api/history/merge - Merge History Entries

**File:** `app/api/history/merge/route.ts`

Merges duplicate search history entries.

---

## 7. Web Scrapers

The application scrapes three Egyptian e-commerce platforms. All scrapers use Puppeteer for headless browser automation.

### 7.1 Amazon.eg Scraper (`lib/scrapers/amazon.ts`)

**URL Pattern:** `https://www.amazon.eg/s?k={query}&page={page}`

**Features:**
- Scrapes up to 3 pages of results (max 200 products per site)
- CAPTCHA detection (checks for `#captchacharacters`, `validateCaptcha`, "robot check", "sorry" in title)
- Debug screenshot saved when CAPTCHA or no products detected
- Multiple fallback selectors for product cards, names, prices, images
- Auto-scroll implementation to load lazy-loaded content
- Arabic to Western numeral conversion for prices
- Price extraction removes currency symbols (EGP, ج.م., جنيه, LE)
- Random delays between pages (2-4 seconds)

**Selectors Used:**
- Product cards: `div[data-asin]:not([data-asin=""])`
- Name: `h2 a span`, `h2 span`, `.a-text-normal`
- Price: `.a-price span.a-offscreen`, `span.a-price-whole`, `span[data-a-color="price"] .a-offscreen`
- Image: `img.s-image`, `img[data-image-latency="s-product-image"]`

### 7.2 Jumia.com.eg Scraper (`lib/scrapers/jumia.ts`)

**URL Pattern:** `https://www.jumia.com.eg/catalog/?q={query}`

**Features:**
- Pagination support (clicks "Next" button until max products reached or no more pages)
- Arabic to Western numeral conversion
- Price cleaning (removes EGP, ج.م., commas)
- Multiple selectors for robustness
- Random delays between actions
- Max 120 second navigation timeout

**Selectors Used:**
- Product cards: `article.prd`, `article.-paxs`
- Name: `h3.name`, `div.name`
- Price: `div.prc`, `div.-price`
- Image: `img[data-src]`, `img[src]`
- Next button: `a[aria-label="Next page"]`, `a[title="Next"]`

### 7.3 Noon.com Scraper (`lib/scrapers/noon.ts`)

**URL Pattern:** `https://www.noon.com/egypt-ar/search?q={query}`

**Features:**
- Smart scroll-and-wait mechanism to trigger lazy loading
- Scrolls until no new products appear for 3 consecutive attempts (max 10 scrolls)
- Multiple image source fallbacks (src, data-src, data-lazy-src)
- Placeholder image detection
- Multiple selectors for product elements

**Selectors Used:**
- Product cards: `[data-qa="plp-product-box"]`, `div[class*="PBoxLinkHandler"]`
- Name: `[data-qa="plp-product-box-name"]`, `h2[class*="title"]`
- Price: `[data-qa="plp-product-box-price"] strong[class*="amount"]`
- Image: `img[class*="productImage"]`, `img[alt*="Image 1"]`, `img`

### 7.4 Common Scraper Features

All scrapers:
- Return products with the interface: `{ name, price, currency, seller, url, source, image }`
- Handle navigation timeouts gracefully
- Log extraction progress to console
- Support a configurable `maxProducts` parameter (default: 15)
- Include random delays to reduce detection as automated scraping

---

## 8. Search Normalization & Scoring

### 8.1 Normalization (`lib/search/normalize.ts`)

Normalizes product names for comparison:
- Strips Arabic stopwords
- Lowercases text
- Tokenizes into words
- Returns tokens for comparison

### 8.2 Scoring (`lib/search/score.ts`)

Calculates relevance score between query tokens and product tokens:
- Uses token overlap matching
- Score divided by query length to get relevance percentage
- Minimum relevance threshold: 0.3 (30%)

### 8.3 Stopwords (`lib/search/stopwords.ts`)

Contains Arabic stopwords that are removed during normalization to improve search accuracy.

---

## 9. Quota & Rate Limiting

**File:** `lib/quota.ts`

The quota system limits API usage based on user subscription plans.

### Plan Limits:

| Plan | Per Hour | Per Day |
|------|----------|---------|
| **Free** | 10 | 5 |
| **Pro** | 60 | 50 |
| **Premium** | 200 | 200 |

### Anonymous (Unauthenticated):

| Per Hour | Per Day |
|----------|---------|
| 5 | 10 |

### Implementation:

- Quotas are tracked via `AuditLog` entries with action `scrape.success`
- Counts requests from the last hour and last day
- User-based tracking if authenticated, IP-based if anonymous
- Returns remaining counts in the API response
- Arabic error messages for quota exceeded scenarios:
  - Hour limit: "طلباتك كتير في الساعة دي. استنى شوية."
  - Day limit: "وصلت للحد اليومي. حاول بكره أو رقّي حسابك."

---

## 10. Audit Logging

**File:** `lib/audit.ts`

All significant actions are logged to the `AuditLog` collection for monitoring and debugging.

### Tracked Actions:
- `scrape.success` - Successful scraping requests
- `scrape.quota_exceeded` - Rate limit hit
- `scrape.rate_limited` - General rate limiting
- `auth.register` - User registration
- `auth.verify_email` - Email verification
- `auth.signin` - User sign-in

### Client IP Detection:

Extracts real client IP from:
1. `x-forwarded-for` header (first IP in comma-separated list)
2. `x-real-ip` header
3. Falls back to `0.0.0.0`

---

## 11. Frontend Pages & Components

### 11.1 Pages

| Path | Description |
|------|-------------|
| `/` (`app/page.tsx`) | Landing/home page |
| `/search` (`app/search/page.tsx`) | Main search and results page |
| `/login` (`app/login/page.tsx`) | Login page |
| `/register` (`app/register/page.tsx`) | Registration page |
| `/history` (`app/history/page.tsx`) | Search history page |

### 11.2 Key Features in Search Page

- **Auto-run search** when query is present in URL parameters
- **Source filtering:** Filter results by Amazon, Jumia, Noon
- **Sorting:** Price ascending, price descending, relevance
- **Manual filter input:** Additional text filtering within results
- **Best price highlight:** Shows the lowest-priced product prominently
- **Results skeleton:** Loading state with animated placeholders
- **Search suggestions:** Pre-defined popular search terms
- **Save products:** Users can save products to their search history
- **Shareable URLs:** Search queries are persisted in URL parameters

### 11.3 Custom Hooks

- **`useScraper`** (`components/useScraper.ts`): Manages scraping state, products, filtered results, loading, and error states
- **`useSearchHistory`** (`components/useSearchHistory.ts`): Manages CRUD operations on search history with React hooks

### 11.4 UI Design

- **RTL (Right-to-Left)** Arabic-first interface
- **Glass morphism** styling with `backdrop-blur`
- **Gradient text** effects
- **WebGL Light Rays** animated background using `ogl` library
- **Custom CSS variables** for theming
- **Responsive design** with Tailwind breakpoints

---

## 12. Environment Variables

Required environment variables (see `.env.local.example`):

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string (mongodb:// or mongodb+srv://) | Yes |
| `NEXTAUTH_SECRET` | NextAuth session encryption secret | Yes |
| `NEXTAUTH_URL` | NextAuth base URL | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No (optional) |
| `SCRAPER_URL` | Remote scraper service URL (optional) | No |
| `SCRAPER_TOKEN` | Bearer token for remote scraper | No |

### Remote Scraper Mode

If `SCRAPER_URL` and `SCRAPER_TOKEN` are set, the application will delegate scraping to a remote service via:
```
POST {SCRAPER_URL}/scrape
Authorization: Bearer {SCRAPER_TOKEN}
Body: { "query": "..." }
```

Otherwise, scraping happens locally using Puppeteer.

---

## 13. API Request/Response Formats

### 13.1 POST /api/scrape

**Request Body:**
```json
{
  "query": "iPhone 15 Pro Max"
}
```

**Validation:**
- Query must be a string
- Trimmed length: 1-100 characters
- Returns 400 if invalid

**Success Response (200):**
```json
{
  "totalScraped": 45,
  "count": 42,
  "products": [...],
  "quota": {
    "remaining": { "hour": 9, "day": 4 },
    "limit": { "perHour": 10, "perDay": 5 }
  }
}
```

**Quota Exceeded Response (429):**
```json
{
  "error": "Arabic error message",
  "quota": {
    "remaining": { "hour": 0, "day": 0 },
    "limit": { "perHour": 10, "perDay": 5 },
    "reason": "day" | "hour"
  }
}
```

### 13.2 GET /api/history

**Success Response (200):**
```json
{
  "entries": [
    {
      "id": "string",
      "query": "string",
      "timestamp": 1234567890,
      "resultCount": 0,
      "bestPrice": 0,
      "bestSource": "string",
      "pinned": false,
      "savedProducts": []
    }
  ]
}
```

### 13.3 POST /api/history

**Request Body:**
```json
{
  "query": "string",
  "resultCount": 0,
  "bestPrice": 0,
  "bestSource": "string",
  "savedProducts": [],
  "pinned": false
}
```

**Success Response (201):**
```json
{
  "entry": { ... }
}
```

### 13.4 DELETE /api/history

**Success Response (200):** `{ "ok": true }`

Clears all non-pinned history entries for the authenticated user.

---

## 14. Setup & Installation

### Prerequisites

- Node.js (version 18+ recommended)
- MongoDB (local or MongoDB Atlas)
- npm or pnpm

### Installation Steps

1. **Clone or navigate to the project:**
   ```bash
   cd "C:\Users\HiTech\Desktop\Web-Scrapper-v3\web-scrapper"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Edit `.env.local` and fill in:
   - `MONGODB_URI` - Your MongoDB connection string
   - `NEXTAUTH_SECRET` - A random secret (use `openssl rand -base64 32`)
   - `NEXTAUTH_URL` - Your application URL (e.g., `http://localhost:3000`)
   - Optional: Google OAuth credentials

4. **Ensure MongoDB is running** before starting the application.

---

## 15. Running the Project

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on `http://localhost:3000` |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### Development

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Production Build

```bash
npm run build
npm run start
```

---

## 16. End-to-End Scraping Flow

### Step 1: User Initiates Search

User enters a query (e.g., "جالكسي اس 24") in the search bar. The frontend sends:
```
POST /api/scrape
Authorization: (NextAuth session cookie)
{ "query": "جالكسي اس 24" }
```

### Step 2: API Validates Request

- Validates query length (1-100 chars)
- Extracts user ID and plan from session
- Extracts client IP for anonymous rate limiting

### Step 3: Quota Check

- Connects to MongoDB
- Counts successful scrapes in the last hour/day
- Checks against plan limits
- Returns 429 if limit exceeded

### Step 4: Scraping Execution

If quota allows, the system launches a Puppeteer browser and sequentially scrapes:
1. **Amazon.eg** - with 5-10 second random delay before starting
2. **Random delay** (5-10 seconds between sites)
3. **Jumia.com.eg** - with 5-10 second random delay before starting
4. **Random delay** (5-10 seconds between sites)
5. **Noon.com** - with 5-10 second random delay before starting

Each site scraper:
- Creates a new browser page
- Applies stealth measures (viewport, user agent, HTTP headers, webdriver flag override, chrome runtime shim, languages, plugins)
- Navigates to search URL
- Waits for product selectors
- Auto-scrolls to load lazy content
- Extracts product data (name, price, currency, seller, url, source, image)
- Closes the page
- Random delay (2-4 seconds) between pages

### Step 5: Stealth Measures Applied

- Viewport: 1280x900
- User Agent: Windows Chrome/120
- Headers: Arabic/English Accept-Language, standard Accept
- Navigator.webdriver set to false
- Chrome runtime shim added
- Navigator.languages set to Arabic/Egyptian
- Navigator.plugs populated with fake entries

### Step 6: Data Processing

- Raw products from all scrapers are collected
- Each product name is normalized (tokenized, stopwords removed)
- Query tokens are extracted
- Relevance score calculated: `score / queryTokens.length`
- Products filtered: `relevance >= 0.3`
- Results sorted by price (ascending)

### Step 7: Response

Returns filtered products with best price highlighted, remaining quota, and total scraped count. The frontend displays results with sorting, filtering, and source breakdown.

---

## 17. Key Features & Design Decisions

### 17.1 Built From Zero

Every component of this project was developed from scratch:
- Custom scraping logic for each e-commerce site
- Custom authentication system integration
- Custom quota and rate-limiting logic
- Custom search normalization and relevance scoring
- Custom React hooks for state management
- Custom UI components with Arabic RTL support
- Custom database models and connection handling
- Custom audit logging system

### 17.2 Arabic-First Design

- UI uses Arabic language by default
- RTL layout (`dir="rtl"`)
- Arabic numeral to Western numeral conversion in price parsing
- Arabic stopwords for search normalization
- Arabic error messages for quota limits

### 17.3 Robust Scraping

- Multiple fallback CSS selectors for each site
- CAPTCHA detection with debug screenshots
- Auto-scroll for lazy-loaded content
- Random delays to mimic human behavior
- Stealth browser configuration

### 17.4 Plan-Based Access

- Three subscription tiers (Free, Pro, Premium)
- Hourly and daily quotas
- Anonymous user support with lower limits
- Audit trail for all usage

### 17.5 Search History & Saved Products

- Last 100 searches stored per user
- Pinned searches persist through deletion
- Save individual products to history
- Best price and source tracking per search

### 17.6 Security Considerations

- Passwords hashed with bcrypt
- NextAuth JWT sessions with configurable expiry
- MongoDB connection validation
- Input validation on all API endpoints
- Audit logging for security monitoring
- Password hash excluded from default queries (`select: false`)

---

## Contributing

This is a personal project built from zero. The codebase is structured for maintainability with clear separation between:
- API routes (`app/api/`)
- Business logic (`lib/`)
- UI components (`components/`)
- Styling (`globals.css`, Tailwind)

---

## License

This project is private and proprietary.
