import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { getDict, getLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLocale()).login };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const { mode, next = "/" } = await searchParams;
  const t = getDict(await getLocale());
  const isRegister = mode === "register";

  return (
    <div className="mx-auto max-w-sm space-y-4 py-8">
      <h1 className="text-2xl font-bold">{isRegister ? t.register : t.login}</h1>
      <AuthForm
        mode={isRegister ? "register" : "login"}
        next={next}
        labels={{ email: t.email, password: t.password, login: t.login, register: t.register }}
      />
      <p className="text-center text-sm text-snow-dim">
        <Link
          href={isRegister ? `/login?next=${encodeURIComponent(next)}` : `/login?mode=register&next=${encodeURIComponent(next)}`}
          className="underline underline-offset-2 hover:text-snow"
        >
          {isRegister ? t.login : t.register}
        </Link>
      </p>
    </div>
  );
}
