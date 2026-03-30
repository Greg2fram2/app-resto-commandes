# Pré-Spécifications — Application de commande en restaurant

**Version** : 0.1 — MVP
**Date** : 31 mars 2026
**Auteurs** : Grégoire de Framond, Léo [à compléter]
**Statut** : Draft — en cours de validation

---

## 1. Vision produit

### 1.1 Problème

La communication en restaurant repose sur une chaîne orale fragile : le client formule sa commande au serveur, qui la transmet à la cuisine. Chaque maillon introduit des risques d'incompréhension — accents, bruit ambiant, écriture illisible, barrière linguistique. Le résultat : erreurs de commande, plats renvoyés, frustration des deux côtés.

### 1.2 Solution

Une application de commande digitale en deux faces :

- **Face client** : le client consulte le menu sur son téléphone (via QR code), compose sa commande et la confirme. Zéro téléchargement, zéro friction.
- **Face staff** : les serveurs et la cuisine voient les commandes en temps réel sur tablette. Les serveurs pilotent le rythme d'envoi des plats. La cuisine reçoit et exécute sans avoir besoin de toucher l'écran.

### 1.3 Proposition de valeur

- Élimination des erreurs de communication client → serveur → cuisine
- Support multilingue natif (le client commande dans sa langue, la cuisine reçoit dans la sienne)
- Fluidité du service : le rythme des envois est piloté digitalement
- Pas d'installation requise côté client (PWA)

---

## 2. Utilisateurs et rôles

| Rôle | Description | Interface | Matériel |
|------|-------------|-----------|----------|
| **Client** | Consulte le menu, compose et envoie sa commande | PWA (navigateur mobile) | Son propre smartphone |
| **Serveur** | Pilote le rythme d'envoi, confirme le service des plats | App staff (vue salle) | Tablette mobile |
| **Cuisine** | Reçoit et exécute les commandes | App staff (vue cuisine) | Tablette (fixe ou mobile) |
| **Restaurateur** | Gère le menu, les plats, les prix, la disponibilité | Back-office web | PC / tablette |

---

## 3. Périmètre MVP

### 3.1 Inclus dans le MVP

- Commande digitale via PWA (QR code → menu → commande)
- Affichage temps réel en cuisine avec alertes sonores et visuelles
- Gestion du flux de commandes par les serveurs (envoi, service)
- Re-commande possible par le client
- Back-office restaurateur (gestion menu)
- Fiches plats : nom, prix, ingrédients, allergènes (EU), photos, tags régime
- Support multilingue (interface + contenu menu) — langues à définir
- Une commande = une table entière

### 3.2 Hors MVP (évolutions futures)

- Paiement intégré (Stripe ou autre)
- Statistiques et historique (plats les + commandés, CA par jour)
- Plat du jour / disponibilité limitée (stock temps réel)
- Mode commande individuelle (par personne à la table)
- Programme de fidélité / promotions
- Intégration caisse enregistreuse (POS)

---

## 4. Architecture fonctionnelle

### 4.1 Parcours client

```
[Client scanne QR code]
       ↓
[Menu s'affiche dans le navigateur]
       ↓
[Client browse les catégories, consulte les fiches plats]
       ↓
[Client compose sa commande (panier)]
       ↓
[Client confirme → commande envoyée]
       ↓
[Client peut re-commander à tout moment]
```

**Détails du parcours :**

1. Le client scanne un QR code lié à sa table
2. Le menu s'ouvre dans le navigateur — aucune installation
3. Le client navigue par catégories (entrées, plats, desserts, boissons...)
4. Chaque fiche plat affiche : nom, photo, description, prix, ingrédients, allergènes, tags régime (végan, halal, sans gluten...)
5. Le client ajoute des plats à son panier, ajuste les quantités
6. Il confirme la commande → elle part instantanément côté staff
7. Le client peut passer des commandes supplémentaires depuis la même session
8. Pour annuler un plat, le client doit s'adresser à un serveur (pas de bouton d'annulation dans l'app)

### 4.2 Flux de commande — Machine à états

Un plat commandé passe par les états suivants :

