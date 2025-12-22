import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
            meta: { requiresAuth: true }
        },
        // Cittadino Routes
        {
            path: '/cittadino/orto',
            name: 'your-garden',
            component: () => import('../views/cittadino/HomeCittadino.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/cittadino/cerca',
            name: 'search-garden',
            component: () => import('../views/cittadino/CercaOrto.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/cittadino/avvisi',
            name: 'notices',
            component: () => import('../views/cittadino/Avvisi.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/login',
            name: 'login',
            component: LoginView
        },
        {
            path: '/register',
            name: 'register',
            component: RegisterView
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/'
        }
    ]
})

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')

    if (to.meta.requiresAuth && !token) {
        next('/login')
    } else {
        next()
    }
})

export default router
