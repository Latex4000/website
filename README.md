# LATEX4000 Website Source Code

Site <https://nonacademic.net>

Editing site:

- Clone repository to a folder `git clone https://github.com/Latex4000/website.git`
- Go to new folder `cd website`
- Run `npm install`
- Run `npm run dev`
- Open `http://localhost:4321/` in your browser
- Edit files in `src/` directory.
    - Pages are in `src/pages/`, think of .astro as .html 2

Deploying site:

- Run `npm run deploy`

Prod. Migrations:

- Run `npm run db:pull` to bring prod data locally
- Run `node db/migrate.mjs latex.db <MIGRATIONNUMBER>` to migrate db
- Run `npm run db:push-evil` to push local data to prod

Yay