```
EN ATTENTE  →  À LANCER  →  SERVI  →  TERMINÉ

    │              │           │          │
    │              │           │          │
    ▼              ▼           ▼          ▼
 La commande    Le serveur   Le serveur  Payé /
 est reçue,     signale      confirme    débarrassé,
 mais ce plat   que la       avoir       sort du
 n'est pas      table est    servi le    flux
 encore à       prête pour   plat
 préparer       ce service
```

**Règles de transition :**

| Transition | Déclencheur | Exemple concret |
|------------|-------------|-----------------|
| → En attente | Client confirme sa commande | Le client commande entrée + plat + dessert |
| En attente → À lancer | Serveur signale "table prête pour la suite" | Le serveur débarrasse les entrées, appuie sur "envoyer plats" |
| À lancer → Servi | Serveur prend le plat sur le pass | Le cuistot a posé le plat, le serveur appuie "servi" |
| Servi → Terminé | Serveur marque comme payé / terminé | Fin de repas, table libérée |

**Cas particulier — premier service :**
Quand une commande arrive, les entrées (ou le premier service) passent directement à "À lancer". Seuls les services suivants (plats, desserts) restent "En attente".

**Cas particulier — commande sans séquence :**
Pour un resto type fast-casual ou bar/tapas, tous les plats peuvent passer directement à "À lancer" (pas de notion de services successifs). Ce comportement doit être configurable par le restaurateur.

### 4.3 Vue cuisine

La cuisine ne touche pas l'écran. Elle reçoit les informations passivement.

**Affichage :**
- Seuls les plats "À lancer" sont affichés
- Organisés par table et par ordre d'arrivée
- Chaque nouvelle commande déclenche : alerte sonore + clignotement visuel
- Les plats passés à "Servi" disparaissent automatiquement de l'écran

**Important :** L'état "cuisiné / prêt sur le pass" n'existe pas dans l'application. C'est un état physique : le cuisinier pose le plat sur le pass et annonce "service" vocalement. La numérisation de ce moment est gérée par le serveur quand il récupère le plat.

### 4.4 Vue serveur

Le serveur est le pilote du rythme. Ses actions :

| Action | Effet dans l'app |
|--------|------------------|
| Ouvrir une table | Crée une session liée au QR code |
| "Envoyer la suite" | Les plats du service suivant passent de "En attente" à "À lancer" (apparaissent en cuisine) |
| "Plat servi" | Le plat disparaît de l'écran cuisine |
| "Table terminée" | Clôture la session, tous les plats passent à "Terminé" |

### 4.5 Back-office restaurateur

Interface web permettant de :

- Créer / modifier / supprimer des catégories de plats
- Créer / modifier / supprimer des plats (nom, description, prix, photo, ingrédients, allergènes, tags)
- Marquer un plat comme indisponible (grisé côté client)
- Gérer les traductions du menu (par langue)
- Configurer le mode de service (séquentiel ou tout en même temps)
- Gérer les tables (nombre, noms/numéros)
- Générer les QR codes par table

---

## 5. Contraintes techniques

### 5.1 Temps réel

Le temps réel est la contrainte centrale. Le délai entre la confirmation client et l'affichage en cuisine doit être quasi nul (< 2 secondes).

**Technologie recommandée :** WebSocket ou Server-Sent Events (SSE).
**À éviter :** Polling HTTP classique (latence + consommation réseau).

### 5.2 Résilience réseau

Le WiFi en restaurant est souvent instable, surtout en période de service.

**Côté client :**
- Optimistic UI : afficher "commande envoyée" immédiatement
- File d'attente locale : si le réseau tombe entre le clic et la réception serveur, l'app stocke la commande et la renvoie automatiquement à la reconnexion
- Indicateur visuel "hors ligne" discret

**Côté cuisine :**
- Reconnexion WebSocket automatique avec rattrapage des commandes manquées
- L'écran conserve le dernier état connu en cas de déconnexion
- Indicateur "connexion perdue" visible

