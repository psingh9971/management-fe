import { createRouter, createWebHistory } from 'vue-router'
import { useAuth, onSessionExpired } from '../stores/auth'
import PublicLayout from '../layouts/PublicLayout.vue'
import HomeView from '../views/HomeView.vue'

const routes = [
  {
    path: '/',
    component: PublicLayout,
    children: [
      { path: '', name: 'home', component: HomeView },
      {
        path: 'login',
        name: 'login',
        component: () => import('../views/LoginView.vue'),
        meta: { guestOnly: true, title: 'Login' },
      },
    ],
  },
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/app/DashboardView.vue'), meta: { title: 'Dashboard' } },
      { path: 'employees', name: 'employees', component: () => import('../views/app/EmployeesView.vue'), meta: { title: 'Employees' } },
      { path: 'employees/new', name: 'employee-new', component: () => import('../views/app/EmployeeFormView.vue'), meta: { title: 'Add employee' } },
      { path: 'employees/leaves', name: 'leaves', component: () => import('../views/app/LeavesView.vue'), meta: { title: 'Leaves & week offs' } },
      { path: 'employees/attendance', name: 'attendance', component: () => import('../views/app/AttendanceView.vue'), meta: { title: 'Attendance' } },
      { path: 'employees/offer-letters', name: 'offer-letters', component: () => import('../views/app/OfferLettersView.vue'), meta: { title: 'Offer letters' } },
      { path: 'employees/offer-letters/new', name: 'offer-letter-new', component: () => import('../views/app/OfferLetterFormView.vue'), meta: { title: 'New offer letter' } },
      { path: 'employees/offer-letters/:id', name: 'offer-letter', component: () => import('../views/app/OfferLetterDetailView.vue'), meta: { title: 'Offer letter' } },
      { path: 'employees/offer-letters/:id/edit', name: 'offer-letter-edit', component: () => import('../views/app/OfferLetterFormView.vue'), meta: { title: 'Edit offer letter' } },
      { path: 'employees/:id', name: 'employee', component: () => import('../views/app/EmployeeDetailView.vue'), meta: { title: 'Employee' } },
      { path: 'payroll', name: 'payroll', component: () => import('../views/app/PayrollView.vue'), meta: { title: 'Payroll' } },
      { path: 'payroll/structures', name: 'salary-structures', component: () => import('../views/app/SalaryStructuresView.vue'), meta: { title: 'Salary structures' } },
      { path: 'payroll/structures/new', name: 'salary-structure-new', component: () => import('../views/app/SalaryStructureFormView.vue'), meta: { title: 'New salary structure' } },
      { path: 'payroll/structures/:id', name: 'salary-structure', component: () => import('../views/app/SalaryStructureDetailView.vue'), meta: { title: 'Salary structure' } },
      { path: 'payroll/slips', name: 'salary-slips', component: () => import('../views/app/SalarySlipsView.vue'), meta: { title: 'Salary slips' } },
      { path: 'payroll/slips/:employeeId/:slipId', name: 'salary-slip', component: () => import('../views/app/SalarySlipView.vue'), meta: { title: 'Salary slip' } },
      { path: 'finance', name: 'finance', component: () => import('../views/app/FinanceView.vue'), meta: { title: 'Finance' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, top: 100, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const { isLoggedIn } = useAuth()
  if (to.meta.requiresAuth && !isLoggedIn.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && isLoggedIn.value) {
    return { name: 'dashboard' }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · JP Enterprises` : 'JP x ZEPTO'
})

// Token expired or rejected by the server → send the user to login (only from protected pages)
onSessionExpired(() => {
  const current = router.currentRoute.value
  if (current.meta.requiresAuth) {
    router.push({ name: 'login', query: { redirect: current.fullPath, expired: '1' } })
  }
})

export default router
