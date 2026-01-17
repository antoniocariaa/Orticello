const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['x-access-token'] = token;
    }

    const config = {
        ...options,
        headers,
    };

    try {
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
            const error = new Error(data.message || response.statusText || 'Errore nella richiesta');
            error.status = response.status;
            throw error;
        }

        return data;
    } catch (error) {
        // Se l'errore è di rete (offline), propaga con informazioni aggiuntive
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            const offlineError = new Error('Connessione non disponibile. L\'operazione verrà completata quando tornerai online.');
            offlineError.isOffline = true;
            offlineError.originalError = error;
            throw offlineError;
        }
        
        // Altri errori
        throw error;
    }
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