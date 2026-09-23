import { accountOrders, logout } from "../../lib/customer-auth";
export const runtime = "nodejs";
export const GET = accountOrders;
export const DELETE = logout;
