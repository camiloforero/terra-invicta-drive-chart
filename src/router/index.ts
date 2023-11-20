import { createRouter, createWebHistory } from 'vue-router'
import AccDvView from '../views/AccDvView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: AccDvView
    },
  ]
})

export default router
