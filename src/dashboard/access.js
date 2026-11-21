// Who may see which dashboard section. UI CONVENIENCE ONLY: the database (RLS + role checks inside every function) is what really decides.
//
// Two independent grants can sit on the same login and are NEVER merged:
//   adminRoles  <- table admin_roles   (super_admin, content_manager, learning_analyst, media_manager)  = the children's app / platform
//   adultRole   <- table adult_staff   ('adult_admin' | 'facilitator', ACTIVE only)                      = ASARTUN ADULT LEARNING
// Being a Super Admin does NOT make someone an adult admin, and the other way round.

export function buildContext({ adminRoles = [], adultRole = null } = {}) {
  const isSuper = adminRoles.includes('super_admin')
  const adult = adultRole === 'adult_admin' || adultRole === 'facilitator' ? adultRole : null
  return {
    adminRoles, adultRole: adult, isSuper,
    // same meaning as useAdminAuth().hasRole: a Super Admin passes every admin_roles check (and ONLY those)
    hasAdminRole: (...allowed) => isSuper || allowed.some((r) => adminRoles.includes(r)),
    hasAnyAdminRole: adminRoles.length > 0,
    isAdultAdmin: adult === 'adult_admin',
    isFacilitator: adult === 'facilitator',
    hasAdult: adult !== null,
    hasAnyRole: adminRoles.length > 0 || adult !== null,
  }
}

export const GROUPS = ['', 'People', 'Teaching', 'Insights', 'Money', "Children's app", 'Account']

// id = route segment under /dashboard. `icon` is a name resolved in Shell.jsx.
export const NAV = [
  { id: 'overview',     label: 'Overview',            group: '',               icon: 'LayoutDashboard', allow: (c) => c.hasAnyRole },
  { id: 'staff',        label: 'Staff',               group: 'People',         icon: 'UserCog',         allow: (c) => c.isAdultAdmin },
  { id: 'learners',     label: 'Learners',            group: 'People',         icon: 'Users',           allow: (c) => c.hasAdult },
  { id: 'classes',      label: 'Classes',             group: 'People',         icon: 'School',          allow: (c) => c.hasAdult },
  { id: 'courses',      label: 'Courses',             group: 'Teaching',       icon: 'BookOpen',        allow: (c) => c.isAdultAdmin },
  { id: 'content',      label: 'Lessons & texts',     group: 'Teaching',       icon: 'FileText',        allow: (c) => c.isAdultAdmin },
  { id: 'assignments',  label: 'Assignments',         group: 'Teaching',       icon: 'ClipboardList',   allow: (c) => c.hasAdult },
  { id: 'attendance',   label: 'Attendance',          group: 'Teaching',       icon: 'CalendarCheck',   allow: (c) => c.hasAdult },
  { id: 'reports',      label: 'Reports & analytics', group: 'Insights',       icon: 'BarChart3',       allow: (c) => c.hasAdult },
  { id: 'certificates', label: 'Certificates',        group: 'Insights',       icon: 'Award',           allow: (c) => c.hasAdult },
  { id: 'payments',     label: 'Payments',            group: 'Money',          icon: 'Wallet',          allow: (c) => c.isAdultAdmin },
  { id: 'children',     label: 'Children overview',   group: "Children's app", icon: 'Baby',            allow: (c) => c.hasAnyAdminRole },
  { id: 'missions',     label: 'Missions',            group: "Children's app", icon: 'Rocket',          allow: (c) => c.hasAdminRole('content_manager') },
  { id: 'levels',       label: 'Levels & safety',     group: "Children's app", icon: 'Layers',          allow: (c) => c.hasAdminRole('content_manager') },
  { id: 'media',        label: 'Media library',       group: "Children's app", icon: 'Image',           allow: (c) => c.hasAdminRole('content_manager', 'media_manager') },
  { id: 'child-learners', label: 'Child learners',    group: "Children's app", icon: 'GraduationCap',   allow: (c) => c.hasAdminRole('learning_analyst') },
  { id: 'organizations', label: 'Schools & companies', group: "Children's app", icon: 'Building2',      allow: (c) => c.isSuper },
  { id: 'school-staff', label: 'School staff',        group: "Children's app", icon: 'UserCheck',       allow: (c) => c.isSuper },
  { id: 'premium',      label: 'Premium & payments',  group: "Children's app", icon: 'Gem',             allow: (c) => c.isSuper },
  { id: 'activity',     label: 'Activity log',        group: "Children's app", icon: 'Activity',        allow: (c) => c.isSuper },
  { id: 'settings',     label: 'Settings',            group: 'Account',        icon: 'Settings',        allow: (c) => c.hasAnyRole },
]
export const NAV_BY_ID = Object.fromEntries(NAV.map((n) => [n.id, n]))
export const navPath = (id) => '/dashboard/' + id

export const visibleNav = (ctx) => NAV.filter((n) => n.allow(ctx))
export const canAccess = (ctx, id) => Boolean(NAV_BY_ID[id] && NAV_BY_ID[id].allow(ctx))
export const sectionOf = (pathname) => (/^\/dashboard\/([^/?#]+)/.exec(pathname) || [])[1] || 'overview'
export const roleLabels = (ctx) => [
  ...ctx.adminRoles.map((r) => ({ super_admin: 'Super Admin', content_manager: 'Content Manager', learning_analyst: 'Learning Analyst', media_manager: 'Media Manager' }[r] || r)),
  ...(ctx.adultRole ? [ctx.adultRole === 'adult_admin' ? 'Adult Admin' : 'Teacher / Facilitator'] : []),
]
