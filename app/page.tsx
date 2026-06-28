import { Search, Percent, ShoppingBag } from "lucide-react";
import HowItWorksCards from "@/components/HowItWorksCards";
import InputSys from "@/components/InputSys";
import Image from "next/image";

export default function page() {
   

  return (
  <>
    {/* Hero Section */}
    <section id="hero-viewport" className="flex flex-col items-center justify-center px-4">
        <div 
        id="hero"
        className="flex m-auto items-center justify-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary my-8 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span className="text-purple-500 font-bold">تحديثات الأسعار فورية</span>
        </div>
        <div className="flex m-5 gap-4 flex-col items-center justify-center max-w-4xl" id="hero-section">
          <h1 className="text-5xl md:text-7xl font-extrabold text-primary text-center tracking-tight">قارن الأسعار من<br/><span className="gradient-text">كل المتاجر</span></h1>
          <h2 className="text-xl md:text-2xl text-secondary text-center leading-relaxed max-w-2xl">اعثر على أفضل العروض في مصر والسعودية والإمارات في ثوانٍ. نوفر عليك عناء البحث ونضمن لك أقل سعر.</h2>
                
        <InputSys href="/search-results"/>
        </div>
    </section>

    {/* How It Works Section */}
    <section 
      id="how-it-works"
      className="flex mt-20 mb-10 gap-10 flex-col items-center justify-center w-full max-w-6xl md:gap-10 mx-auto"
    >
      <div className="flex flex-col items-center gap-7 text-center mb-8">
        <h2 className="text-4xl md:text-5xl font-bold text-primary">كيف يعمل الموقع</h2>
        <p className="text-lg text-secondary">ثلاث خطوات بسيطة لتوفير المال في كل عملية شراء</p>
      </div>
      
      <div className="flex flex-col md:flex-row md:gap-10 gap-7 md:h-65 h-220 w-full items-center md:items-stretch justify-center">
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
    
    <section className="w-full flex flex-col justify-center py-16 border-y border-white/5 bg-[#0f172a]/50 backdrop-blur-sm">

      <div className="max-w-7xl mx-auto px-6 text-center mb-8">
        <h3 className="text-sm font-semibold tracking-wider uppercase text-secondary">ندعم البحث في أكبر المتاجر العالمية والمحلية</h3>
      </div>
      <div className="flex items-center gap-10 text-2xl font-bold text-white flex-wrap justify-center">
        <div className="flex items-center gap-2 text-2xl font-bold text-secondary">
            <span className=""><Image src="/icons/amazon-shopping-alt-svgrepo-com.svg" alt="amazon" width={50} height={50} className="invert opacity-50 brightness-0"/></span> Amazon.eg
        </div>
        <div className="flex items-center gap-2 text-2xl font-bold text-secondary">
            <span className=""><Image src="/icons/shopping-bag-svgrepo-com.svg" alt="noon" width={50} height={50} className="invert opacity-50 brightness-0"/></span> Noon
        </div>
        <div className="flex items-center gap-2 text-2xl font-bold text-secondary">
            <span className=""><Image src="/icons/star-circle-svgrepo-com.svg" alt="jumia" width={50} height={50} className="invert opacity-50 brightness-0"/></span> Jumia
        </div>
      </div>
    </section>
    
  </>
)
}
