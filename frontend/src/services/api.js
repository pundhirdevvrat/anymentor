import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // for refresh token cookie
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: attach access token ────────────────
api.interceptors.request.use((config) => {
  // Read directly from localStorage to avoid circular imports
  try {
    const stored = localStorage.getItem('anymentor-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }
  } catch {}
  return config;
});

// ─── Response Interceptor: refresh token on 401 ──────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    error ? prom.reject(error) : prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/login') &&
        !originalRequest.url?.includes('/auth/refresh')) {

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const newToken = data.data.accessToken;

        // Update zustand store
        const stored = localStorage.getItem('anymentor-auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.state.accessToken = newToken;
          localStorage.setItem('anymentor-auth', JSON.stringify(parsed));
        }

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear auth and redirect to login
        localStorage.removeItem('anymentor-auth');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Show error toast for non-auth errors
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }

    return Promise.reject(error);
  }
);

// ─── API Methods ──────────────────────────────────────────────

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  me: () => api.get('/auth/me'),
};

export const companyApi = {
  getAll: (params) => api.get('/companies', { params }),
  getById: (id) => api.get(`/companies/${id}`),
  getBySlug: (slug) => api.get(`/companies/slug/${slug}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  updateBranding: (id, data) => api.put(`/companies/${id}/branding`, data),
  updateFeatures: (id, data) => api.put(`/companies/${id}/features`, data),
  uploadLogo: (id, formData) => api.post(`/companies/${id}/logo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/companies/${id}`),
};

export const lmsApi = {
  getCourses: (companyId, params) => api.get(`/lms/companies/${companyId}/`, { params }),
  getCourse: (companyId, id) => api.get(`/lms/companies/${companyId}/${id}`),
  createCourse: (companyId, data) => api.post(`/lms/companies/${companyId}/`, data),
  updateCourse: (companyId, id, data) => api.put(`/lms/companies/${companyId}/${id}`, data),
  deleteCourse: (companyId, id) => api.delete(`/lms/companies/${companyId}/${id}`),
  enroll: (companyId, courseId) => api.post(`/lms/companies/${companyId}/${courseId}/enroll`),
  updateProgress: (companyId, courseId, lessonId, data) =>
    api.post(`/lms/companies/${companyId}/${courseId}/lessons/${lessonId}/progress`, data),
  getMyEnrollments: () => api.get('/lms/companies//my/enrollments'),
};

export const shopApi = {
  getProducts: (companyId, params) => api.get(`/ecommerce/companies/${companyId}/products`, { params }),
  getProduct: (companyId, id) => api.get(`/ecommerce/companies/${companyId}/products/${id}`),
  createProduct: (companyId, data) => api.post(`/ecommerce/companies/${companyId}/products`, data),
  updateProduct: (companyId, id, data) => api.put(`/ecommerce/companies/${companyId}/products/${id}`, data),
  getCategories: (companyId) => api.get(`/ecommerce/companies/${companyId}/categories`),
  getCart: (companyId) => api.get(`/ecommerce/companies/${companyId}/cart`),
  addToCart: (companyId, data) => api.post(`/ecommerce/companies/${companyId}/cart`, data),
  removeFromCart: (companyId, itemId) => api.delete(`/ecommerce/companies/${companyId}/cart/${itemId}`),
  createOrder: (companyId, data) => api.post(`/ecommerce/companies/${companyId}/orders`, data),
  getOrders: (companyId, params) => api.get(`/ecommerce/companies/${companyId}/orders`, { params }),
  getOrder: (companyId, id) => api.get(`/ecommerce/companies/${companyId}/orders/${id}`),
};

export const crmApi = {
  getLeads: (companyId, params) => api.get(`/crm/companies/${companyId}/leads`, { params }),
  getPipeline: (companyId) => api.get(`/crm/companies/${companyId}/leads/pipeline`),
  getLead: (companyId, id) => api.get(`/crm/companies/${companyId}/leads/${id}`),
  createLead: (companyId, data) => api.post(`/crm/companies/${companyId}/leads`, data),
  updateLead: (companyId, id, data) => api.put(`/crm/companies/${companyId}/leads/${id}`, data),
  addActivity: (companyId, leadId, data) => api.post(`/crm/companies/${companyId}/leads/${leadId}/activities`, data),
  getDeals: (companyId, params) => api.get(`/crm/companies/${companyId}/deals`, { params }),
  createDeal: (companyId, data) => api.post(`/crm/companies/${companyId}/deals`, data),
  updateDeal: (companyId, id, data) => api.put(`/crm/companies/${companyId}/deals/${id}`, data),
  getCrmStats: (companyId) => api.get(`/crm/companies/${companyId}/stats`),
  submitLead: (data) => api.post('/public/leads', data),
};

export const analyticsApi = {
  getOverview: (companyId) => api.get(`/analytics/${companyId}/overview`),
  getRevenue: (companyId, months) => api.get(`/analytics/${companyId}/revenue`, { params: { months } }),
  getCourses: (companyId) => api.get(`/analytics/${companyId}/courses`),
  getLeads: (companyId) => api.get(`/analytics/${companyId}/leads`),
  getOwnerOverview: () => api.get('/analytics/owner'),
};

export const billingApi = {
  getPlans: () => api.get('/billing/plans'),
  getSubscription: (companyId) => api.get(`/billing/companies/${companyId}/subscription`),
  subscribe: (companyId, data) => api.post(`/billing/companies/${companyId}/subscribe`, data),
  cancel: (companyId, data) => api.post(`/billing/companies/${companyId}/subscription/cancel`, data),
  getInvoices: (companyId) => api.get(`/billing/companies/${companyId}/invoices`),
};

export const supportApi = {
  getTickets: (companyId, params) => api.get(`/support/companies/${companyId}/tickets`, { params }),
  getTicket: (companyId, id) => api.get(`/support/companies/${companyId}/tickets/${id}`),
  createTicket: (companyId, data) => api.post(`/support/companies/${companyId}/tickets`, data),
  addMessage: (companyId, ticketId, data) => api.post(`/support/companies/${companyId}/tickets/${ticketId}/messages`, data),
  updateTicket: (companyId, id, data) => api.patch(`/support/companies/${companyId}/tickets/${id}`, data),
  getKb: (companyId, params) => api.get(`/support/companies/${companyId}/kb`, { params }),
  getArticle: (companyId, slug) => api.get(`/support/companies/${companyId}/kb/${slug}`),
};

export const userApi = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (formData) => api.post('/users/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export default api;
