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
        // Comune Routes
        {
            path: '/comune/dashboard',
            name: 'comune-dashboard',
            component: () => import('../views/comune/HomeComune.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/comune/associazioni',
            name: 'comune-associazioni',
            component: () => import('../views/comune/AssociazioniComune.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/comune/avvisi',
            name: 'comune-avvisi',
            component: () => import('../views/comune/AvvisiComune.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/comune/avvisi',
            name: 'comune-avvisi',
            component: () => import('../views/comune/AvvisiComune.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/comune/mappa',
            name: 'comune-mappa',
            component: () => import('../views/comune/MappaComune.vue'),
            meta: { requiresAuth: true }
        },
        // Associazione Routes
        {
            path: '/associazione/dashboard',
            name: 'associazione-dashboard',
            component: () => import('../views/associazione/HomeAssociazione.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/associazione/orti',
            name: 'associazione-orti',
            component: () => import('../views/associazione/OrtiAssociazione.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/associazione/avvisi',
            name: 'associazione-avvisi',
            component: () => import('../views/associazione/AvvisiAssociazione.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/associazione/bandi',
            name: 'associazione-bandi',
            component: () => import('../views/associazione/BandiAssociazione.vue'),
            meta: { requiresAuth: true }
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
