# DreamStream

DreamStream is a React and TypeScript portal for onboarding, tasks, meetings,
training, and community workflows. It uses Vite, Firebase, shadcn/ui, and Tailwind CSS.

## Local setup

Use Node.js 22 (`nvm use` reads `.nvmrc`) and npm. The commands below use
`package-lock.json` for reproducible installation.

```sh
npm ci
cp .env.example .env.local
```

Fill in `.env.local` with the public web app settings from **Firebase console →
Project settings**. Set `VITE_FIREBASE_DATABASE_URL` to your Realtime Database URL.
All listed Firebase settings are required except `VITE_FIREBASE_MEASUREMENT_ID`.
Never place service-account keys, OAuth client secrets, or other server credentials
in `VITE_` variables: Vite includes them in the browser bundle.

```sh
npm run dev
```

Open http://localhost:8080. Restart Vite after changing environment values.
The legacy `config.env` file and `NEXT_PUBLIC_*` names are not read by this Vite app.
Missing settings produce an error naming the variables that need configuration.

A working Firebase project, enabled authentication providers, database access rules,
and the application's deployed callable functions are required for live workflows.
The socket server is a separate service; configuring the frontend does not create it.

## Validation

```sh
npm run typecheck
npm test
npm run build
```

CI runs these checks after a clean installation on Node.js 22. The tests mock
Firebase and need no credentials or live services; the production build also needs
no credentials, but running the built app requires configuration at build time.
Use `npm run test:watch` during development and `npm run preview` to serve a build.

`npm run lint` remains available, but the existing project has lint violations.
Full-project lint is not yet a CI gate. These tests cover configuration validation,
listener cleanup, and optional Analytics initialization; they do not verify hosted
Firebase authorization, real network behavior, or complete user journeys.

## Contribution history exercise

The contribution commits in this exercise use simulated historical dates.
See [the history note](docs/CONTRIBUTION_HISTORY.md) for the actual implementation
period and scope.
