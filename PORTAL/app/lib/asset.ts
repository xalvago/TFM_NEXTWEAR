/**
 * El portal se sirve bajo /portal (basePath). Next antepone el basePath a <Link>,
 * next/image y al router, pero no a las rutas escritas a mano en <video>, <img> o <a>.
 */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
