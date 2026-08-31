import type { Locale } from '@/i18n'

interface LocalisableProduct {
  name: string
  nameRu?: string | null
  nameTg?: string | null
  description?: string | null
  descriptionRu?: string | null
  descriptionTg?: string | null
}

/**
 * Picks the localised version of a product field.
 * Falls back to the English original if the translation is empty.
 * Brand names, model codes (e.g. "Series X", "Deluxe") are embedded
 * in the translated strings by the seed — no special handling needed here.
 */
export function localiseProduct(
  product: LocalisableProduct,
  locale: Locale,
): { name: string; description: string | null | undefined } {
  if (locale === 'ru') {
    return {
      name: product.nameRu || product.name,
      description: product.descriptionRu || product.description,
    }
  }
  if (locale === 'tg') {
    return {
      name: product.nameTg || product.name,
      description: product.descriptionTg || product.description,
    }
  }
  return { name: product.name, description: product.description }
}
