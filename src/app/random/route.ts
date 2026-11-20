import { NextResponse } from "next/server";
import { listTitles } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const titles = await listTitles();
  const pick = titles[Math.floor(Math.random() * titles.length)];
  const url = new URL(pick ? `/anime/${pick.slug}` : "/catalog", req.url);
  return NextResponse.redirect(url, 307);
}
