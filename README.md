# DocketCC

AI-powered FCC docket tracking and monitoring system with simple email authentication.

## Features
- Simple email-based authentication (no OAuth complexity)
- FCC docket tracking and monitoring
- AI-powered document summaries
- Subscription management

## Quick Start
1. Visit the deployed app
2. Enter your email address to sign in
3. Start tracking FCC dockets immediately

---

*Last updated: Force deployment with simple auth system*

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run TypeScript type checking
- `npm run check:watch` - Run TypeScript type checking in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint and fix issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting with Prettier

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
