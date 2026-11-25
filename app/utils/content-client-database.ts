/**
 * Production static builds cannot execute Nuxt Content's client SQL fallback:
 * the generated site has no runtime query endpoint. Keeping the WASM adapter
 * would ship the database engine even though every page uses prerendered data.
 */
export default async function createContentClientDatabase(): Promise<never> {
  throw new Error('Client-side content database is disabled in production')
}
