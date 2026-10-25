/** Logo du site : le favicon, pour une identité identique à l'onglet du navigateur. */
export default function BrandMark({ className = "h-8 w-8" }) {
    return <img src="/img/favicon.webp" alt="" className={`${className} shrink-0 rounded-full shadow-lg shadow-blue-500/30`} />;
}
