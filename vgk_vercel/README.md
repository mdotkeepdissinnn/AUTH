# VGK Auth sur Vercel (remplace l'ancien backend down)

## Deploy
1. Mets le dossier `vgk_vercel` sur GitHub (dossier racine du repo :
   `package.json`, `api/`, `public/`).
2. https://vercel.com → Add New → Project → importe le repo → Deploy.
3. Storage → Create Database → KV → connecte-la au projet (cree
   les variables KV_REST_API_URL + KV_REST_API_TOKEN tout seul).
4. Redeploy si besoin. Ouvre l'URL → login **admin / Tas1212.?**
   (compte auto-cree au premier login).
5. Cree ton app, copie sa cle API.

## Client EXE
`VGK_HOST` = ton domaine vercel (sans https), `VGK_PATH` = `/api/verify`.
Envoie-moi l'URL, je rebuild l'EXE avec le nouveau host.
HMAC_SECRET par defaut = celui du .cpp (changeable en variable
d'environnement Vercel, mais alors change aussi VGK_HMAC_SECRET + rebuild).
