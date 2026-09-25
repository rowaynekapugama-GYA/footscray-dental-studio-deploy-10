import type { Access, FieldAccess } from 'payload'

/* Two roles. admin = GYA, editor = the practice. Editors can change content but not users. */
export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'
export const isAdminField: FieldAccess = ({ req }) => req.user?.role === 'admin'
export const isLoggedIn: Access = ({ req }) => Boolean(req.user)
export const anyone: Access = () => true
