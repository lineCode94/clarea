import { listOrders, createOrder } from "../../../lib/order-service";
export const runtime = "nodejs";
export const GET = listOrders;
export const POST = createOrder;
