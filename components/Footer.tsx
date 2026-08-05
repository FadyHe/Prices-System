import React from 'react'
import Image from 'next/image'
import { Logo } from './Header'
import Link from 'next/link'

const socialLinks = [
  { icon: '/icons/globe.svg', alt: 'Website', href: '#' },
  { icon: '/icons/rss.svg', alt: 'RSS', href: '#' },
  { icon: '/icons/mail.svg', alt: 'Email', href: 'mailto:contact@qarinha.com' },
]

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full z-10 border-t border-[var(--paper-border-soft)] bg-bg-secondary py-12 text-secondary">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">

        <div className="col-span-1 md:col-span-1">
          <div className="mb-4">
            <Logo />
          </div>
          <p className="text-sm leading-relaxed mb-4">
            دفترك اللي بيكتب فيه كل سعر عشان توفر فلوسك. قارن الأسعار من كل
            المتاجر في مكان واحد.
          </p>
        </div>

        <div>
          <h3 className="text-primary font-bold mb-4">روابط سريعة</h3>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-deal transition-colors" href="/">الرئيسية</Link></li>
            <li><Link className="hover:text-deal transition-colors" href="/search">ابحث الآن</Link></li>
            <li><Link className="hover:text-deal transition-colors" href="/history">سجل البحث</Link></li>
            <li><Link className="hover:text-deal transition-colors" href="/#how-it-works">بيشتغل ازاي</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-primary font-bold mb-4">المساعدة</h3>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-deal transition-colors" href="#">الأسئلة الشائعة</Link></li>
            <li><Link className="hover:text-deal transition-colors" href="#">سياسة الخصوصية</Link></li>
            <li><Link className="hover:text-deal transition-colors" href="#">شروط الاستخدام</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-primary font-bold mb-4">اشترك في النشرة</h3>
          <div className="flex gap-2">
            <input
              className="bg-bg-card border border-[var(--paper-border)] rounded-lg px-3 py-2 w-full text-sm text-primary placeholder:text-muted focus:outline-none focus:border-deal"
              placeholder="بريدك الإلكتروني"
              type="email"
            />
            <button className="bg-deal hover:bg-deal/90 text-white rounded-lg px-3 py-2 transition-colors cursor-pointer">
              <Image src="/icons/arrow-left.svg" alt="Submit" width={18} height={18} />
            </button>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-[var(--paper-border-soft)] flex flex-col md:flex-row justify-between items-center text-sm">
        <p>© {currentYear} قارنها. جميع الحقوق محفوظة.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          {socialLinks.map((link) => (
            <Link key={link.alt} className="hover:text-deal transition-colors" href={link.href}>
              <Image src={link.icon} alt={link.alt} width={20} height={20} />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default Footer