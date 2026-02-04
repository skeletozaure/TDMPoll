# TDMPoll

Mini web-app de vote en temps réel pour choisir un nom DEV et un nom PROD.

## ✨ Caractéristiques

- ✅ **Votes partagés globalement** via Firebase Firestore
- ✅ **Anti-double-vote** par empreinte numérique du navigateur (fonctionne en réseau d'entreprise)
- ✅ **Real-time updates** — tous les résultats se mettent à jour live
- ✅ **Design moderne** avec animations fluides
- ✅ **100% HTML/CSS/JavaScript** — déployable sur GitHub Pages

---

## 🚀 Déploiement sur GitHub Pages + Firebase

### 1. Créer un projet Firebase

1. Va sur **https://console.firebase.google.com**
2. Clique sur **"Créer un projet"**
3. Donne un nom (ex: `tdmpoll`) et active **Firestore Database**
4. Règle Firestore en **mode test** (lisible/writable par tous les clients)
5. Va dans **Settings** → **Project Settings** → copie la **Web app configuration**

### 2. Configurer le code

Remplace les valeurs dans `app.js` au début du fichier :

```javascript
const firebaseConfig = {
  apiKey: "TON_API_KEY",
  authDomain: "TON_DOMAIN",
  projectId: "TON_PROJECT_ID",
  storageBucket: "TON_STORAGE_BUCKET",
  messagingSenderId: "TON_MESSAGING_SENDER_ID",
  appId: "TON_APP_ID"
};
```

### 3. Pousser sur GitHub Pages

```bash
git add .
git commit -m "Add Firebase integration"
git push origin main
```

Puis dans le repo GitHub → **Settings** → **Pages** → Source: `Deploy from a branch` → `main` → `/root`.

L'app sera disponible à `https://TON_USER.github.io/TDMPoll/`

---

## 🔧 Structure des fichiers

```
.
├── index.html      # Structure HTML
├── styles.css      # Design moderne + animations
├── app.js          # Logique avec Firebase + empreinte navigateur
├── package.json    # Métadonnées (optionnel)
└── README.md       # Ce fichier
```

---

## 🛡️ Sécurité Firebase

Les règles Firestore par défaut en mode test permettent à **tous de lire/écrire**. Pour la production, remplace par :

```json
{
  "rules": {
    "poll": {
      "votes": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

---

## 🧪 Mode test/reset

Ajoute `?reset=1` à l'URL pour :
- Effacer l'empreinte du navigateur
- Réinitialiser les votes sur Firestore

Exemple: `https://TON_USER.github.io/TDMPoll/?reset=1`

---

## 📝 Comment ça fonctionne

### Anti-double-vote
- **Fingerprint navigateur** = SHA256(User-Agent + Langue + Résolution + Canvas)
- Stocké dans **localStorage** (check rapide)
- Vérifié dans **Firestore** (source de vérité)
- **Fonctionne même en réseau d'entreprise** (même IP publique)

### Real-time
- **Listener Firestore** met à jour les résultats tous les 500ms
- Tous les votants voient les résultats instantanément

---

## 🐛 Dépannage

**"Firebase not defined"**
→ Vérifie que les scripts Firebase CDN sont chargés dans `index.html`

**"Permission denied"**
→ Firestore → Rules. Ajoute `.read: true` et `.write: true`

**Votes ne s'enregistrent pas**
→ Ouvre la console (F12) et regarde les erreurs

---

## Auteur

Made with ❤️ for TDM voting

