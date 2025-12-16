//
// ====================================================================
// SPONSOR-MEDIA.JS - Caricamento random sponsor e media partner
// ====================================================================
//

window.SponsorMedia = {

    // Lista URL sponsor
    sponsors: [
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/MONDO%20SErrande.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/apracadabra.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/assicurazioni%20fortuna.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/auto%20spinta.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/bar%20sportivo.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/birra%20del%20borgo.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/birra%20grossa.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/birra%20terzo%20tempo.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/birrificio%20del%20pareggio.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/budget%20finito.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/caff%C3%A8%20doro.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/contropiede.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/caff%C3%A8%20var.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/carni%20rizzi.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/cda%20riunito.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/e82998b9-811e-40ae-a3fb-a64e72111b00.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/edil%20raptor.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/edilnova.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/fallimento%20expresso.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/feralux.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/ferramenta%20gol.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/forno%20calciatore.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/frigotech.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/gastroline.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/gelateria.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/hydrokick.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/idroflash.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/impresa%20quadrifoglio.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/ital%20lubrificanti.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/italpowe.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/mr%20%20cleanup.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/officina%20sud.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/panificio%20del%2090.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/pasta%20suprema.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/pianeta%20debiti.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/pizzeria%20fuorigioco.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/pubblicit%C3%A0%20inutile.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/servizio%20luce.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/spaccaporta.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/sponsor%20finto.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/sponsor%20mancante.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/sponsor%20segreto.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/srl.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/tecno%20sfiga.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/tecnodomus.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/tiratardi.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Sponsor/trasporti%20lagana.png'
    ],

    // Lista URL media partner
    media: [
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/90+.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/Calcio%20Totale.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/Diretta%20stadio%20net.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/Il%20Pallone%20Di%20Quartiere.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/PANCHINA%20APERTA.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/Tele%20Sport%20Dragoncello.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/Tutto%20Calcio%20Oggi.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/assist%20lab.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/calcio%2024.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/calcio%20academy.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/calcio%20chronicle.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/calcio%20cuore.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/calcio%20digitale.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/calcio%20street.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/calcio%20underground.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/corner%20club.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/curva%20podcast.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/fuoriarea.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/fuorigioco.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/goalstream.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/gol%20d%27archivio.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/il%20mister%20del%20divano.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/kickoff%20magazine.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/la%20bordata.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/lavagna%20del%20mister.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/matchzone.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/meta%20gol.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/piede%20educato.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/pressing%20point.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/radio%20croccante.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/radio%20curva%20nord.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/radio%20fuorigioco.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/replay%20channel.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/spoglatoio%20live.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/stat%20e%20skill.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/tifo%20urbano.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/undici%20e%20mezzo.png',
        'https://raw.githubusercontent.com/carciofiatomici-bot/immaginiserie/main/Media/zona%20var.png'
    ],

    /**
     * Seleziona un elemento random da un array
     */
    getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * Inizializza sponsor e media con immagini random
     */
    init() {
        console.log("SponsorMedia.init() chiamato");

        // Imposta sponsor random
        const sponsorImg = document.getElementById('sponsor-image');
        if (sponsorImg) {
            const sponsorUrl = this.getRandomItem(this.sponsors);
            console.log("Sponsor URL:", sponsorUrl);
            sponsorImg.src = sponsorUrl;
        } else {
            console.log("Elemento sponsor-image non trovato");
        }

        // Imposta media random
        const mediaImg = document.getElementById('media-image');
        if (mediaImg) {
            const mediaUrl = this.getRandomItem(this.media);
            console.log("Media URL:", mediaUrl);
            mediaImg.src = mediaUrl;
        } else {
            console.log("Elemento media-image non trovato");
        }
    }
};

// Inizializza al caricamento della pagina
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.SponsorMedia.init();
    });
} else {
    // DOM gia caricato
    window.SponsorMedia.init();
}

console.log("Modulo Sponsor-Media caricato.");
