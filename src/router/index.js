import { createRouter, createWebHistory } from 'vue-router';
import Summary from '../views/Summary.vue';

const routes = [
  { path: '/', name: 'summary', component: Summary },
  {
    path: '/add',
    name: 'add',
    component: () => import('../views/AddAsset.vue'),
  },
  {
    path: '/error-book',
    name: 'error-book',
    component: () => import('../views/ErrorBookList.vue'),
  },
  {
    path: '/error-review',
    name: 'error-review',
    component: () => import('../views/ErrorReview.vue'),
  },
  {
    path: '/error-all',
    name: 'error-all',
    component: () => import('../views/ErrorAllQuestions.vue'),
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
