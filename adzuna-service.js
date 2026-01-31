// ==================== SERVIZIO ADZUNA API ====================
// 🔧 Servizio per ricerca annunci di lavoro tramite Adzuna API
// 📚 Docs: https://developer.adzuna.com/docs

// ==================== CONFIGURAZIONE ====================
const ADZUNA_CONFIG = {
  appId: 'c816bea5',  // ← App ID configurato
  appKey: 'aac719fa2ac0a9f1c4d2f8cfc619f430',  // ← App Key configurata
  baseUrl: 'https://api.adzuna.com/v1/api/jobs',
  country: 'it'  // Codice paese: it, gb, us, au, de, fr, es
};

// ==================== SERVIZIO ADZUNA ====================
const AdzunaService = {
  /**
   * Cerca annunci di lavoro
   * @param {string} keyword - Parola chiave (es: "developer", "marketing")
   * @param {string} location - Località (es: "Milano", "Roma") - opzionale
   * @param {Object} filters - Filtri aggiuntivi (salary_min, salary_max, full_time, etc.)
   * @returns {Promise<Object>} Risultati della ricerca
   */
  async searchJobs(keyword, location = '', filters = {}) {
    let url = 'N/A'; // Inizializza url per il catch
    try {
      const params = new URLSearchParams({
        app_id: ADZUNA_CONFIG.appId,
        app_key: ADZUNA_CONFIG.appKey,
        results_per_page: filters.results_per_page || 20,
        what: keyword,
        content_type: 'job',
        sort_by: filters.sort_by || 'date',  // date, salary, relevance
        ...(location && { where: location }),
        ...(filters.salary_min && { salary_min: filters.salary_min }),
        ...(filters.salary_max && { salary_max: filters.salary_max }),
        ...(filters.full_time && { full_time: filters.full_time ? 1 : 0 }),
        ...(filters.contract_type && { contract_type: filters.contract_type }),
        ...(filters.category && { category: filters.category })
      });

      url = `${ADZUNA_CONFIG.baseUrl}/${ADZUNA_CONFIG.country}/search/1?${params.toString()}`;
      
      console.log('🔍 Ricerca Adzuna:', { keyword, location, url });
      
      // Usa proxy CORS più veloci con timeout ridotto
      // Prova prima con proxy veloci, poi fallback
      const proxies = [
        {
          name: 'CORS Proxy (veloce)',
          url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
          needsParse: false,
          timeout: 10000  // 10 secondi
        },
        {
          name: 'AllOrigins (backup)',
          url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          needsParse: true,
          timeout: 15000  // 15 secondi
        },
        {
          name: 'CORS Anywhere (backup 2)',
          url: `https://cors-anywhere.herokuapp.com/${url}`,
          needsParse: false,
          timeout: 20000  // 20 secondi
        }
      ];
      
      // Timeout globale di 25 secondi
      const globalTimeout = 25000;
      
      for (const proxy of proxies) {
        try {
          console.log(`🔄 Provo proxy: ${proxy.name} (timeout: ${proxy.timeout}ms)`);
          
          // Crea promise con timeout specifico per questo proxy
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), proxy.timeout);
          
          const fetchPromise = fetch(proxy.url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            },
            signal: controller.signal
          });
          
          const proxyResponse = await fetchPromise;
          clearTimeout(timeoutId);
          
          if (!proxyResponse.ok) {
            throw new Error(`Errore proxy: ${proxyResponse.status}`);
          }
          
          let data;
          if (proxy.needsParse) {
            const proxyData = await proxyResponse.json();
            if (!proxyData.contents) {
              throw new Error('Proxy non ha restituito contenuti');
            }
            data = JSON.parse(proxyData.contents);
          } else {
            data = await proxyResponse.json();
          }
          
          // Verifica se c'è un errore nella risposta Adzuna
          if (data.error || data.message) {
            throw new Error(data.error || data.message || 'Errore API Adzuna');
          }
          
          console.log(`✅ Proxy ${proxy.name} funzionante!`);
          
          return {
            success: true,
            count: data.count || 0,
            results: (data.results || []).map(job => this.formatJob(job)),
            raw: data
          };
          
        } catch (error) {
          if (typeof timeoutId !== 'undefined') {
            clearTimeout(timeoutId);
          }
          if (error.name === 'AbortError') {
            console.warn(`⏱️ Proxy ${proxy.name} timeout dopo ${proxy.timeout}ms`);
          } else {
            console.warn(`⚠️ Proxy ${proxy.name} fallito:`, error.message);
          }
          // Continua con il prossimo proxy
          continue;
        }
      }
      
      // Se tutti i proxy falliscono
      throw new Error('Tutti i proxy CORS hanno fallito. Prova a installare Node.js per usare il backend (vedi SETUP-BACKEND.txt)');
      
    } catch (error) {
      console.error('❌ Errore ricerca Adzuna:', error);
      console.error('🔍 Dettagli errore:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return {
        success: false,
        error: error.message,
        results: [],
        url: url || 'N/A'  // Includi URL per debug
      };
    }
  },

  /**
   * Formatta un annuncio per renderlo più leggibile
   * @param {Object} job - Annuncio grezzo da Adzuna
   * @returns {Object} Annuncio formattato
   */
  formatJob(job) {
    return {
      id: job.id || job.adref,
      title: job.title || 'Titolo non disponibile',
      company: job.company?.display_name || job.company?.name || 'Azienda non specificata',
      location: {
        city: job.location?.display_name || job.location?.area?.[0] || 'N/A',
        region: job.location?.area?.[1] || '',
        country: job.location?.area?.[2] || ADZUNA_CONFIG.country.toUpperCase()
      },
      salary: {
        min: job.salary_min || null,
        max: job.salary_max || null,
        currency: job.salary_is_predicted ? 'EUR (stimato)' : 'EUR',
        displayed: this.formatSalary(job.salary_min, job.salary_max)
      },
      description: job.description || '',
      snippet: this.extractSnippet(job.description || ''),
      url: job.redirect_url || job.url || '#',
      created: job.created || new Date().toISOString(),
      category: job.category?.label || 'Non specificato',
      contractType: job.contract_type || 'Non specificato',
      isRemote: job.remote_working || false,
      source: 'Adzuna'
    };
  },

  /**
   * Formatta lo stipendio in formato leggibile
   */
  formatSalary(min, max) {
    if (!min && !max) return 'Non specificato';
    if (min && max) return `€${min.toLocaleString('it-IT')} - €${max.toLocaleString('it-IT')}`;
    if (min) return `Da €${min.toLocaleString('it-IT')}`;
    if (max) return `Fino a €${max.toLocaleString('it-IT')}`;
    return 'Non specificato';
  },

  /**
   * Estrae un snippet dalla descrizione (primi 200 caratteri)
   */
  extractSnippet(description, maxLength = 200) {
    if (!description) return 'Descrizione non disponibile';
    const clean = description.replace(/<[^>]*>/g, '').trim();
    return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
  },

  /**
   * Cerca per categoria (es: "IT Jobs", "Marketing Jobs")
   * @param {string} category - Nome categoria
   * @param {string} location - Località opzionale
   */
  async searchByCategory(category, location = '') {
    return this.searchJobs('', location, { category });
  },

  /**
   * Cerca lavori remoti
   * @param {string} keyword - Parola chiave
   */
  async searchRemoteJobs(keyword) {
    return this.searchJobs(keyword, '', { remote_working: true });
  },

  /**
   * Cerca con filtro salario minimo
   * @param {string} keyword - Parola chiave
   * @param {number} minSalary - Salario minimo in EUR
   */
  async searchWithMinSalary(keyword, minSalary) {
    return this.searchJobs(keyword, '', { salary_min: minSalary });
  },

  /**
   * Ottieni statistiche su una ricerca (senza risultati completi)
   * Utile per mostrare "X annunci trovati" prima di caricare tutto
   */
  async getSearchStats(keyword, location = '') {
    try {
      const result = await this.searchJobs(keyword, location, { results_per_page: 1 });
      return {
        total: result.count || 0,
        hasResults: result.count > 0
      };
    } catch (error) {
      return { total: 0, hasResults: false };
    }
  }
};

