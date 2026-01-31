# 🎯 TatoJob - Ricerca Lavoro Intelligente

**Repository autonomo e indipendente** - Piattaforma web per ricerca annunci di lavoro con integrazione Adzuna API. Interfaccia ottimizzata per desktop e mobile con design stile app.

## ✨ Caratteristiche

- 🔍 **Ricerca Avanzata**: Filtri per keyword, località, provincia, seniority, stipendio
- 📊 **Statistiche Dettagliate**: Analisi completa dei risultati di ricerca
- 🎯 **Filtro Intelligente**: Esclude risultati non pertinenti (es: "banchista" quando cerchi "banca")
- 📱 **Mobile First**: Design ottimizzato per smartphone e tablet
- ⚡ **Backend Node.js**: Velocità ottimale senza problemi CORS
- 🎨 **UI Moderna**: Interfaccia pulita e intuitiva

## 🚀 Quick Start

### Prerequisiti

- Node.js v20+ ([Download](https://nodejs.org/))
- npm (incluso con Node.js)

### Installazione

1. **Clona il repository**:
   ```bash
   git clone <your-repo-url>
   cd Bot-Ricerca-Lavoro
   ```

2. **Installa le dipendenze**:
   ```bash
   npm install
   ```

3. **Configura le credenziali Adzuna**:
   - Apri `server.js`
   - Sostituisci `appId` e `appKey` con le tue credenziali Adzuna
   - Ottieni le credenziali su [developer.adzuna.com](https://developer.adzuna.com/)

4. **Avvia il server**:
   ```bash
   npm start
   ```

5. **Apri nel browser**:
   ```
   http://localhost:3000/TEST-ADZUNA-API.html
   ```

## 📁 Struttura Progetto

```
Bot Ricerca Lavoro/
├── server.js                 # Backend Node.js/Express
├── package.json              # Dipendenze progetto
├── TEST-ADZUNA-API.html      # Interfaccia principale
├── adzuna-service-backend.js # Servizio client per backend
├── adzuna-service.js         # Servizio client (proxy CORS - alternativo)
├── province-italiane.js      # Lista province italiane
├── README.md                 # Questo file
├── .gitignore               # File da ignorare in Git
└── docs/                    # Documentazione (opzionale)
    ├── STRATEGIA-GTM-RICERCA-LAVORO.md
    ├── SETUP-BACKEND.txt
    └── SOLUZIONE-VELOCITA.md
```

## 🎯 Funzionalità

### Ricerca
- **Keyword**: Cerca per parola chiave (es: "developer", "marketing")
- **Località**: Città o area geografica
- **Provincia**: Menù a tendina con tutte le province italiane
- **Seniority**: Junior, Mid-Level, Senior, Executive
- **Stipendio**: Range minimo e massimo
- **Tipo Contratto**: Permanent, Contract, Part-time

### Filtro Intelligente
- Esclude automaticamente risultati non pertinenti
- Priorità ai match nel titolo
- Esclusioni personalizzate (es: "banca" esclude "banchista")

### Statistiche
- Totale annunci trovati
- Stipendio medio e range
- Percentuale lavori remoti
- Top 5 aziende
- Top 5 località
- Aziende uniche

## 🛠️ Tecnologie

- **Backend**: Node.js + Express
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **API**: Adzuna Jobs API
- **Styling**: CSS Grid, Flexbox, Media Queries

## 📱 Mobile Optimization

L'interfaccia è completamente ottimizzata per mobile:
- Design responsive con breakpoint a 768px e 480px
- Touch-friendly buttons (min-height 44px)
- Font size ottimizzato (16px per evitare zoom su iOS)
- Layout a colonna singola su mobile
- Smooth scrolling e animazioni ottimizzate

## ⚙️ Configurazione

### Credenziali Adzuna

Modifica `server.js`:

```javascript
const ADZUNA_CONFIG = {
  appId: 'TUO_APP_ID',
  appKey: 'TUA_APP_KEY',
  baseUrl: 'https://api.adzuna.com/v1/api/jobs',
  country: 'it'
};
```

### Porta Server

Per cambiare la porta (default: 3000), modifica `server.js`:

```javascript
const PORT = 3000; // Cambia qui
```

## 📊 API Endpoints

### GET `/api/search`
Ricerca annunci di lavoro

**Parametri:**
- `keyword` (required): Parola chiave
- `location` (optional): Località
- `province` (optional): Provincia
- `seniority` (optional): junior, mid, senior, executive
- `salary_min` (optional): Stipendio minimo
- `salary_max` (optional): Stipendio massimo
- `contract_type` (optional): permanent, contract, part_time
- `results_per_page` (optional): Numero risultati (default: 20)

**Esempio:**
```
GET /api/search?keyword=developer&province=Milano&seniority=senior&results_per_page=10
```

### GET `/api/health`
Health check del server

## 🚀 Deploy

### 🌐 GitHub Pages + Vercel (Raccomandato)

**Frontend su GitHub Pages** + **Backend su Vercel**

Guida completa: [DEPLOY-GITHUB-PAGES.md](DEPLOY-GITHUB-PAGES.md)

**Quick Steps:**
1. Push su GitHub: `git push origin main`
2. Deploy backend su Vercel (gratuito)
3. Abilita GitHub Pages nelle impostazioni del repo
4. Aggiorna `BACKEND_URL` in `index.html` con l'URL Vercel

**Risultato:**
- Frontend: `https://tatosolvi.github.io/tatoJob/`
- Backend: `https://tatojob-xxxxx.vercel.app/api`

### 🖥️ Server Dedicato
1. Installa Node.js sul server
2. Clona il repository
3. Installa dipendenze: `npm install`
4. Avvia con PM2: `pm2 start server.js`
5. Configura reverse proxy (nginx) se necessario

### 🐳 Docker (opzionale)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 Licenza

MIT License - Sentiti libero di usare questo progetto per i tuoi scopi!

## 🤝 Contribuire

1. Fork il progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Commit le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📧 Supporto

Per problemi o domande:
- Apri una [Issue](https://github.com/yourusername/Bot-Ricerca-Lavoro/issues)
- Controlla la [documentazione](docs/)

## 🎯 Roadmap

- [ ] Integrazione con altri portali (Indeed, LinkedIn)
- [ ] Sistema di notifiche push
- [ ] Salvataggio ricerche preferite
- [ ] Export risultati in PDF/CSV
- [ ] Dashboard utente con storico ricerche
- [ ] Integrazione Telegram Bot

## 👤 Autore

Creato con ❤️ per semplificare la ricerca di lavoro

---

**⭐ Se questo progetto ti è utile, lascia una stella!**
