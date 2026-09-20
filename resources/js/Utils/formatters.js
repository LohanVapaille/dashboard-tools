// resources/js/Utils/formatters.js
export function formatDate(dateString) {
    if (!dateString) return "";

    // Si la date est déjà au format YYYY-MM-DD (format classique de la BDD)
    const parts = dateString.split("-");
    if (parts.length === 3) {
        // [YYYY, MM, DD] -> [DD, MM, YYYY]
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    // Fallback si c'est un objet Date ou un autre format
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;

    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}
