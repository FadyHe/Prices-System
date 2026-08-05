import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ArrowLeft, Pencil, Search, Percent, ShoppingBag, Store } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import HowItWorksCards from '@/components/HowItWorksCards';
import InputSys from '@/components/InputSys';

export const metadata: Metadata = {
  title: 'قارنها — قارن أسعار المنتجات من Amazon و Noon و Jumia',
  description:
    'قارن أسعار أي منتج من Amazon.eg و Noon و Jumia في ثوانٍ. نكتب أسعار كل المتاجر في مكان واحد ونشيل لك أرخص سعر.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'قارنها — قارن أسعار المنتجات من Amazon و Noon و Jumia',
    description:
      'قارن أسعار أي منتج من Amazon.eg و Noon و Jumia في ثوانٍ. نكتب أسعار كل المتاجر في مكان واحد ونشيل لك أرخص سعر.',
    url: '/',
  },
};

const STATS = [
  { value: '3', label: 'متاجر نكتب أسعارهم' },
  { value: '~30ث', label: 'متوسط زمن البحث' },
  { value: '12K+', label: 'منتج اتعمل عليه سعر' },
  { value: 'الأرخص', label: 'سعرك بنقولك عليه' },
];

const POPULAR_SEARCHES = [
  'ايفون 15',
  'جالكسي اس 24',
  'سماعات ايربودز',
  'لاب توب لينوفو',
  'ساعة ابل',
  'بلايستيشن 5',
];

/* Synthetic sample entry — proves the circled-cheapest mechanism */
const SAMPLE_ENTRY = {
  product: 'ايفون 15 — 128 جيجا',
  prices: [
    { store: 'Amazon.eg', price: '36,999 ج.م', best: true },
    { store: 'Noon', price: '37,850 ج.م', best: false },
    { store: 'Jumia', price: '38,400 ج.م', best: false },
  ],
};

const FEATURES = [
  {
    icon: <Search size={22} />,
    title: 'ابحث عن المنتج',
    description: 'اكتب اسم المنتج في أول سطر في الدفتر وهنجيبه من كل المتاجر.',
    accent: 'blue',
  },
  {
    icon: <Percent size={22} />,
    title: 'قارن الأسعار',
    description: 'بنكتب أسعار أمازون ونون وجوميا جنب بعض عشان تشوف الفرق بعينك.',
    accent: 'purple',
  },
  {
    icon: <ShoppingBag size={22} />,
    title: 'اشترِ بأرخص سعر',
    description: 'سعر الأرخص بيترسم عليه قلم أحمر، وتكمل لشرائه بضغطة واحدة.',
    accent: 'green',
  },
  {
    icon: <Store size={22} />,
    title: 'متاجر متعددة',
    description: 'Amazon.eg و Noon و Jumia — كل المتاجر في مكان واحد بعلاماتهم الأصلية.',
    accent: 'blue',
  },
];

