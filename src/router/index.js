import { createRouter, createWebHistory } from 'vue-router';
import Summary from '../views/Summary.vue';

const routes = [
  { path: '/', name: 'summary', component: Summary },
  {
    path: '/add',
    name: 'add',
    component: () => import('../views/AddAsset.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
