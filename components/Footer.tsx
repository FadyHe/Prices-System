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
    <footer className="w-full z-10 border-t border-white/5 bg-[#0b1120] py-12 text-secondary">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">

        <div className="col-span-1 md:col-span-1">
          <div className="mb-4">
            <Logo />
          </div>
          <p className="text-sm leading-relaxed mb-4">
            منصتك الأولى لمقارنة الأسعار في الشرق الأوسط. نوفر لك الوقت والمال بضغطة زر.
          </p>
        </div>

        <div>
          <h3 className="text-white font-bold mb-4">روابط سريعة</h3>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-purple transition-colors" href="#">الرئيسية</Link></li>
            <li><Link className="hover:text-purple transition-colors" href="/how-it-works">بيشتغل ازاي</Link></li>
            <li><Link className="hover:text-purple transition-colors" href="/store">المتاجر</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-bold mb-4">المساعدة</h3>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-purple transition-colors" href="#">الأسئلة الشائعة</Link></li>
            <li><Link className="hover:text-purple transition-colors" href="#">سياسة الخصوصية</Link></li>
            <li><Link className="hover:text-purple transition-colors" href="#">شروط الاستخدام</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-bold mb-4">اشترك في النشرة</h3>
          <div className="flex gap-2">
            <input
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 w-full text-sm text-white focus:outline-none focus:border-purple/50"
              placeholder="بريدك الإلكتروني"
              type="email"
            />
            <button className="bg-purple hover:bg-purple/90 text-white rounded-lg px-3 py-2 transition-colors cursor-pointer">
              <Image src="/icons/arrow-left.svg" alt="Submit" width={18} height={18} />
            </button>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-sm">
        <p>© {currentYear} قارنها. جميع الحقوق محفوظة.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          {socialLinks.map((link) => (
            <Link key={link.alt} className="hover:text-white transition-colors" href={link.href}>
              <Image src={link.icon} alt={link.alt} width={20} height={20} />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default Footer