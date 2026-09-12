import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AdminError } from "./admin-auth";
import { ConflictError } from "./catalog-store";
export function failure(error: unknown) {
  if (error instanceof AdminError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ConflictError)
    return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "راجع البيانات" },
      { status: 400 },
    );
  console.error("Admin operation failed", error instanceof Error ? error.name : "Unknown error");
  return NextResponse.json({ error: "تعذر إكمال العملية. حاول مرة أخرى." }, { status: 503 });
}