// ==================== ESEMPI DI UTILIZZO ====================

// Esempio 1: Ricerca base
async function esempioRicercaBase() {
  const risultati = await AdzunaService.searchJobs('developer', 'Milano');
  
  if (risultati.success) {
    console.log(`✅ Trovati ${risultati.count} annunci`);
    risultati.results.forEach(job => {
      console.log(`\n📌 ${job.title}`);
      console.log(`🏢 ${job.company}`);
      console.log(`📍 ${job.location.city}`);
      console.log(`💰 ${job.salary.displayed}`);
      console.log(`🔗 ${job.url}`);
    });
  } else {
    console.error('❌ Errore:', risultati.error);
  }
}

// Esempio 2: Ricerca con filtri avanzati
async function esempioRicercaFiltrata() {
  const risultati = await AdzunaService.searchJobs('marketing', 'Roma', {
    salary_min: 30000,
    salary_max: 50000,
    full_time: true,
    results_per_page: 10
  });
  
  console.log('Risultati filtrati:', risultati);
}

// Esempio 3: Solo lavori remoti
async function esempioLavoriRemoti() {
  const risultati = await AdzunaService.searchRemoteJobs('designer');
  console.log('Lavori remoti:', risultati);
}

// Esempio 4: Statistiche rapide
async function esempioStatistiche() {
  const stats = await AdzunaService.getSearchStats('developer', 'Milano');
  console.log(`Trovati ${stats.total} annunci per "developer" a Milano`);
}

