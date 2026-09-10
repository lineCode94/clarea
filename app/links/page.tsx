import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claréa | Our links",
  description: "Visit Claréa or contact us on WhatsApp. موقع Claréa والتواصل عبر واتساب.",
};

export default function LinksPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#fbf7f2] px-6 py-12">
      <div className="w-full max-w-md text-center">
        <Image src="/clarea-logo-transparent.png" alt="Claréa" width={420} height={140} priority className="mx-auto mb-10 h-auto w-72 max-w-full" />
        <h1 className="mb-3 text-3xl text-[#541c2b]" dir="rtl">أهلًا بكِ في Claréa</h1>
        <p className="mb-9 text-sm text-[#6b555b]">Your daily care starts here.</p>
        <div className="grid gap-4">
          <a href="https://clarea-three.vercel.app/" className="flex min-h-20 flex-col items-center justify-center rounded-xl bg-[#541c2b] px-5 py-4 text-white transition hover:bg-[#6b293b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#541c2b]">
            <span className="text-lg font-bold" dir="rtl">تصفّحي الموقع</span><span className="mt-1 text-sm">Visit our website</span>
          </a>
          <a href="https://wa.me/message/K6NN2DB3FEPMO1" className="flex min-h-20 flex-col items-center justify-center rounded-xl border border-[#541c2b] bg-white px-5 py-4 text-[#541c2b] transition hover:bg-[#f5e9e2] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#541c2b]">
            <span className="text-lg font-bold" dir="rtl">تواصلي معنا على واتساب</span><span className="mt-1 text-sm">Chat on WhatsApp</span>
          </a>
        </div>
      </div>
    </main>
  );
}
