# LATEX4000 Website Source Code

Site: https://latex4000.neocities.org/
Neocities: https://neocities.org/site/latex4000

Editing site:
- Clone repository to a folder `git clone https://github.com/Latex4000/website.git`
- Go to new folder `cd website`
- Run `npm install`
- Run `npm run dev`
- Open `http://localhost:4321/` in your browser
- Edit files in `src/` directory.
  - Pages are in `src/pages/`, think of .astro as .html 2

Deploying site:
- Run `npm run build`
- Run `neocities push ./dist` (requires [Neocities CLI](https://neocities.org/cli))

Yay