// ==================== INTEGRAZIONE CON UI ====================

/**
 * Funzione helper per renderizzare risultati in HTML
 * @param {Array} jobs - Array di annunci formattati
 * @param {HTMLElement} container - Container dove inserire i risultati
 */
function renderJobsInHTML(jobs, container) {
  if (!container) {
    console.error('Container non trovato');
    return;
  }

  if (jobs.length === 0) {
    container.innerHTML = '<p>Nessun annuncio trovato. Prova a modificare i filtri.</p>';
    return;
  }

  container.innerHTML = jobs.map(job => `
    <div class="job-card" style="
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    ">
      <h3 style="margin: 0 0 10px 0; color: #1f6f63;">
        ${job.title}
      </h3>
      <p style="margin: 5px 0; color: #666;">
        <strong>🏢 Azienda:</strong> ${job.company}
      </p>
      <p style="margin: 5px 0; color: #666;">
        <strong>📍 Location:</strong> ${job.location.city}${job.isRemote ? ' (Remoto)' : ''}
      </p>
      <p style="margin: 5px 0; color: #666;">
        <strong>💰 Stipendio:</strong> ${job.salary.displayed}
      </p>
      <p style="margin: 10px 0; color: #555; font-size: 0.9em;">
        ${job.snippet}
      </p>
      <a href="${job.url}" target="_blank" style="
        display: inline-block;
        padding: 8px 16px;
        background: #1f6f63;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        margin-top: 10px;
      ">
        Vedi annuncio →
      </a>
    </div>
  `).join('');
}

/**
 * Funzione completa per ricerca con UI
 * @param {string} keyword - Parola chiave
 * @param {string} location - Località
 * @param {HTMLElement} resultsContainer - Container risultati
 * @param {HTMLElement} loadingElement - Elemento loading (opzionale)
 */
async function searchAndDisplay(keyword, location, resultsContainer, loadingElement = null) {
  if (loadingElement) loadingElement.style.display = 'block';
  
  const risultati = await AdzunaService.searchJobs(keyword, location);
  
  if (loadingElement) loadingElement.style.display = 'none';
  
  if (risultati.success && risultati.results.length > 0) {
    renderJobsInHTML(risultati.results, resultsContainer);
  } else {
    resultsContainer.innerHTML = `
      <p style="color: #d32f2f; padding: 20px;">
        ❌ ${risultati.error || 'Nessun risultato trovato'}
      </p>
    `;
  }
  
  return risultati;
}

// ==================== EXPORT PER USO GLOBALE ====================
// Se usi moduli ES6, usa: export { AdzunaService, renderJobsInHTML, searchAndDisplay };
// Altrimenti, le funzioni sono disponibili globalmente

// Per test rapido (scommenta per provare):
// esempioRicercaBase();

