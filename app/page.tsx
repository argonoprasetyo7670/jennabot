import Image from "next/image";
import { ArrowIcon, CheckIcon, ShieldIcon, CreditIcon, ChatIcon } from "../components/landing/Icons";
import { heroTiles, stats, featureCards, howItWorks, vipBullets, faqItems, supportCards, marqueeItems } from "../components/landing/data";
import ThemeToggle from "@/components/landing/ThemeToggle";
import AuthForm from "@/components/landing/AuthForm";
import PricingSection from "@/components/landing/PricingSection";
import { LANDING_FEATURES } from "@/lib/features";


export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      {/* NAV */}
      <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(var(--bg-rgb), 0.8)' }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#" className="group flex items-center gap-2.5">
            <Image src="/jennabot/logo.png" alt="Jennabot AI" width={32} height={32} priority className="rounded-full" style={{ width: "auto", height: "auto" }} />
            <div className="hidden sm:block">
              <p className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>Jennabot</p>
              <span className="font-display block text-sm font-semibold transition-colors" style={{ color: 'var(--text-1)' }}>AI Creation System</span>
            </div>
            <span className="font-display text-sm font-semibold tracking-wide sm:hidden" style={{ color: 'var(--text-1)' }}>Jennabot</span>
          </a>
          <nav className="font-display hidden items-center gap-1 md:flex">
            {["Features", "Pricing", "FAQ", "Store"].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} className="rounded-lg px-3.5 py-2 text-sm text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white">{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="#auth-section" className="hidden h-9 items-center rounded-lg px-4 text-sm font-medium transition sm:inline-flex" style={{ color: 'var(--text-2)' }}>Log in</a>
            <a href="#auth-section" className="btn-glow inline-flex h-9 items-center rounded-xl px-5 text-sm font-semibold text-white">Sign up free</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="section-shell overflow-hidden px-4 pt-20 pb-20 sm:px-6 lg:px-8 lg:pt-32 lg:pb-28">
        <div className="hero-glow" />
        <div className="orb orb-violet" style={{ width: 400, height: 400, top: "5%", left: "10%" }} />
        <div className="orb orb-blue" style={{ width: 350, height: 350, top: "20%", right: "5%" }} />
        <div className="grid-pattern absolute inset-0 -z-5" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="animate-fade-up mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/60 backdrop-blur">
              <span className="live-dot" /> <span>Powered by Veo 3.1 & Nano Banana Pro</span>
            </div>
            <h1 className="font-display text-[2.8rem] font-bold leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-[5.5rem]">
              Buat konten menakjubkan dengan{" "}
              <span className="gradient-text">AI tools</span>{" "}
              terbaik.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/50">
              Image Generator, Video Generator, Product Studio, dan lainnya — semua dalam satu platform.
              Dari ide ke konten jadi dalam hitungan menit.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="#auth-section" className="btn-glow inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm font-semibold text-white">
                Mulai buat gratis <ArrowIcon />
              </a>
              <a href="#features" className="glass-card inline-flex h-12 items-center rounded-full px-8 text-sm font-medium text-white/80">
                Lihat fitur
              </a>
            </div>
          </div>

          {/* STATS */}
          <div className="animate-fade-up-delay-2 mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="stat-glow glass-card rounded-2xl px-5 py-5 text-center">
                <p className="font-display text-2xl font-bold tracking-tight gradient-text">{s.value}</p>
                <p className="mt-1 text-xs text-white/40">{s.label}</p>
              </div>
            ))}
          </div>

          {/* HERO GALLERY */}
          <div className="animate-fade-up-delay-3 hero-card-float mx-auto mt-16 max-w-5xl rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur sm:p-5">
            <div className="flex items-center justify-between gap-4 px-1 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Galeri Langsung</p>
                <h2 className="font-display mt-1 text-lg font-semibold text-white sm:text-xl">Preview Workspace</h2>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/60">Jennabot</span>
            </div>
            <div className="grid grid-cols-12 gap-3">
              {heroTiles.map((t) => (
                <article key={t.src} className={`${t.className} image-card group relative min-h-[140px] overflow-hidden rounded-2xl`}>
                  <Image src={t.src} alt={t.alt} fill sizes="(min-width:1024px) 30vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute right-3 bottom-3 left-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/50">Preview</p>
                    <p className="font-display mt-0.5 text-sm font-medium text-white">{t.title}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="section-divider" />
      <section className="overflow-hidden py-6">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="mx-4 whitespace-nowrap text-sm font-medium text-white/20">
              {item} <span className="mx-4 text-white/10">✦</span>
            </span>
          ))}
        </div>
      </section>
      <div className="section-divider" />

      {/* FEATURES */}
      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="tag-pill inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">AI Tools</p>
            <h2 className="font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Semua tools untuk <span className="gradient-text">create & sell</span>
            </h2>
            <p className="mt-4 text-base leading-7 text-white/45">6 powerful AI tools, satu sistem kredit, tanpa ribet.</p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((f) => (
              <a key={f.title} href={f.url} className="glass-card group rounded-3xl p-6 sm:p-8 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(139,92,246,0.15)] block">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-3xl">{f.emoji}</span>
                  <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/50">{f.badge}</span>
                </div>
                <h3 className="font-display mt-5 text-xl font-semibold group-hover:text-violet-300 transition-colors">{f.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/50">{f.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {f.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-white/45">{tag}</span>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Mulai pakai →</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="orb orb-cyan" style={{ width: 300, height: 300, bottom: "10%", left: "5%", position: "absolute" }} />
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="tag-pill inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">How it works</p>
            <h2 className="font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              From <span className="gradient-text-warm">zero to creator</span> in four steps
            </h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((s, i) => (
              <div key={s.step} className={`glass-card rounded-3xl p-6 animate-fade-up-delay-${i + 1}`}>
                <span className="font-display text-4xl font-bold gradient-text">{s.step}</span>
                <h3 className="font-display mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/45">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* PRICING */}
      <section id="pricing" className="section-shell px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="orb orb-violet" style={{ width: 350, height: 350, top: "10%", right: "10%", position: "absolute" }} />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="tag-pill inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">Harga</p>
            <h2 className="font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Harga simpel, <span className="gradient-text">tools powerful</span>
            </h2>
            <p className="mt-4 text-base leading-7 text-white/45">Mulai gratis dengan kredit starter. Top up kapan saja sesuai kebutuhan.</p>
          </div>

          <PricingSection />

          {/* CREDIT COSTS */}
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Biaya gambar", value: "5 poin" },
              { label: "Biaya video", value: "20 poin" },
              { label: "Kredit starter", value: "Gratis" },
              { label: "Download", value: "Tanpa batas" },
            ].map((c) => (
              <div key={c.label} className="glass-card rounded-2xl p-4 text-center">
                <p className="text-xs text-white/35">{c.label}</p>
                <p className="font-display mt-1 text-lg font-bold gradient-text">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* FAQ */}
      <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="tag-pill inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">FAQ</p>
            <h2 className="font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Pertanyaan yang sering diajukan</h2>
          </div>
          <div className="mt-12 space-y-4">
            {faqItems.map((faq) => (
              <details key={faq.q} className="glass-card group rounded-2xl">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-sm font-medium text-white list-none [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="font-display shrink-0 text-xl text-white/30 transition-transform duration-300 group-open:rotate-45">+</span>
                </summary>
                <div className="px-6 pb-5 text-sm leading-7 text-white/45">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* AUTH */}
      <section id="auth-section" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="border-gradient rounded-3xl p-6 backdrop-blur sm:p-8 lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
              <div>
                <p className="tag-pill inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">Mulai Sekarang</p>
                <h2 className="font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Mulai buat konten dengan <span className="gradient-text">satu login</span>
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/45">
                  Akses AI Image Generator, Video Generator, Product Studio, dan semua tools — dari satu akun dengan sistem kredit terpadu.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-center gap-2 text-emerald-400"><ShieldIcon /><p className="text-sm font-medium text-white">Akses instan</p></div>
                    <p className="mt-2 text-sm leading-6 text-white/40">Login dengan Google atau email. Mulai generate dalam 30 detik.</p>
                  </div>
                  <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-center gap-2 text-violet-400"><CreditIcon /><p className="text-sm font-medium text-white">Kredit starter gratis</p></div>
                    <p className="mt-2 text-sm leading-6 text-white/40">Akun baru mendapat kredit gratis untuk mencoba semua fitur AI.</p>
                  </div>
                </div>
              </div>
              <AuthForm />
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* SUPPORT */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="tag-pill inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">Bantuan</p>
            <h2 className="font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Support langsung, bukan form tanpa balasan</h2>
            <p className="mt-4 text-base leading-7 text-white/45">Komunitas dan admin support langsung untuk membantu kapan saja.</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {supportCards.map((c) => (
              <article key={c.title} className="glass-card rounded-3xl p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <div className="feature-icon"><ChatIcon /></div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${c.badge === "FREE" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{c.badge}</span>
                </div>
                <h3 className="font-display mt-5 text-2xl font-semibold">{c.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/45">{c.description}</p>
                <a href={c.href} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-white transition hover:bg-white/[0.08]">
                  Hubungi sekarang <ArrowIcon className="h-3.5 w-3.5" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="section-shell mx-auto max-w-7xl overflow-hidden rounded-3xl p-8 sm:p-12 lg:p-16">
          <div className="hero-glow" style={{ opacity: 0.6 }} />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Siap ubah AI jadi <span className="gradient-text-warm">mesin konten</span> Anda?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/45">Gabung ribuan kreator yang sudah pakai Jennabot. Mulai gratis, scale kapan saja.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="#auth-section" className="btn-glow inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm font-semibold text-white">
                Mulai buat gratis <ArrowIcon />
              </a>
              <a href="https://wa.me/" target="_blank" rel="noreferrer" className="glass-card inline-flex h-12 items-center rounded-full px-8 text-sm font-medium text-white/80">
                Hubungi support
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <Image src="/jennabot/logo.png" alt="Jennabot AI" width={36} height={36} className="rounded-full" style={{ width: "auto", height: "auto" }} />
              <div>
                <p className="font-display text-lg font-semibold">Jennabot</p>
                <p className="text-sm text-white/35">Sistem AI creation</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/40">AI Image Generator, Video Generator, Product Studio, dan tools kreatif lainnya dalam satu platform.</p>
          </div>
          {[
            { title: "Produk", links: [["Fitur", "#features"], ["Harga", "#pricing"], ["Login", "#auth-section"]] },
            { title: "Tools", links: LANDING_FEATURES.slice(0, 4).map(f => [f.title, f.url]) },
            { title: "Bantuan", links: [["WhatsApp Community", "https://chat.whatsapp.com/"], ["Customer Support", "https://wa.me/"], ["FAQ", "#faq"]] },
          ].map((col) => (
            <div key={col.title}>
              <p className="font-display text-sm font-semibold text-white/70">{col.title}</p>
              <div className="mt-4 space-y-3 text-sm">
                {col.links.map(([label, href]) => (
                  <a key={label} href={href} className="block text-white/35 transition hover:text-white/70">{label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs text-white/25 sm:flex-row sm:justify-between">
          <p>© 2026 Jennabot AI. All rights reserved.</p>
          <p>Powered by AI ✦</p>
        </div>
      </footer>
    </main>
  );
}
