import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Search, Percent, ShoppingBag, Zap, ShieldCheck, TrendingDown, ArrowLeft, Sparkles, Store } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import HowItWorksCards from '@/components/HowItWorksCards';
import InputSys from '@/components/InputSys';

export const metadata: Metadata = {
  title: 'قارنها — قارن أسعار المنتجات من Amazon و Noon و Jumia',
  description:
    'قارن أسعار أي منتج من Amazon.eg و Noon و Jumia في ثوانٍ. نجمع لك أفضل العروض ونرتبها من الأرخص للأغلى لتوفير فلوسك.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'قارنها — قارن أسعار المنتجات من Amazon و Noon و Jumia',
    description:
      'قارن أسعار أي منتج من Amazon.eg و Noon و Jumia في ثوانٍ. نجمع لك أفضل العروض ونرتبها من الأرخص للأغلى.',
    url: '/',
  },
};

const FEATURES = [
  {
    icon: <Zap size={26} />,
    title: 'نتائج فورية',
    description: 'نجمع الأسعار من عدة متاجر في ثوانٍ معدودة بدل ما تقضي وقت طويل في البحث اليدوي.',
    accent: 'purple',
  },
  {
    icon: <TrendingDown size={26} />,
    title: 'أقل سعر مضمون',
    description: 'نرتب المنتجات تصاعدياً حسب السعر ونبرز لك أفضل عرض مع البائع والمصدر بوضوح.',
    accent: 'blue',
  },
  {
    icon: <ShieldCheck size={26} />,
    title: 'نتائج ذات صلة',
    description: 'محرك ذكي يصفي النتائج بناءً على تطابق اسم المنتج مع بحثك لتفادي النتائج العشوائية.',
    accent: 'green',
  },
  {
    icon: <Store size={26} />,
    title: 'متاجر متعددة',
    description: 'Amazon.eg و Noon و Jumia والآن Google Shopping — كل المتاجر في مكان واحد.',
    accent: 'purple',
  },
];

const STATS = [
  { value: '4+', label: 'متاجر مدعومة' },
  { value: '~30ث', label: 'متوسط زمن البحث' },
  { value: '12K+', label: 'منتج تمت مقارنته' },
  { value: '95%', label: 'دقة الترتيب' },
];

const POPULAR_SEARCHES = [
  'ايفون 15',
  'جالكسي اس 24',
  'سماعات ايربودز',
  'لاب توب لينوفو',
  'ساعة ابل',
  'بلايستيشن 5',
];

