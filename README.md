# HomeStage Back office

Admin website for HomeStage AI: users, paying and free people, designs, bad results, gifts and blocking.
It is a separate project. The HomeStage app and website do not contain any back office code.

- Site: https://rudik-96.github.io/homeStage-backOffice/ (`npm run deploy`)
- Server: `functions/` (codebase `backoffice`), one function `backOfficeApi`.
  Put it online: `npx firebase-tools deploy --only functions:backoffice --project homestage-web`
- Login: one password, the Firebase secret `ADMIN_PASSWORD`
  (set it with `npx firebase-tools functions:secrets:set ADMIN_PASSWORD --project homestage-web`).
  Five wrong tries lock the door for 15 minutes.
- Databases (both in the Firebase project `homestage-web`):
  - `backoffice` (own): action log, lock of the password. Only this server uses it.
  - `(default)` (HomeStage): people, designs, ratings. The back office reads it and changes only:
    `users/{uid}.blocked`, `users/{uid}.giftGenerations`, the used counters (give a design back),
    `feedback/{id}.status`.
- `functions/planStatus.js` copies the plan rules of the HomeStage server. Keep the numbers the same.
- Run the page here: `npm install`, then `npm run dev` (http://localhost:5174).

No secrets are in this repo. The Firebase keys in `src/firebase.js` are public.
