# Coordination des agents — TwinBite Order

Ce dépôt est modifié par plusieurs IA (Claude Code, Antigravity/Gemini, Codex, Cursor…). Les fichiers Markdown du dépôt sont la mémoire commune : ce qui n'y est pas écrit est inconnu des autres agents.

## Avant de commencer
1. Lire `CLAUDE.md` (stack, commandes, infrastructure VPS, impression).
2. Lire le haut de `.agents/JOURNAL.md` (derniers travaux, pièges découverts).
3. Lire `.agents/EN-COURS.md` pour ne pas toucher aux mêmes fichiers qu'un autre agent.

## Pendant le travail
- Noter dans `.agents/EN-COURS.md` le chantier et les fichiers touchés.
- Ne pas laisser de grosses modifications non commitées sans entrée dans le journal.
- Ne jamais commiter de données clients (CSV, listes de numéros, `public/clients_master.json`) ni de secrets.

## Après le travail
1. Ajouter une entrée en haut de `.agents/JOURNAL.md` : date, agent, Fait, Fichiers touchés, Infrastructure & Serveur, À savoir / Pièges, Reste à faire.
2. Mettre à jour `CLAUDE.md` si les commandes, l'architecture ou l'infrastructure ont changé.
3. Vider l'entrée correspondante de `.agents/EN-COURS.md`.

## Règles critiques (voir `CLAUDE.md` pour le détail)
- Imprimante Ethernet 192.168.1.200 : ESC/POS uniquement (aucune commande Star Line) et montée à l'envers (garder `ESC { 1` + inversion par ligne physique).
- Le PC du resto se met à jour avec `METTRE_A_JOUR.bat` ; la version qui tourne se vérifie sur `http://localhost:3001/status` (`codeVersion`).
- Supabase = VPS `https://supabase.twinpizza.fr`. Ne jamais revenir à l'ancien projet cloud `*.supabase.co`.
- Conteneur edge functions partagé avec d'autres apps : ne pas toucher `main`, `_shared` ni les dossiers qui ne sont pas à Twin Pizza.
