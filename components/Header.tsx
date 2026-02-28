import Image from 'next/image'  
import Link from 'next/link'

function Header() {
  return (
    <header className='mt-5'>
      <nav className='flex flex-row items-center justify-center gap-40 md:gap-40'>
        
        <Logo />

        <div className='hidden md:flex flex-row items-center gap-12'>
          <Link href="/" className="text-secondary hover:text-white transition-colors font-medium">الرئيسية</Link>
          <Link href="/how-it-works" className="text-secondary hover:text-white transition-colors font-medium">بيشتغل ازاي</Link>
          <Link href="/store" className="text-secondary hover:text-white transition-colors font-medium">المتاجر</Link>
        </div>

        <div className='flex flex-row items-center gap-6'>
          <Link href="/login" className="hidden md:block text-secondary hover:text-white transition-colors text-sm font-medium">
            تسجيل الدخول
          </Link>
          <Link href="/register" className="btn btn-primary  text-sm font-bold">
            إنشاء حساب
          </Link>
        </div>

      </nav>
      <hr className='hr'/>
    </header>
  )
}

export default Header

export function Logo() {
  return (
    <Link href="/" className='flex flex-row items-center gap-3 group'>
      <Image 
        src="/explore-svgrepo-com.svg" 
        alt="Logo" 
        width={38} 
        height={38} 
        className="transition-transform duration-300 group-hover:scale-110"
      />
      <h1 className='text-2xl font-bold text-white tracking-tight' >
        قارن<span className='text-purple'>ها</span>
      </h1>
    </Link>
  )
}