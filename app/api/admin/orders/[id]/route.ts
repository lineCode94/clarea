import { changeOrder } from "../../../../lib/order-service";
export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return changeOrder(request, (await context.params).id);
}
