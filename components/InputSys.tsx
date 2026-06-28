'use client'
import { useScraper } from "@/components/useScraper"
import Link from "next/link"


function InputSys(href:string) {
   const {
    scrapeQuery,
    setScrapeQuery,
    filterQuery,
    setFilterQuery,
    products,
    filteredProducts,
    loading,
    error,
    handleScrape,
  } = useScraper();

  return (
    <section>
      <form onSubmit={handleScrape} className="relative z-10 flex flex-row gap-4 w-full mx-auto my-10">
            <input
              type="text"
              value={scrapeQuery}
              onChange={(e) => setScrapeQuery(e.target.value)}
              placeholder="ابحث عن منتج"
              className="input input-lg flex text-right p-4 w-100 md:w-150"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !scrapeQuery.trim()}
              className="btn btn-primary"
            >
              <Link href={href}>
                {loading ? 'جاري البحث...' : 'بحث'}
              </Link>

            </button>
          </form>
    </section>
  )
}

export default InputSys