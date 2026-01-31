// ==================== SERVIZIO ADZUNA CON BACKEND ====================
// Versione che usa il backend invece di chiamare direttamente l'API

const ADZUNA_CONFIG = {
  backendUrl: 'http://localhost:3000/api',  // URL del tuo backend
  useBackend: true  // Usa backend invece di API diretta
};

const AdzunaService = {
  /**
   * Cerca annunci di lavoro (via backend)
   */
  async searchJobs(keyword, location = '', filters = {}) {
    try {
      const params = new URLSearchParams({
        keyword: keyword,
        results_per_page: filters.results_per_page || 20
      });
      
      if (location) params.append('location', location);
      if (filters.province) params.append('province', filters.province);
      if (filters.seniority) params.append('seniority', filters.seniority);
      if (filters.salary_min) params.append('salary_min', filters.salary_min);
      if (filters.salary_max) params.append('salary_max', filters.salary_max);
      if (filters.contract_type) params.append('contract_type', filters.contract_type);
      
      const url = `${ADZUNA_CONFIG.backendUrl}/search?${params.toString()}`;
      
      console.log('🔍 Richiesta backend:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Errore backend: ${response.status} - ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        success: data.success,
        count: data.count || 0,
        results: data.results || [],
        error: data.error || null
      };
      
    } catch (error) {
      console.error('❌ Errore ricerca:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  },

  /**
   * Verifica se il backend è attivo
   */
  async checkBackend() {
    try {
      const response = await fetch(`${ADZUNA_CONFIG.backendUrl.replace('/api', '')}/api/health`);
      const data = await response.json();
      return { active: true, data };
    } catch (error) {
      return { active: false, error: error.message };
    }
  }
};

// Export per uso globale
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdzunaService;
}

