# Crooms Connect

This is the repo for the [CroomsConnect](https://croomsconnect.com) frontend.

## Developing

**_IMPORTANT NOTICE_**: Yes, a lot of the files have been refactored to
typescript but a lot still are `.jsx` files. _For those files, continue
developing as you would Javascript, because it will work._ I (uss-stargazer) am
working on actually making these typescript (anyone can help if they want but I
just want to put it out there).

### Dev server

For creating at http://localhost:3000/:

- `npm install` (for the dependencies)
- `npm run dev` for (the localhost server to run)
- when you finish and go to commit: `npm run build` (to make sure there's no
  errors)

  ### Fixes for issues with Node.js
  - Often times the county resets files and removes compilers sadly.
  - Use the provided Repo link and follow the instructions if your having issues
    getting Node.js on your school laptop!
  - https://github.com/DatnerdAshley/Node.js-Admin-UAC-Bypass
  - Do note Vite does require a later verison not in the script please utlize
    22.22.2!

### Supabase Typescript Types

Supabase has a
[feature to generate Typescript types](https://supabase.com/docs/guides/api/rest/generating-types)
for all the data in public tables:

- `npx supabase login`
- `npx supabase init`
- Set $PROJECT_REF to the Supabase project id
  - `$env:PROJECT_REF = ... # powershell`
  - `PROJECT_REF=... # bash`
- `npm run update-types`

### Typescript

This project has migrated to [Typescript](https://www.typescriptlang.org/).
Typescript is a superset of Javascript, so you could paste Javascript code and
it would technically run. The difference is that Typescript has type guards that
make programming easier once you get the hang of it.

#### Some useful guides:

- https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html
- https://react.dev/learn/typescript

#### `.d.ts` files

A lot of files have been left as `.jsx`. When a `.tsx` file imports that `.jsx`,
it needs to know the types of the exported stuff, so a corresponding `.d.ts`
file is created alongside the `.jsx` to provide typescript definitions.

### Formatting/linting

This project uses two standard tools (plz use if you can!):

- [Prettier](https://prettier.io/): In VSCode, there's an
  [extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  and I would also highly recommend checking the `Format on Save` vscode
  setting.

<details>
    <summary>details</summary>
    - Prettier is a code formatter, which is very useful because it prevents commits on github that only change the formatting of the
    document.
    - The config (`.prettierrc`) makes it so that those that use Prettier (ideally everyone) styles code the same.
</details>

- [ESLint](https://eslint.org/): In VSCode, there's an
  [extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).

<details>
    <summary>details</summary>
    - ESLint is a linter that does deeper error
      checking/formatting/best practices.
    - Again, there's the config file,
      `eslint.config.js`
    - The build will fail if you don't address ESLint errors!
</details>

### Be nice to other devs on Git, code-wise

Not trying to be a jerk, but these really are good practices to get into the
habit of in professional coding:

- Always run `npm run build` before committing!
- Don't create commits that only change the code formatting/style (ie,
  indentation, etc)
- Say what you're doing in the commit, briefly
- If you think there's something in your commit that will trigger another dev,
  just make a comment in the commit description.
- This is just a preference, but a lot of devs use
  [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

## Notes

- The
  [OfficialAlert](https://fontstruct.com/fontstructions/show/2374925/easyplus-display)
  font (`src/assets/fonts/OfficialAlert.woff2`) is only for personal use. Can't
  use this font if this website makes a profit.
