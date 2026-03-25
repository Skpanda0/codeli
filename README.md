# codeli

A full-stack monorepo featuring a **Next.js** frontend and an **Express.js** backend — built for collaborative coding experiences. Mainly focus on agentic ai use for code generate , seraching and url context for projects. 

## Project Structure

```
codeli/
├── client/       # Next.js app (TypeScript)
├── server/       # Express.js API (JavaScript)
└── .gitignore
```

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | Next.js |
| Backend  | Node.js, Express.js     |

## CLI Usage

The `codeli` CLI lets you interact with the platform directly from your terminal.

### Install the CLI

```bash
npm install -g codeli
```

### Commands

| Command          | Description                              |
|------------------|------------------------------------------|
| `codeli login`   | Authenticate and log in to your account  |
| `codeli logout`  | Log out from your current session        |
| `codeli wakeup`  | Wake up the codeli server                |

### Examples

```bash
# Log in to codeli
codeli login

# Wake up the codeli server
codeli wakeup

# Log out
codeli logout
```

---

## Environment Variables

Before running the server, create a `.env` file inside the `server/` directory with the following variables:

```env
# Server
PORT=5000

# Database
DATABASE_URL=your_database_url

# Auth (Better Auth)
BETTER_AUTH_SECRET=your_better_auth_secret
BETTER_AUTH_URL=http://localhost:5000

# OAuth — GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# AI
GOOGLE_GENERATIVE_AI_API_KEY=your_google_generative_ai_api_key
CODELI_MODEL=gemini-1.5-flash
```

> **Note:** Never commit your `.env` file to version control. It is already listed in `.gitignore`.

### Variable Reference

| Variable                      | Description                                          |
|-------------------------------|------------------------------------------------------|
| `PORT`                        | Port the Express server listens on                   |
| `DATABASE_URL`                | Connection string for your database                  |
| `BETTER_AUTH_SECRET`          | Secret key used by Better Auth for signing tokens    |
| `BETTER_AUTH_URL`             | Base URL of your auth server                         |
| `GITHUB_CLIENT_ID`            | GitHub OAuth App client ID                           |
| `GITHUB_CLIENT_SECRET`        | GitHub OAuth App client secret                       |
| `GOOGLE_GENERATIVE_AI_API_KEY`| API key for Google Generative AI (Gemini)            |
| `CODELI_MODEL`                | The AI model to use (e.g. `gemini-1.5-flash`)        |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/Skpanda0/codeli.git
cd codeli
```

### 2. Start the Client

```bash
cd client
npm install
npm run dev
```

The Next.js app will be available at `http://localhost:3000`.

### 3. Start the Server

Open a new terminal:

```bash
cd server
npm install
npm run dev
```

The Express server will start on its configured port (default: `http://localhost:5000`).

## Development

Both the client and server support hot-reloading in development mode via `npm run dev`.

Run them simultaneously in separate terminal windows, or use a process manager like [concurrently](https://www.npmjs.com/package/concurrently) if you prefer a single command.

## Scripts

### Client (`client/`)

| Command         | Description                    |
|-----------------|--------------------------------|
| `npm run dev`   | Start development server       |
| `npm run build` | Build for production           |
| `npm start`     | Run the production build       |
| `npm run lint`  | Lint the codebase              |

### Server (`server/`)

| Command         | Description                    |
|-----------------|--------------------------------|
| `npm run dev`   | Start server with hot-reload   |
| `npm start`     | Start server in production     |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

## License

This project is open source.
