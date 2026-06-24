# Codeli

A full-stack monorepo featuring a **Next.js** frontend and an **Express.js** backend, paired with a **global CLI tool** for interacting with the platform directly from your terminal. Codeli focuses on agentic AI use for code generation, searching, and URL context for projects — usable from a web dashboard or straight from the command line.

## Features

- 🌐 **Web app** — Next.js frontend for the full Codeli experience
- ⚙️ **API server** — Express.js backend with Prisma + Postgres
- 🔐 **Auth** — Better Auth, with GitHub OAuth and device-code login for the CLI
- 🤖 **AI chat** — Powered by Google Gemini via the Vercel AI SDK
- 💻 **CLI** — `codeli login`, `codeli logout`, `codeli wakeup` — chat with the AI assistant right from your shell

## Tech Stack

| Layer    | Technology                                  |
| -------- | -------------------------------------------- |
| Frontend | Next.js (TypeScript)                         |
| Backend  | Node.js, Express.js                          |
| Database | PostgreSQL (via Prisma ORM, e.g. Neon)       |
| Auth     | Better Auth (device-code flow + GitHub OAuth)|
| AI       | Google Generative AI (Gemini) via Vercel AI SDK |
| CLI      | Commander, @clack/prompts, Chalk, Figlet     |

## Project Structure

```
codeli/
├── client/       # Next.js app (TypeScript) — web frontend
├── server/       # Express.js API + CLI source (JavaScript)
│   ├── src/
│   │   ├── index.js     # Express server entry point
│   │   └── cli/
│   │       └── main.js  # CLI entry point (bin)
│   └── package.json
└── .gitignore
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher (v20+ recommended)
- npm
- A PostgreSQL database (e.g. a free [Neon](https://neon.tech) instance)
- A [Google AI Studio](https://aistudio.google.com/) API key (for Gemini)
- (Optional) A [GitHub OAuth App](https://github.com/settings/developers) if you want GitHub login

---

## 1. Clone the Repository

```bash
git clone https://github.com/Skpanda0/codeli.git
cd codeli
```

## 2. Set Up Environment Variables

Create a `.env` file inside the `server/` directory:

```bash
cd server
touch .env
```

Add the following:

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

| Variable                       | Description                                        |
| ------------------------------- | --------------------------------------------------- |
| `PORT`                          | Port the Express server listens on                   |
| `DATABASE_URL`                  | Postgres connection string                          |
| `BETTER_AUTH_SECRET`            | Secret key used by Better Auth to sign tokens         |
| `BETTER_AUTH_URL`               | Base URL of your auth server                         |
| `GITHUB_CLIENT_ID`              | GitHub OAuth App client ID                           |
| `GITHUB_CLIENT_SECRET`          | GitHub OAuth App client secret                       |
| `GOOGLE_GENERATIVE_AI_API_KEY`  | API key for Google Generative AI (Gemini)            |
| `CODELI_MODEL`                  | Gemini model to use (e.g. `gemini-1.5-flash`)        |


## 3. Install Dependencies & Set Up the Database

```bash
# from server/
npm install
npx prisma generate
npx prisma migrate deploy   # or: npx prisma db push
```

## 4. Start the Server

```bash
# from server/
npm run dev
```
The Express server starts on the port set in `.env` (default `http://localhost:5000`).

## 5. Start the Client

Open a new terminal:

```bash
cd client
npm install
npm run dev
```
The Next.js app will be available at `http://localhost:3000`.

---

## CLI Setup — Run `codeli` Globally From Any Terminal

The CLI source lives in `server/src/cli/main.js`, defined via the `bin` field in `server/package.json`. To make the `codeli` command available everywhere on your machine (not just inside the project folder), link it globally with npm:

```bash
cd server
npm link
```

This creates a global symlink in your npm bin directory pointing at the CLI script, so you can call `codeli` from any directory in any terminal session.

Verify it worked:

```bash
which codeli      # macOS/Linux — should print a path
codeli --help
```

> If you ever move or delete the repo, remove the link with:
> ```bash
> npm unlink -g codeli
> ```

### CLI Commands

| Command         | Description                              |
| ---------------- | ----------------------------------------- |
| `codeli login`   | Authenticate and log in to your account    |
| `codeli logout`  | Log out from your current session          |
| `codeli wakeup`  | Start an AI chat session in your terminal  |

### Examples

```bash
# Log in to Codeli
codeli login

# Start a chat session with the AI
codeli wakeup

# Log out
codeli logout
```

> **Note:** The CLI talks to your local Express server, so the server (`npm run dev` in `server/`) must be running before using `codeli login` or `codeli wakeup`.

---

## Development

Both the client and server support hot-reloading via `npm run dev`. Run them in two separate terminals, or use a process manager like [concurrently](https://www.npmjs.com/package/concurrently) to start both with a single command.

### Scripts — Client (`client/`)

| Command          | Description                |
| ----------------- | --------------------------- |
| `npm run dev`      | Start development server     |
| `npm run build`    | Build for production         |
| `npm start`        | Run the production build     |
| `npm run lint`     | Lint the codebase            |

### Scripts — Server (`server/`)

| Command        | Description                    |
| ---------------- | -------------------------------- |
| `npm run dev`     | Start server with hot-reload     |
| `npm start`       | Start server in production       |

---

## Troubleshooting

- **`command not found: codeli`** — make sure `npm link` was run inside `server/`, and that your npm global bin directory is on your `$PATH`.
- **Prisma can't reach the database** — check that your `DATABASE_URL` is current and your database (e.g. Neon) isn't paused/suspended.
- **`503 / model overloaded` errors from the AI chat** — this is a temporary issue on Google's side for the Gemini model; wait and retry, or switch `CODELI_MODEL` in `.env` to a different available model.

---

## Contributing
- Feel free to contribute this project

## License

This project is open source.
