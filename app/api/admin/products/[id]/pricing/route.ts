import { updateInventory } from "../../../../../lib/inventory-service";
export const runtime = "nodejs";
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return updateInventory(request, (await context.params).id, "pricing");
}