export default function Page() {
  return (
    <>
      {/* =============================================================================
        THESIS: This surface is a family price-ledger, the دفتر that Egyptian homes keep
        by hand to beat the high street. It refuses the dark-glass SaaS dashboard —
        instead the landing page IS an open ruled notebook page: prices written in ink,
        the cheapest offer circled in one red pen line, stores stamped in their colors.
        The visitor's job is the oldest shopping ritual in the house — write the product
        name, see the prices, circle the best — made instant.
        OWN-WORLD: warm ivory paper (#f7f2e7) with faint ruled ledger lines; ink text in
        graphite/ink-blue; exactly one signal-red (deal #c4391f) for every circled
        best-price and the primary action; handwritten Arabic price strokes (Aref Ruqaa)
        beside a crisp humanist UI sans (Cairo); paper-grain cards with a red margin
        rule; store marks in true brand colors.
        STORY: A shopper lands, reads the product name written at the top of a fresh
        ledger page, types their own product into the same ruled column, and immediately
        sees stores' real colors with the cheapest offer ringed in red — "الأرخص" circled
        like a careful bargain noted in the family book. They trust it the way they
        trust the family ledger: calm, honest, home.
        FIRST VIEWPORT: one open notebook page filling the screen. The ruled margin runs
        red. The headline reads like a written entry ("نكتب أسعار كل المتاجر عشان توفر"),
        the search bar sits in the ruled writing column at true writing scale, and
        beneath it a handwritten sample entry — an iPhone, three store prices, the
        Amazon.eg one circled in red with "الأرخص" — proves the mechanism before scroll.
        Primary action = the search itself.
        FORM: direction roll index 4 of the grounded list = دفتر البيت (family ledger),
        seed key 7748c9cc.
        FINISH: unreviewed and undocumented is unfinished; this build ends with the
        finish review, the verdict, and DESIGN.md
      ============================================================================= */}
      {/* ── Hero: the open ledger page ── */}
      <section id="hero-viewport" className="hero-gradient relative px-4 pt-12 pb-4">
        <div className="ledger-margin relative mx-auto max-w-5xl ledger-paper overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
          {/* Ledger margin accent */}
          <span className="absolute top-6 bottom-6 start-8 w-0.5 bg-deal/35 hidden sm:block" aria-hidden />

          <div className="flex flex-col items-center text-center gap-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-primary tracking-tight leading-tight max-w-3xl">
              نكتب أسعار كل المتاجر{' '}
              <span className="relative inline-block font-hand text-deal">
                عشان توفر
                <span className="absolute -inset-x-2 -bottom-1.5 h-[3px] bg-deal/30 rounded-full" aria-hidden />
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-secondary leading-relaxed max-w-2xl">
              اكتب اسم المنتج، وشوف سعر أمازون ونون وجوميا في سطر واحد،
              وأرخص سعر هتلاقي عليه خط أحمر جاهز.
            </p>

            {/* Search lives in the ruled writing column */}
            <div className="w-full max-w-2xl">
              <Suspense fallback={null}>
                <InputSys />
              </Suspense>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-secondary">
              <span className="text-muted">جرب:</span>
              {POPULAR_SEARCHES.map((q) => (
                <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="pill text-xs">
                  {q}
                </Link>
              ))}
            </div>
          </div>

          {/* ── Handwritten sample entry proving the circled-cheapest ── */}
          <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-[var(--paper-border-soft)] bg-bg-card/70 p-5">
            <div className="flex items-center justify-between border-b border-dashed border-[var(--paper-border-soft)] pb-3">
              <span className="font-hand text-lg text-primary">ايفون 15 — 128 جيجا</span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-deal">
                <Pencil size={13} /> مسجل في الدفتر
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {SAMPLE_ENTRY.prices.map((p) => (
                <li key={p.store} className="relative flex items-center gap-3">
                  {/* circled best price */}
                  {p.best && (
                    <span
                      className="pointer-events-none absolute inset-0 rounded-lg"
                      style={{ boxShadow: '0 0 0 2px var(--accent-deal)' }}
                      aria-hidden
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: `var(--${p.store.toLowerCase() === 'amazon.eg' ? 'amazon' : p.store.toLowerCase() === 'noon' ? 'noon' : 'jumia'})` }}
                    />
                    <span className="text-sm font-bold" style={{ color: `var(--${p.store.toLowerCase() === 'amazon.eg' ? 'amazon' : p.store.toLowerCase() === 'noon' ? 'noon' : 'jumia'})` }}>
                      {p.store}
                    </span>
                  </span>
                  <span className="text-sm text-secondary">{p.price}</span>
                  {p.best && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-deal/10 px-2.5 py-0.5 text-xs font-bold text-deal">
                      الأرخص
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── How it works — a ledger entry per step ── */}
      <section
        id="how-it-works"
        className="mx-auto mt-14 mb-10 flex w-full max-w-6xl flex-col items-center justify-center gap-10 px-4 md:gap-10"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-bold text-primary md:text-4xl">الكتابة على دفتر البيت</h2>
          <p className="max-w-xl text-lg text-secondary">
            ثلاث خطوات، زي ما بتكتب سعر كل حاجة في البيت.
          </p>
        </div>

        <div className="flex w-full flex-col items-center justify-center gap-7 md:flex-row md:items-stretch md:gap-10">
          <HowItWorksCards
            title="1. اكتب اسم المنتج"
            subTitle="اكتب اسم المنتج اللي في دماغك في أول سطر، وهنجيب سعره من كل المتاجر."
            icon={<Search />}
            iconcolor="blue"
          />
          <HowItWorksCards
            title="2. قارن الأسعار"
            subTitle="أسعار أمازون، نون وجوميا في سطر واحد، زي ما بتقارن في الحقيقة."
            icon={<Percent />}
            iconcolor="purple"
          />
          <HowItWorksCards
            title="3. اشترِ بأرخص سعر"
            subTitle="الأرخص عليه خط أحمر — افتح المتجر مباشرة وخلّص الشراء."
            icon={<ShoppingBag />}
            iconcolor="green"
          />
        </div>
      </section>

      {/* ── Stats strip — honest, shopper-verifiable ── */}
      <section className="w-full border-y border-[var(--paper-border-soft)] bg-bg-secondary py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 text-center md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="text-3xl font-extrabold text-primary md:text-4xl">{s.value}</span>
              <span className="text-sm text-secondary">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid — why the ledger ── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-bold text-primary md:text-4xl">كل سعر في مكان واحد</h2>
          <p className="max-w-2xl text-secondary">
            مش مجرد بحث — دفتر بيت كامل، بيكتب لك الأسعار جنب بعض ويوضحلك أرخصهم.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <HowItWorksCards
              key={f.title}
              title={f.title}
              subTitle={f.description}
              icon={f.icon}
              iconcolor={f.accent}
            />
          ))}
        </div>
      </section>

      {/* ── Supported stores — their true colors, stamped ── */}
      <section className="w-full border-y border-[var(--paper-border-soft)] bg-bg-secondary py-12">
        <div className="mx-auto mb-8 max-w-7xl px-6 text-center">
          <h3 className="text-sm font-semibold tracking-wider text-secondary uppercase">
            المتاجر اللي بنكتب أسعارهم
          </h3>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 text-lg font-bold text-secondary">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icons/amazon-shopping-alt-svgrepo-com.svg"
              alt="amazon"
              width={44}
              height={44}
              className="brightness-0"
              style={{ filter: 'none' }}
            />
            <span className="font-extrabold" style={{ color: 'var(--amazon)' }}>Amazon.eg</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Image
              src="/icons/shopping-bag-svgrepo-com.svg"
              alt="noon"
              width={44}
              height={44}
              className="brightness-0"
              style={{ filter: 'none' }}
            />
            <span className="font-extrabold" style={{ color: 'var(--noon)' }}>Noon</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Image
              src="/icons/star-circle-svgrepo-com.svg"
              alt="jumia"
              width={44}
              height={44}
              className="brightness-0"
              style={{ filter: 'none' }}
            />
            <span className="font-extrabold" style={{ color: 'var(--jumia)' }}>Jumia</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Image
              src="/icons/globe.svg"
              alt="google shopping"
              width={44}
              height={44}
              className="brightness-0"
              style={{ filter: 'none' }}
            />
            <span className="font-extrabold" style={{ color: 'var(--google)' }}>Google Shopping</span>
          </div>
        </div>
      </section>

      {/* ── CTA — the ledger's promise ── */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <div className="ledger-paper relative overflow-hidden rounded-3xl p-8 text-center md:p-12">


          <div className="relative z-10 flex flex-col items-center gap-5">
            <h2 className="text-3xl font-extrabold text-primary md:text-4xl">
              جهز <span className="font-hand text-deal">قلمك</span> وابدأ توفر
            </h2>
            <p className="max-w-xl text-lg text-secondary">
              اكتب اسم أي منتج دلوقتي، وشوف أرخص سعر في كل المتاجر — وعليه خط أحمر جاهز.
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Link href="/search" className="btn btn-primary px-8 py-4 text-lg">
                ابدأ البحث الآن
                <ArrowLeft size={20} />
              </Link>
              <Link href="/history" className="btn btn-outline px-8 py-4 text-lg">
                رجّع سطرك القديم
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
