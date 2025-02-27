# LaTeX 4000 Website Source Code

**<https://nonacademic.net>**

## Dependencies

- Node.js 22 (or use the provided [`nvm`](https://github.com/nvm-sh/nvm) config)

## Development setup

- Clone the repository: `git clone https://github.com/Latex4000/website.git && cd website`
- Install dependencies: `npm install`
- Run the development server: `npm run dev`

The server will be exposed at `http://localhost:4321/`, and the `dev/` directory will be used for the DB file and upload storage. Files under `dev/` will be reset on every run of the development server.

If testing with the Discord bot, you can add `DEVELOPER_DISCORD_ID=<your user ID>` to `.env` to have the development server create a user for you. Right click on your Discord profile and click "Copy User ID" to get the ID.

## Deployment

- Build and deploy: `npm run deploy`

Only [VINXIS](https://github.com/VINXIS) and [cl8n](https://github.com/cl8n) can deploy for now.
