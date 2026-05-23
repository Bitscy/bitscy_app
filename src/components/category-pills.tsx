'use client'

import { useState } from 'react'

const CATEGORIES = [
  'Paintings',
  'Jewelry',
  'Textiles',
  'Leather',
  'Pottery',
  'Sculpture',
  'Prints',
  'Other',
]

interface CategoryPillsProps {
  onCategoryChange?: (category: string) => void
}

export default function CategoryPills({ onCategoryChange }: CategoryPillsProps) {
  const [selectedCategory, setSelectedCategory] = useState('Paintings')

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    onCategoryChange?.(category)
  }

  return (
    <div className="sticky top-20 z-10 bg-bitscy-background pt-6 pb-6 border-b border-[#E5DDD0]">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide pl-5 pr-5">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all min-h-[44px] flex items-center ${
              selectedCategory === category
                ? 'bg-[#2D5F5D] text-white border-none'
                : 'bg-white border-[1.5px] border-[#2D5F5D] text-[#2D5F5D]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  )
}
