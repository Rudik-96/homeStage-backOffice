# HomeStage Back office

Admin website for HomeStage AI: users, paying and free people, designs, bad results, gifts and blocking.

- Site: https://rudik-96.github.io/homeStage-backOffice/
- It talks to the Firebase project `homestage-web` through one server function, `adminApi`
  (see `functions/helpers/admin.js` in the main repo). Only Google accounts listed in the
  Firestore collection `admins` (document id = the email in lowercase) can use it.
- Run here: `npm install`, then `npm run dev` (http://localhost:5174).
- Put it online: `npm run deploy` (builds and pushes the `gh-pages` branch).

No secrets are in this repo. The Firebase keys in `src/firebase.js` are public.
