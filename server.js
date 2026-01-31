// ==================== SERVER NODE.JS PER ADZUNA API ====================
// Questo server evita i problemi CORS facendo le richieste dal backend

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

// Configurazione Adzuna
// ⚠️ IMPORTANTE: Usa variabili d'ambiente su Vercel per sicurezza
const ADZUNA_CONFIG = {
  appId: process.env.ADZUNA_APP_ID || 'c816bea5',  // App ID Adzuna
  appKey: process.env.ADZUNA_APP_KEY || 'aac719fa2ac0a9f1c4d2f8cfc619f430',  // App Key Adzuna
  baseUrl: 'https://api.adzuna.com/v1/api/jobs'
};

// Middleware
app.use(cors()); // Permette richieste da qualsiasi origine
app.use(express.json());
app.use(express.static(__dirname)); // Serve file statici (HTML, CSS, JS)

// ==================== ROUTE: Ricerca Annunci ====================
app.get('/api/search', async (req, res) => {
  try {
    const { keyword, location, province, salary_min, salary_max, contract_type, seniority, results_per_page = 20 } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parametro "keyword" richiesto' 
      });
    }
    
    // Costruisci URL Adzuna (formato corretto)
    const params = new URLSearchParams({
      app_id: ADZUNA_CONFIG.appId,
      app_key: ADZUNA_CONFIG.appKey,
      what: keyword,
      results_per_page: results_per_page.toString()
    });
    
    // Aggiungi parametri opzionali solo se presenti
    if (province && province.trim()) {
      // Se c'è una provincia, usa quella invece di location generica
      params.append('where', province.trim());
    } else if (location && location.trim()) {
      params.append('where', location.trim());
    }
    if (salary_min) params.append('salary_min', salary_min.toString());
    if (salary_max) params.append('salary_max', salary_max.toString());
    if (contract_type && contract_type !== '') params.append('contract_type', contract_type);
    
    // Filtra per seniority lato server (Adzuna non ha parametro diretto)
    // Aggiungiamo la seniority ai risultati per filtrare dopo
    
    const country = 'it'; // Italia
    const url = `${ADZUNA_CONFIG.baseUrl}/${country}/search/1?${params.toString()}`;
    
    console.log('🔍 Richiesta Adzuna:', url);
    
    // Fai la richiesta ad Adzuna
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 10000, // 10 secondi timeout
      validateStatus: function (status) {
        return status < 500; // Accetta tutti i codici < 500
      }
    });
    
    console.log('✅ Risposta Adzuna:', response.status, response.statusText);
    
    // Se la risposta non è JSON, c'è un problema
    if (response.headers['content-type'] && !response.headers['content-type'].includes('application/json')) {
      throw new Error(`Risposta non JSON da Adzuna. Status: ${response.status}. Contenuto: ${response.data.toString().substring(0, 200)}`);
    }
    
    // Se status non è 200, verifica se c'è un errore nel JSON
    if (response.status !== 200) {
      if (response.data && response.data.error) {
        throw new Error(`Errore API Adzuna: ${response.data.error}`);
      }
      throw new Error(`Errore API Adzuna: ${response.status} ${response.statusText}`);
    }
    
    // Filtra risultati per rilevanza - solo quelli che contengono la keyword nel titolo o descrizione
    const keywordLower = keyword.toLowerCase().trim();
    const keywordWords = keywordLower.split(/\s+/).filter(w => w.length > 2); // Parole chiave significative (>2 caratteri)
    
    // Lista di parole da escludere quando si cerca una keyword specifica (più aggressivo)
    const exclusionMap = {
      'banca': ['banco', 'banchista', 'banconista', 'addetto al banco', 'operatore di banco'],
      'banco': ['banca', 'bancario', 'bancaria', 'bancario', 'bancaria'],
      'developer': ['development', 'developing'],
    };
    
    const exclusions = exclusionMap[keywordLower] || [];
    
    let filteredResults = (response.data.results || []).filter(job => {
      const title = (job.title || '').toLowerCase();
      const description = (job.description || '').toLowerCase();
      const company = (job.company?.display_name || job.company?.name || '').toLowerCase();
      const fullText = `${title} ${description}`.toLowerCase(); // Solo titolo + descrizione per esclusioni
      
      // ESCLUSIONE AGGIUNTIVA: Se il titolo contiene una parola esclusa, escludi sempre
      // (anche se la keyword è presente in descrizione)
      if (exclusions.length > 0) {
        const titleHasExclusion = exclusions.some(excl => {
          // Match esatto o come parola intera nel titolo
          const titleWords = title.split(/\s+/);
          return titleWords.some(word => word.includes(excl) || word === excl);
        });
        
        if (titleHasExclusion) {
          // Escludi solo se la keyword NON è presente nel titolo stesso
          const titleHasKeyword = keywordWords.some(word => title.includes(word));
          if (!titleHasKeyword) {
            return false; // Escludi: titolo ha esclusione ma non keyword
          }
        }
      }
      
      // Verifica se almeno una parola chiave è presente
      const hasKeyword = keywordWords.some(word => 
        title.includes(word) || 
        description.includes(word) || 
        company.includes(word)
      );
      
      if (!hasKeyword) return false;
      
      // Per keyword singole, priorità al titolo
      if (keywordWords.length === 1) {
        const singleWord = keywordWords[0];
        const titleMatch = title.includes(singleWord);
        const descMatch = description.includes(singleWord);
        const companyMatch = company.includes(singleWord);
        
        // Se matcha nel titolo, verifica che non ci siano esclusioni nel titolo
        if (titleMatch) {
          // Se il titolo contiene sia keyword che esclusione, escludi
          if (exclusions.some(excl => {
            const titleWords = title.split(/\s+/);
            return titleWords.some(word => word.includes(excl));
          })) {
            return false; // Escludi: titolo ha sia keyword che esclusione
          }
          return true; // OK: titolo ha keyword senza esclusioni
        }
        
        // Se matcha solo in descrizione/azienda, verifica che non ci siano esclusioni nel titolo
        if (descMatch || companyMatch) {
          return !exclusions.some(excl => {
            const titleWords = title.split(/\s+/);
            return titleWords.some(word => word.includes(excl));
          });
        }
      }
      
      return hasKeyword;
    });
    
    // Se dopo il filtro non ci sono risultati, usa i risultati originali (fallback)
    if (filteredResults.length === 0 && (response.data.results || []).length > 0) {
      console.log('⚠️ Nessun risultato dopo filtro, uso risultati originali');
      filteredResults = response.data.results;
    }
    
    // Formatta i risultati
    const jobs = filteredResults.map(job => ({
      id: job.id || job.adref,
      title: job.title || 'Titolo non disponibile',
      company: job.company?.display_name || job.company?.name || 'Azienda non specificata',
      location: {
        city: job.location?.display_name || job.location?.area?.[0] || 'N/A',
        region: job.location?.area?.[1] || '',
        country: job.location?.area?.[2] || 'IT'
      },
      salary: {
        min: job.salary_min || null,
        max: job.salary_max || null,
        displayed: formatSalary(job.salary_min, job.salary_max)
      },
      description: job.description || '',
      snippet: extractSnippet(job.description || ''),
      url: job.redirect_url || job.url || '#',
      created: job.created || new Date().toISOString(),
      category: job.category?.label || 'Non specificato',
      contractType: job.contract_type || 'Non specificato',
      isRemote: job.remote_working || false,
      source: 'Adzuna'
    }));
    
    res.json({
      success: true,
      count: response.data.count || 0,
      filteredCount: jobs.length, // Numero di risultati dopo il filtro
      results: jobs,
      keyword: keyword, // Includi keyword per debug
      originalCount: (response.data.results || []).length // Numero originale prima del filtro
    });
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
    
    let errorMessage = 'Errore nella ricerca';
    if (error.response) {
      // Errore dalla risposta API
      errorMessage = `Errore API: ${error.response.status} - ${error.response.statusText}`;
      if (error.response.data) {
        errorMessage += `\nDettagli: ${JSON.stringify(error.response.data)}`;
      }
    } else if (error.request) {
      // Richiesta fatta ma nessuna risposta
      errorMessage = 'Nessuna risposta dal server Adzuna';
    } else {
      // Errore nella configurazione della richiesta
      errorMessage = `Errore: ${error.message}`;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// ==================== HELPER FUNCTIONS ====================
function formatSalary(min, max) {
  if (!min && !max) return 'Non specificato';
  if (min && max) return `€${min.toLocaleString('it-IT')} - €${max.toLocaleString('it-IT')}`;
  if (min) return `Da €${min.toLocaleString('it-IT')}`;
  if (max) return `Fino a €${max.toLocaleString('it-IT')}`;
  return 'Non specificato';
}

function extractSnippet(description, maxLength = 200) {
  if (!description) return 'Descrizione non disponibile';
  const clean = description.replace(/<[^>]*>/g, '').trim();
  return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
}

// ==================== ROUTE: Statistiche Generali Lavoro ====================
app.get('/api/stats', async (req, res) => {
  try {
    const { keyword, location, province } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parametro "keyword" richiesto' 
      });
    }
    
    console.log('📊 Calcolo statistiche per:', keyword);
    
    // Fai multiple ricerche per aggregare statistiche
    const statsPromises = [];
    
    // 1. Ricerca generale (ultimi annunci)
    const params1 = new URLSearchParams({
      app_id: ADZUNA_CONFIG.appId,
      app_key: ADZUNA_CONFIG.appKey,
      what: keyword,
      results_per_page: '50',
      sort_by: 'date'
    });
    if (province) params1.append('where', province);
    else if (location) params1.append('where', location);
    
    // 2. Ricerca per stipendio (per calcolare media)
    const params2 = new URLSearchParams({
      app_id: ADZUNA_CONFIG.appId,
      app_key: ADZUNA_CONFIG.appKey,
      what: keyword,
      results_per_page: '50',
      sort_by: 'salary'
    });
    if (province) params2.append('where', province);
    else if (location) params2.append('where', location);
    
    const country = 'it';
    const url1 = `${ADZUNA_CONFIG.baseUrl}/${country}/search/1?${params1.toString()}`;
    const url2 = `${ADZUNA_CONFIG.baseUrl}/${country}/search/1?${params2.toString()}`;
    
    // Esegui entrambe le ricerche in parallelo
    const [response1, response2] = await Promise.all([
      axios.get(url1, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000,
        validateStatus: (status) => status < 500
      }),
      axios.get(url2, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000,
        validateStatus: (status) => status < 500
      })
    ]);
    
    if (response1.status !== 200 || response2.status !== 200) {
      throw new Error('Errore nel recupero dati per statistiche');
    }
    
    const allJobs = [...(response1.data.results || []), ...(response2.data.results || [])];
    
    // Rimuovi duplicati
    const uniqueJobs = Array.from(new Map(allJobs.map(job => [job.id || job.adref, job])).values());
    
    // Calcola statistiche
    const stats = calculateJobStatistics(uniqueJobs, keyword);
    
    res.json({
      success: true,
      keyword: keyword,
      location: province || location || 'Italia',
      totalJobs: response1.data.count || 0,
      analyzedJobs: uniqueJobs.length,
      statistics: stats
    });
    
  } catch (error) {
    console.error('❌ Errore statistiche:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== HELPER: Calcola Statistiche ====================
function calculateJobStatistics(jobs, keyword) {
  if (jobs.length === 0) {
    return {
      salary: { avg: null, min: null, max: null, median: null, distribution: [] },
      timeline: { last7days: 0, last30days: 0, last90days: 0 },
      locations: [],
      companies: [],
      contractTypes: {},
      remoteJobs: 0,
      seniority: {},
      categories: {},
      trend: 'stable'
    };
  }
  
  const now = new Date();
  const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last90days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  // Statistiche Stipendio
  const salaries = jobs
    .filter(j => j.salary_min || j.salary_max)
    .map(j => {
      if (j.salary_min && j.salary_max) return (j.salary_min + j.salary_max) / 2;
      return j.salary_min || j.salary_max;
    })
    .filter(s => s > 0);
  
  const salaryStats = {
    avg: salaries.length > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : null,
    min: salaries.length > 0 ? Math.min(...salaries) : null,
    max: salaries.length > 0 ? Math.max(...salaries) : null,
    median: salaries.length > 0 ? calculateMedian(salaries) : null,
    distribution: calculateSalaryDistribution(salaries)
  };
  
  // Timeline (annunci pubblicati)
  const timeline = {
    last7days: jobs.filter(j => {
      const created = new Date(j.created);
      return created >= last7days;
    }).length,
    last30days: jobs.filter(j => {
      const created = new Date(j.created);
      return created >= last30days;
    }).length,
    last90days: jobs.filter(j => {
      const created = new Date(j.created);
      return created >= last90days;
    }).length
  };
  
  // Top Locations
  const locationCounts = {};
  jobs.forEach(j => {
    const loc = j.location?.display_name || j.location?.area?.[0] || 'N/A';
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });
  const topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count, percentage: ((count / jobs.length) * 100).toFixed(1) }));
  
  // Top Companies
  const companyCounts = {};
  jobs.forEach(j => {
    const company = j.company?.display_name || j.company?.name || 'N/A';
    companyCounts[company] = (companyCounts[company] || 0) + 1;
  });
  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count, percentage: ((count / jobs.length) * 100).toFixed(1) }));
  
  // Contract Types
  const contractTypes = {};
  jobs.forEach(j => {
    const type = j.contract_type || 'Non specificato';
    contractTypes[type] = (contractTypes[type] || 0) + 1;
  });
  
  // Remote Jobs
  const remoteJobs = jobs.filter(j => j.remote_working).length;
  
  // Seniority (analisi keyword nel titolo/descrizione)
  const seniority = analyzeSeniority(jobs, keyword);
  
  // Categories
  const categories = {};
  jobs.forEach(j => {
    const cat = j.category?.label || 'Non specificato';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  // Trend (confronta ultimi 7 giorni vs 30-7 giorni)
  const recent7 = timeline.last7days;
  const previous23 = timeline.last30days - timeline.last7days;
  const trend = recent7 > previous23 * 0.3 ? 'growing' : recent7 < previous23 * 0.2 ? 'declining' : 'stable';
  
  return {
    salary: salaryStats,
    timeline,
    locations: topLocations,
    companies: topCompanies,
    contractTypes,
    remoteJobs,
    remotePercentage: ((remoteJobs / jobs.length) * 100).toFixed(1),
    seniority,
    categories,
    trend,
    totalAnalyzed: jobs.length
  };
}

function calculateMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function calculateSalaryDistribution(salaries) {
  if (salaries.length === 0) return [];
  
  const ranges = [
    { label: '0-25k', min: 0, max: 25000, count: 0 },
    { label: '25k-35k', min: 25000, max: 35000, count: 0 },
    { label: '35k-45k', min: 35000, max: 45000, count: 0 },
    { label: '45k-60k', min: 45000, max: 60000, count: 0 },
    { label: '60k-80k', min: 60000, max: 80000, count: 0 },
    { label: '80k+', min: 80000, max: Infinity, count: 0 }
  ];
  
  salaries.forEach(salary => {
    const range = ranges.find(r => salary >= r.min && salary < r.max);
    if (range) range.count++;
  });
  
  return ranges.map(r => ({
    ...r,
    percentage: ((r.count / salaries.length) * 100).toFixed(1)
  }));
}

function analyzeSeniority(jobs, keyword) {
  const seniorityKeywords = {
    junior: ['junior', 'jr', 'entry', 'entry level', 'primo impiego', 'neoassunto', 'trainee', 'stagista'],
    mid: ['mid', 'middle', 'intermedio', 'esperto', 'specialist', 'specialista'],
    senior: ['senior', 'sr', 'lead', 'principle', 'esperto', 'specialista senior'],
    executive: ['executive', 'manager', 'director', 'head', 'chief', 'cto', 'cfo', 'ceo', 'vice president', 'vicepresidente']
  };
  
  const counts = { junior: 0, mid: 0, senior: 0, executive: 0, unspecified: 0 };
  
  jobs.forEach(job => {
    const title = (job.title || '').toLowerCase();
    const description = (job.description || '').toLowerCase();
    const fullText = `${title} ${description}`;
    
    let found = false;
    for (const [level, keywords] of Object.entries(seniorityKeywords)) {
      if (keywords.some(kw => fullText.includes(kw))) {
        counts[level]++;
        found = true;
        break;
      }
    }
    if (!found) counts.unspecified++;
  });
  
  return counts;
}

// ==================== ROUTE: Health Check ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server Adzuna API Proxy attivo',
    config: {
      appId: ADZUNA_CONFIG.appId,
      hasAppKey: !!ADZUNA_CONFIG.appKey
    }
  });
});

// ==================== AVVIA SERVER ====================
app.listen(PORT, () => {
  console.log('🚀 Server avviato!');
  console.log(`📡 API disponibile su: http://localhost:${PORT}/api/search`);
  console.log(`🌐 Interfaccia test: http://localhost:${PORT}/TEST-ADZUNA-API.html`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
});