export default function Page() {
  return (
    <>
      {/* Hero Section */}
      <section id="hero-viewport" className="flex flex-col items-center justify-center px-4 pt-10 pb-6">
        <div
          id="hero"
          className="flex m-auto items-center justify-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary mb-8 animate-bounce"
        >
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-purple-500 font-bold">تحديثات الأسعار فورية</span>
        </div>

        <div className="flex gap-4 flex-col items-center justify-center max-w-4xl" id="hero-section">
          <h1 className="text-5xl md:text-7xl font-extrabold text-primary text-center tracking-tight leading-tight">
            قارن الأسعار من
            <br />
            <span className="gradient-text">كل المتاجر</span>
          </h1>
          <h2 className="text-xl md:text-2xl text-secondary text-center leading-relaxed max-w-2xl">
            اعثر على أفضل العروض في مصر والسعودية والإمارات في ثوانٍ. نوفر عليك عناء البحث ونضمن لك أقل سعر.
          </h2>

          <div className="w-full max-w-3xl mt-4">
            <Suspense fallback={null}>
              <InputSys />
            </Suspense>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-sm text-secondary">
            <span className="text-muted">جرب:</span>
            {POPULAR_SEARCHES.map((q) => (
              <Link
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="pill text-xs"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="flex mt-20 mb-10 gap-10 flex-col items-center justify-center w-full max-w-6xl md:gap-10 mx-auto px-4"
      >
        <div className="flex flex-col items-center gap-3 text-center mb-8">
          <span className="pill text-xs">
            <Sparkles size={14} /> 3 خطوات بسيطة
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-primary">كيف يعمل الموقع</h2>
          <p className="text-lg text-secondary">ثلاث خطوات بسيطة لتوفير المال في كل عملية شراء</p>
        </div>

        <div className="flex flex-col md:flex-row md:gap-10 gap-7 w-full items-center md:items-stretch justify-center">
          <HowItWorksCards
            title="1. ابحث عن المنتج"
            subTitle="اكتب اسم المنتج الذي تريده في شريط البحث وسنقوم بجلبه من جميع المتاجر المتاحة."
            icon={<Search />}
            iconcolor="purple"
          />
          <HowItWorksCards
            title="2. قارن الأسعار"
            subTitle="عرض قائمة مجمعة بالأسعار من أمازون، نون وجوميا وغيرها لتختار الأفضل."
            icon={<Percent />}
            iconcolor="blue"
          />
          <HowItWorksCards
            title="3. اشترِ بأقل سعر"
            subTitle="انتقل مباشرة للمتجر لإتمام عملية الشراء بأرخص سعر متوفر في السوق."
            icon={<ShoppingBag />}
            iconcolor="green"
          />
        </div>
      </section>

      {/* Stats strip */}
      <section className="w-full py-12 border-y border-white/5 bg-bg-primary/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="text-3xl md:text-4xl font-extrabold gradient-text">{s.value}</span>
              <span className="text-sm text-secondary">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="w-full max-w-6xl mx-auto px-4 py-20">
        <div className="flex flex-col items-center text-center gap-3 mb-12">
          <span className="pill text-xs">لماذا قارنها؟</span>
          <h2 className="text-3xl md:text-5xl font-bold text-primary">كل اللي محتاجه في مكان واحد</h2>
          <p className="text-secondary max-w-2xl">
            مش مجرد بحث — تجربة كاملة من المقارنة السريعة حتى الشراء بأرخص سعر.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

      {/* Supported stores */}
      <section className="w-full flex flex-col justify-center py-16 border-y border-white/5 bg-[#0f172a]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 text-center mb-8">
          <h3 className="text-sm font-semibold tracking-wider uppercase text-secondary">
            ندعم البحث في أكبر المتاجر العالمية والمحلية
          </h3>
        </div>
        <div className="flex items-center gap-10 text-2xl font-bold text-white flex-wrap justify-center">
          <div className="flex items-center gap-2 text-2xl font-bold text-secondary">
            <Image
              src="/icons/amazon-shopping-alt-svgrepo-com.svg"
              alt="amazon"
              width={50}
              height={50}
              className="invert opacity-50 brightness-0"
            />
            Amazon.eg
          </div>
          <div className="flex items-center gap-2 text-2xl font-bold text-secondary">
            <Image
              src="/icons/shopping-bag-svgrepo-com.svg"
              alt="noon"
              width={50}
              height={50}
              className="invert opacity-50 brightness-0"
            />
            Noon
          </div>
          <div className="flex items-center gap-2 text-2xl font-bold text-secondary">
            <Image
              src="/icons/star-circle-svgrepo-com.svg"
              alt="jumia"
              width={50}
              height={50}
              className="invert opacity-50 brightness-0"
            />
            Jumia
          </div>
          <div className="flex items-center gap-2 text-2xl font-bold text-secondary">
            <Image
              src="/icons/globe.svg"
              alt="google shopping"
              width={50}
              height={50}
              className="invert opacity-50 brightness-0"
            />
            Google Shopping
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full max-w-5xl mx-auto px-4 py-20">
        <div className="glass gradient-border relative overflow-hidden rounded-3xl p-10 md:p-14 text-center">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-purple/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-5">
            <h2 className="text-3xl md:text-5xl font-extrabold text-primary">
              جاهز تبدأ <span className="gradient-text">توفر فلوسك؟</span>
            </h2>
            <p className="text-secondary max-w-xl text-lg">
              اكتب اسم أي منتج دلوقتي وشوف أقل سعر متاح من كل المتاجر في ثوانٍ.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <Link href="/search" className="btn btn-primary px-8 py-4 text-lg">
                ابدأ البحث الآن
                <ArrowLeft size={20} />
              </Link>
              <Link href="/history" className="btn btn-outline px-8 py-4 text-lg">
                عرض السجل
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
