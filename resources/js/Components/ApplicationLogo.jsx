// Logo Breeze remplacé par celui du site (favicon), pour les mises en page qui l'utilisent encore.
export default function ApplicationLogo({ className = "" }) {
    return <img src="/img/favicon.webp" alt="LovaTrip" className={`${className} rounded-full object-contain`} />;
}
