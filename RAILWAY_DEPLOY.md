# Déploiement sur Railway

## Étapes pour déployer

### 1. Créer un compte Railway
- Va sur [railway.app](https://railway.app)
- Crée un compte ou connecte-toi avec GitHub

### 2. Créer un nouveau projet
- Clique sur "New Project"
- Sélectionne "Deploy from GitHub repo"
- Choisis ton repo `monad-blitz-denver-flyingpizza`

### 3. Configurer les variables d'environnement
Dans Railway, va dans "Variables" et ajoute :

**Variables requises :**
```
NODE_ENV=production
PORT=3000
MONAD_RPC_URL=https://testnet-rpc.monad.xyz/
PRIVATE_KEY=0xca3d9c48b62d401175d03442c1015881aa5ac6d7a05b6147c564b2eb396eeb6f
```

**Adresses des contrats (déjà déployés) :**
```
GAME_CONTRACT_ADDRESS=0xa61B7774125BB9C997A80549d6154316abe64ae5
PAYMASTER_CONTRACT_ADDRESS=0xC9b7Fd8454732B2CdE9A0d8273dbd741af2469c7
SESSION_KEY_VALIDATOR_ADDRESS=0x3eB2D2A412728638De5e04b483E16A87052769e8
NFT_CONTRACT_ADDRESS=0x61906f9149e243F498d8Ed08285680f262b57FD2
```

**Variables frontend (VITE_*) :**
```
VITE_GAME_CONTRACT_ADDRESS=0xa61B7774125BB9C997A80549d6154316abe64ae5
VITE_PAYMASTER_ADDRESS=0xC9b7Fd8454732B2CdE9A0d8273dbd741af2469c7
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz/
VITE_CHAIN_ID=10143
```

### 4. Configurer le domaine public
- Dans Railway, va dans "Settings" → "Networking"
- Active "Generate Domain" pour obtenir une URL publique (ex: `pizza-sky-race.railway.app`)
- Railway va automatiquement définir `RAILWAY_PUBLIC_DOMAIN`

### 5. Déployer
Railway va automatiquement :
1. Détecter le `Procfile`
2. Exécuter `npm run build` pour builder le frontend
3. Lancer `npm start` pour démarrer le serveur

### 6. Accéder au jeu
Une fois déployé, tu auras une URL publique comme :
`https://pizza-sky-race.railway.app`

Tu peux :
- Ouvrir cette URL sur ton PC
- Scanner le QR code avec ton téléphone
- Jouer depuis n'importe où !

## Notes importantes

- **HTTPS/WSS** : Railway fournit automatiquement HTTPS, donc le WebSocket utilisera `wss://`
- **Port dynamique** : Railway définit automatiquement `PORT`, le code s'adapte
- **Build automatique** : À chaque push sur GitHub, Railway redéploie automatiquement

## Dépannage

### Le build échoue
- Vérifie que toutes les dépendances sont dans `dependencies` (pas `devDependencies`)
- Vérifie les logs dans Railway

### Le WebSocket ne se connecte pas
- Vérifie que `RAILWAY_PUBLIC_DOMAIN` est défini
- Le frontend devrait utiliser `wss://` automatiquement en production

### Les contrats ne fonctionnent pas
- Vérifie que toutes les adresses de contrats sont dans les variables d'environnement
- Vérifie que `MONAD_RPC_URL` est correct