**Côté serveur (backend) :**
- Chaque commande reçoit un identifiant unique pour éviter les doublons en cas de retry
- Confirmation serveur obligatoire (le client ne considère la commande comme envoyée qu'après accusé de réception)

### 5.3 Lien table ↔ commande (QR code)

**Décision à prendre :** le mécanisme exact du QR code reste à définir. Options à évaluer :

| Option | Avantages | Risques |
|--------|-----------|---------|
| QR fixe (sticker sur table) | Simple, pas de maintenance | Peut être scanné depuis l'extérieur → fausse commande |
| QR dynamique (généré par serveur) | Sécurisé | Nécessite une action du serveur à chaque table |
| QR fixe + validation serveur | Compromis : le client scanne, le serveur confirme l'ouverture | Petite friction supplémentaire |

**Recommandation :** QR fixe + validation serveur. Le client scanne, voit le menu, mais ne peut envoyer de commande qu'une fois que le serveur a "ouvert" la table dans l'app staff.

### 5.4 Multilingue

Deux couches distinctes à gérer :

**Interface (i18n) :** boutons, labels, messages système. Géré via fichiers de traduction standards (JSON par langue). Langues à définir.

**Contenu (menu) :** noms de plats, descriptions, ingrédients. Stockés dans la base de données avec une entrée par langue pour chaque plat. Le restaurateur saisit les traductions via le back-office.

**Côté client :** la langue est détectée automatiquement (navigateur) ou choisie manuellement.
**Côté cuisine :** la langue est configurable indépendamment.

### 5.5 PWA — Contraintes

- L'app client doit fonctionner sur tous les navigateurs mobiles modernes (Chrome, Safari, Firefox)
- Temps de chargement initial < 3 secondes (le client vient de s'asseoir, il ne veut pas attendre)
- Les images des plats doivent être optimisées (WebP, lazy loading, thumbnails)
- Le menu doit être navigable hors ligne une fois chargé (seul l'envoi de commande nécessite le réseau)

### 5.6 Notifications cuisine

- Alerte sonore à chaque nouveau plat "À lancer" — son distinct et reconnaissable
- Clignotement visuel sur les nouvelles entrées (ex : fond qui pulse pendant quelques secondes)
- L'écran ne doit jamais se mettre en veille (wake lock API ou équivalent)

---

## 6. Modèle de données (simplifié)

### Entités principales

**Restaurant**
- id, nom, adresse, configuration (mode service séquentiel / simultané), langues actives

**Table**
- id, restaurant_id, numéro/nom, qr_code_token, statut (libre / occupée)

**Catégorie**
- id, restaurant_id, nom (multilingue), ordre d'affichage

**Plat**
- id, catégorie_id, nom (multilingue), description (multilingue), prix, photo_url, disponible (oui/non), type_de_service (entrée / plat / dessert / boisson / autre)

**Ingrédient**
- id, plat_id, nom (multilingue)

**Allergène**
- id, plat_id, type (enum : gluten, crustacés, œufs, poisson, arachides, soja, lait, fruits à coque, céleri, moutarde, sésame, sulfites, lupin, mollusques)

**Tag régime**
- id, plat_id, type (enum : végan, végétarien, halal, casher, sans gluten, sans lactose...)

**Commande**
- id, table_id, horodatage, statut global (en cours / terminée)

**Ligne de commande**
- id, commande_id, plat_id, quantité, statut (en_attente / a_lancer / servi / terminé), numéro_de_service, notes client (optionnel)

---

## 7. Interfaces — Wireframes textuels

### 7.1 Client — Menu

```
┌─────────────────────────────┐
│  🌐 FR ▼    RESTAURANT XYZ  │
│                              │
│  [Entrées] [Plats] [Desserts]│
│                              │
│  ┌────────────────────────┐  │
│  │ 📷 Photo du plat       │  │
│  │                        │  │
│  │ Salade César      12€  │  │
│  │ Romaine, parmesan,     │  │
│  │ croûtons, anchois      │  │
│  │ ⚠️ Poisson, Gluten, Lait│  │
│  │ 🌿 Sans lactose dispo  │  │
│  │                        │  │
│  │    [ - ] 1 [ + ]       │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ 📷 Risotto aux cèpes   │  │
│  │ ...                    │  │
│  └────────────────────────┘  │
│                              │
│  ┌──────────────────────┐    │
│  │ 🛒 Panier (3) — 47€  │    │
│  │ [ Voir ma commande ] │    │
│  └──────────────────────┘    │
└─────────────────────────────┘
```

### 7.2 Client — Panier / Confirmation

```
┌──────────────────────────────┐
│  Ma commande — Table 7       │
│                               │
│  1x Salade César        12€  │
│  2x Risotto aux cèpes  36€  │
│  1x Tiramisu             9€  │
│                               │
│  ──────────────────────────  │
│  Total                  57€  │
│                               │
│  [ ✅ Confirmer la commande ] │
│                               │
│  ← Modifier                  │
└──────────────────────────────┘
```

### 7.3 Vue cuisine

```
┌──────────────────────────────────────────────────────┐
│  🔴 CUISINE           ● Connecté       🔊 Son: ON   │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ TABLE 7     │  │ TABLE 3     │  │ TABLE 12    │  │
│  │ ⏰ 14:32    │  │ ⏰ 14:28    │  │ ⏰ 14:35    │  │
│  │             │  │             │  │ ✨ NOUVEAU  │  │
│  │ 2x Risotto  │  │ 1x Burger   │  │             │  │
│  │ 1x Pavé     │  │ 1x Fish&C.  │  │ 1x Salade   │  │
│  │    saumon    │  │ 2x Frites   │  │ 1x Soupe    │  │
│  │             │  │             │  │             │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐                    │
│  │ TABLE 1     │  │ TABLE 9     │                    │
│  │ ⏰ 14:30    │  │ ⏰ 14:33    │                    │
│  │             │  │             │                    │
│  │ 3x Pizza    │  │ 1x Tartare  │                    │
│  │ 1x Pasta    │  │ 1x Entrecôte│                    │
│  │             │  │             │                    │
│  └─────────────┘  └─────────────┘                    │
└──────────────────────────────────────────────────────┘
```

### 7.4 Vue serveur

```
┌──────────────────────────────────────────┐
│  👤 SALLE                 Marie (serveur)│
│                                           │
│  TABLE 7 — En cours                       │
│  ├ ✅ Entrées servies                    │
│  ├ 🍳 Plats en cuisine                  │
│  │   2x Risotto, 1x Pavé saumon         │
│  └ ⏳ Desserts en attente                │
│    [ Envoyer les desserts ]               │
│                                           │
│  TABLE 3 — En cours                       │
│  ├ 🍳 Plats en cuisine                  │
│  │   1x Burger, 1x Fish&Chips           │
│  └ [ Marquer comme servi ]               │
│                                           │
│  TABLE 12 — Nouvelle commande ✨         │
│  ├ 🍳 Entrées à lancer                  │
│  │   1x Salade, 1x Soupe                │
│  └ ⏳ Plats en attente                   │
│                                           │
│  [ + Ouvrir une table ]                   │
└──────────────────────────────────────────┘
```

---

## 8. Questions ouvertes

| # | Question | Impact | Statut |
|---|----------|--------|--------|
| 1 | Mécanisme exact du QR code (fixe, dynamique, fixe + validation serveur) | Sécurité, UX | À décider |
| 2 | Langues à supporter pour le MVP | i18n, contenu BDD | À définir |
| 3 | Le client peut-il ajouter des notes/commentaires à un plat ? ("sans oignons", "bien cuit") | Modèle de données, UX cuisine | À discuter |
| 4 | Gestion des suppléments / options (taille, cuisson, accompagnement) | Complexité menu, modèle de données | À définir |
| 5 | Hébergement cible (cloud managé type Vercel/Railway vs VPS) | Coûts, maintenance | À décider |
| 6 | Stack technique (React/Next.js ? React Native ? Quel backend ?) | Architecture | À décider |
| 7 | Comment gérer les tables partagées (2 groupes à la même table) ? | Logique session | À discuter |
| 8 | Faut-il un mode "menu consultation seule" (pas de commande, juste voir le menu) ? | UX, usage marketing | À discuter |
| 9 | Nom du produit | Branding | À trouver |

---

## 9. Prochaines étapes

1. **Valider ce document** avec toute l'équipe
2. **Trancher les questions ouvertes** (priorité : QR code, stack technique, langues)
3. **Produire les maquettes UI** (Figma ou équivalent)
4. **Rédiger les spécifications techniques détaillées** (architecture, API, BDD)
5. **Définir le planning MVP** (jalons, sprint 0)
