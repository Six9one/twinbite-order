# Chantiers en cours

*(Aucun chantier en cours)*

## À valider / en attente (aucun fichier verrouillé)
- Bug borne « 2 pizzas choisies → 1 seule reçue » : non reproduit, attendre un n° de commande réel.
- Doublons d'options en base (crudités actives en double, copies inactives ailleurs) : masqués par le code, à nettoyer dans l'admin.
- Impression au resto : après `METTRE_A_JOUR.bat`, `/status` doit afficher codeVersion `3ae565662177`. Valider sur un vrai ticket POS + borne que le ticket suspendu au mur se lit dans le bon sens.
- Secrets des edge functions encore vides sur le VPS (`.env.twinpizza-functions`) : `TELEGRAM_ADMIN_CHAT_IDS`, Twilio, myPOS, Stripe, WhatsApp, VAPID.
