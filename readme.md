# MiniLedger

MiniLedger is a mobile application for tracking money lent to friends, recording repayments, and monitoring overdue loans.

## Features

- Phone number login with OTP verification.
- Add loans with a friend's name, amount, and due date.
- View all loan entries.
- Mark loans as repaid.
- Highlight overdue loans.
- View total lent, total repaid, and overdue amount.
- JWT-based API authentication.
- PostgreSQL database for persistent storage.

## Tech Stack

**Backend**
- Node.js
- Express.js
- TypeScript
- PostgreSQL (Neon)
- JWT authentication

**Mobile**
- React Native
- Expo
- TypeScript
- Expo Router
- Expo SecureStore

## Project Structure

- `server/` — Backend API and database integration.
- `client/mobile/` — React Native mobile application.

## Setup

### 1. Backend

```bash
cd server
npm install
```

Create a `.env` file using your local environment configuration. Add your PostgreSQL connection string, JWT secret, and required port settings. Never commit secrets to GitHub.

Start the development server:

```bash
npm run dev
```

### 2. Mobile application

Open a second terminal:

```bash
cd client/mobile
npm install
npx expo start
```

Configure the mobile API base URL in `src/lib/api.ts` to use your computer's reachable IP address when testing on a physical phone. Ensure the phone and computer are on the same Wi-Fi network.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/request-otp` | Request an OTP |
| POST | `/api/auth/verify-otp` | Verify OTP and receive a token |
| GET | `/api/health` | Check API and database health |
| GET | `/api/loans` | List the authenticated user's loans |
| POST | `/api/loans` | Create a loan |
| PATCH | `/api/loans/:id/repay` | Mark a loan as repaid |
| GET | `/api/summary` | Retrieve lending summary |

Protected endpoints require a valid JWT in the `Authorization: Bearer <token>` header.

## OTP Login

For this assignment, the generated OTP is printed in the backend terminal rather than sent through an SMS provider. OTPs expire after a limited time and have a limited number of verification attempts.

## Security

- Parameterized SQL queries.
- JWT-protected loan and summary endpoints.
- Input validation for loan details.
- User-specific loan ownership checks.
- Environment variables for secrets and database configuration.

## Future Improvements

- Receipt image uploads.
- Automated API test coverage.
- Production SMS OTP integration.

## Author

Athul Rathor