import { report } from "../../../../lib/inventory-service";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return report(request, "best-sellers");
}
