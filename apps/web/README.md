# @finance/web — Next.js Frontend

The web frontend for the Personal & Household Finance Manager, built with Next.js 16 (App Router) and React 19. For now it is the `create-next-app` starter page — checkpoint C3a adds a first page that calls the API, and the real screens are built in Phase F of the [implementation plan](../../docs/implementation-plan.md).

## Development

```bash
pnpm dev     # Start the dev server on http://localhost:3000
pnpm build   # Production build
pnpm start   # Serve the production build
pnpm lint    # Run ESLint
```

Run these from `apps/web`, or run `pnpm dev` from the repository root to start the frontend and the backend together. First copy `.env.example` to `.env`.

## Project Structure

```
apps/web/
├── .env.example          # Settings template (API_URL) — copy to .env
├── public/               # Static files (icons)
├── src/app/              # App Router: layout.tsx, page.tsx, globals.css
├── AGENTS.md             # Rules for AI coding agents (CLAUDE.md points here)
├── eslint.config.mjs     # ESLint 10 + eslint-config-next (via @eslint/compat)
├── next.config.ts        # Next.js config
└── postcss.config.mjs    # Tailwind CSS 4 via @tailwindcss/postcss
```

## Tech Stack

- **Next.js 16** — App Router, Turbopack
- **React 19**
- **Tailwind CSS 4** — configured in CSS (`@import "tailwindcss"` in `src/app/globals.css`); there is no `tailwind.config.ts`
- **TypeScript 6.0**
- **`next/font`** — loads the Geist font family

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — features and API
- [Learn Next.js](https://nextjs.org/learn) — interactive tutorial
- The docs for the installed Next.js version also ship in `node_modules/next/dist/docs/` (see `AGENTS.md`)
