const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

export function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

const qs = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return query ? `?${query}` : '';
};

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.onUnauthorized = null;
  }

  getToken() {
    return localStorage.getItem('cvats_token') || null;
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('cvats_token', token);
    } else {
      localStorage.removeItem('cvats_token');
    }
  }

  setUnauthorizedHandler(fn) {
    this.onUnauthorized = typeof fn === 'function' ? fn : null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = { ...options.headers };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Do not set Content-Type for FormData as browser sets it with multipart boundary
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (err) {
      const netErr = new Error(
        'Unable to connect to CVATS backend server. Please verify the backend is running.'
      );
      netErr.isNetworkError = true;
      netErr.cause = err;
      throw netErr;
    }

    if (response.status === 204) {
      return { success: true };
    }

    // File download response
    const disposition = response.headers.get('content-disposition');
    if (response.ok && disposition && disposition.includes('attachment')) {
      return response.blob();
    }

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const error = new Error(data?.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.errors = data?.errors || [];
      // An expired/invalid session on a protected call: clear the token and let the app redirect to sign-in.
      const isAuthEndpoint = /^\/auth\/(login|register)/.test(endpoint);
      if (response.status === 401 && token && !isAuthEndpoint) {
        this.setToken(null);
        if (this.onUnauthorized) this.onUnauthorized(error);
      }
      throw error;
    }

    return data ?? { success: true };
  }

  /** GET a file endpoint and trigger a browser download. */
  async downloadFile(endpoint, filename) {
    const blob = await this.request(endpoint);
    if (!(blob instanceof Blob)) throw new Error('The server did not return a file.');
    saveBlob(blob, filename);
  }

  // Auth endpoints
  auth = {
    register: async (userData) => {
      const res = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      if (res.data?.token) {
        this.setToken(res.data.token);
      }
      return res;
    },

    login: async (credentials) => {
      const res = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (res.data?.token) {
        this.setToken(res.data.token);
      }
      return res;
    },

    logout: async () => {
      try {
        await this.request('/auth/logout', { method: 'POST' });
      } finally {
        this.setToken(null);
      }
    },

    getMe: () => this.request('/auth/me'),

    updateProfile: (data) =>
      this.request('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    changePassword: (data) =>
      this.request('/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify(data)
      })
  };

  // Resume endpoints
  resumes = {
    upload: (file) => {
      const formData = new FormData();
      formData.append('resume', file);
      return this.request('/resumes', {
        method: 'POST',
        body: formData
      });
    },

    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/resumes${query ? `?${query}` : ''}`);
    },

    get: (id) => this.request(`/resumes/${id}`),

    download: (id, filename = 'resume.pdf') => this.downloadFile(`/resumes/${id}/download`, filename),

    parse: (id, opts = {}) =>
      this.request(`/resumes/${id}/parse`, { method: 'POST', body: JSON.stringify(opts) }),

    getParsed: (id) => this.request(`/resumes/${id}/parsed`),

    updateParsed: (id, parsedData) =>
      this.request(`/resumes/${id}/parsed`, { method: 'PATCH', body: JSON.stringify(parsedData) }),

    delete: (id) =>
      this.request(`/resumes/${id}`, {
        method: 'DELETE'
      })
  };

  // Job Description endpoints
  jobDescriptions = {
    create: (data) =>
      this.request('/job-descriptions', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/job-descriptions${query ? `?${query}` : ''}`);
    },

    get: (id) => this.request(`/job-descriptions/${id}`),

    update: (id, data) =>
      this.request(`/job-descriptions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    parse: (id, opts = {}) =>
      this.request(`/job-descriptions/${id}/parse`, { method: 'POST', body: JSON.stringify(opts) }),

    getParsed: (id) => this.request(`/job-descriptions/${id}/parsed`),

    updateParsed: (id, parsedData) =>
      this.request(`/job-descriptions/${id}/parsed`, { method: 'PATCH', body: JSON.stringify(parsedData) }),

    delete: (id) =>
      this.request(`/job-descriptions/${id}`, {
        method: 'DELETE'
      })
  };

  // Job Match Analysis endpoints
  analyses = {
    create: (data) =>
      this.request('/analyses', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/analyses${query ? `?${query}` : ''}`);
    },

    get: (id) => this.request(`/analyses/${id}`),

    delete: (id) =>
      this.request(`/analyses/${id}`, {
        method: 'DELETE'
      }),

    getResult: (id) => this.request(`/analyses/${id}/result`),

    retry: (id) => this.request(`/analyses/${id}/retry`, { method: 'POST' }),

    getGapAnalysis: (id) => this.request(`/analyses/${id}/gap-analysis`),

    generateRecommendations: (id, force = false) =>
      this.request(`/analyses/${id}/recommendations/generate`, {
        method: 'POST',
        body: JSON.stringify({ force })
      }),

    getRecommendations: (id) => this.request(`/analyses/${id}/recommendations`),

    addRecommendation: (id, data) =>
      this.request(`/analyses/${id}/recommendations`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
  };

  // Recommendations endpoints
  recommendations = {
    updateStatus: (id, status) =>
      this.request(`/recommendations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
  };

  // Resume Enhancement endpoints
  enhancements = {
    generate: (data) =>
      this.request('/enhancements/generate', { method: 'POST', body: JSON.stringify(data) }),

    list: (params = {}) => this.request(`/enhancements${qs(params)}`),

    get: (id) => this.request(`/enhancements/${id}`),

    compare: (id) => this.request(`/enhancements/${id}/compare`),

    getVersions: (id) => this.request(`/enhancements/${id}/versions`),

    /** Editing content creates a NEW version (returned). */
    update: (id, data) =>
      this.request(`/enhancements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    approve: (id) => this.request(`/enhancements/${id}/approve`, { method: 'POST' }),

    download: (id, format = 'txt', filename) =>
      this.downloadFile(
        `/enhancements/${id}/download?format=${format === 'docx' ? 'docx' : 'txt'}`,
        filename || `enhanced-resume.${format === 'docx' ? 'docx' : 'txt'}`
      )
  };

  // Mock Interview endpoints
  interviews = {
    create: (data) =>
      this.request('/interviews', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/interviews${query ? `?${query}` : ''}`);
    },

    get: (id) => this.request(`/interviews/${id}`),

    addQuestion: (id, data) =>
      this.request(`/interviews/${id}/questions`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    submitAnswer: (id, data) =>
      this.request(`/interviews/${id}/answers`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    updateAnswer: (id, answerId, answerText) =>
      this.request(`/interviews/${id}/answers/${answerId}`, {
        method: 'PATCH',
        body: JSON.stringify({ answerText })
      }),

    updateStatus: (id, status) =>
      this.request(`/interviews/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),

    generateQuestions: (id, regenerate = false) =>
      this.request(`/interviews/${id}/generate-questions`, {
        method: 'POST',
        body: JSON.stringify({ regenerate })
      }),

    evaluateAnswer: (id, answerId) =>
      this.request(`/interviews/${id}/answers/${answerId}/evaluate`, { method: 'POST' }),

    complete: (id) => this.request(`/interviews/${id}/complete`, { method: 'POST' }),

    getReport: (id) => this.request(`/interviews/${id}/report`)
  };

  // Health
  health = {
    check: () => this.request('/health')
  };
}

export const api = new ApiClient();
export default api;
