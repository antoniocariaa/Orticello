import { reactive } from 'vue'

export const store = reactive({
    user: null, // Holds the user object: { id, nome, email, tipo, ... }
    isAuthenticated: false,

    setUser(userData) {
        this.user = userData
        this.isAuthenticated = true
    },

    clearUser() {
        this.user = null
        this.isAuthenticated = false
    }
})
