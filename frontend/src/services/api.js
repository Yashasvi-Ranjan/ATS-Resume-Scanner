const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
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

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 204) {
        return { success: true };
      }

      // Check for file download response
      const disposition = response.headers.get('content-disposition');
      if (disposition && disposition.includes('attachment')) {
        const blob = await response.blob();
        return blob;
      }

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.errors = data.errors || [];
        throw error;
      }

      return data;
    } catch (err) {
      if (!err.status && err.name === 'TypeError') {
        err.message = 'Unable to connect to CVATS backend server. Please verify backend is running on port 5001.';
      }
      throw err;
    }
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

    download: async (id, filename = 'resume.pdf') => {
      const blob = await this.request(`/resumes/${id}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },

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
    create: (data) =>
      this.request('/enhancements', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`/enhancements${query ? `?${query}` : ''}`);
    },

    get: (id) => this.request(`/enhancements/${id}`),

    getVersions: (id) => this.request(`/enhancements/${id}/versions`),

    download: async (id, filename = 'enhanced-resume.txt') => {
      const blob = await this.request(`/enhancements/${id}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
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

    addEvaluation: (id, data) =>
      this.request(`/interviews/${id}/evaluations`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getReport: (id) => this.request(`/interviews/${id}/report`)
  };

  // Health
  health = {
    check: () => this.request('/health')
  };
}

export const api = new ApiClient();
export default api;
