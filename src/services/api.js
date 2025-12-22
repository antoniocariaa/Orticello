const BASE_URL = '/api/v1';

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Handle 401 Unauthorized globally if needed (e.g., auto-logout)
    if (response.status === 401) {
        // Optional: Clear token and redirect to login
        // localStorage.removeItem('token');
        // localStorage.removeItem('user');
        // window.location.href = '/login';
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || response.statusText || 'Errore nella richiesta');
    }

    return data;
}

export default {
    post(endpoint, body) {
        return request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    },
    get(endpoint) {
        return request(endpoint, {
            method: 'GET',
        });
    },
    put(endpoint, body) {
        return request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    },
    delete(endpoint) {
        return request(endpoint, {
            method: 'DELETE',
        });
    },
};