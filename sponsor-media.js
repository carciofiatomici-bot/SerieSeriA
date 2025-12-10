//
// ====================================================================
// SPONSOR-MEDIA.JS - Caricamento random sponsor e media partner
// ====================================================================
//

window.SponsorMedia = {

    // Lista URL sponsor
    sponsors: [
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/MONDO%20SErrande.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/apracadabra.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/assicurazioni%20fortuna.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/auto%20spinta.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/bar%20sportivo.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/birra%20del%20borgo.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/birra%20grossa.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/birra%20terzo%20tempo.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/birrificio%20del%20pareggio.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/budget%20finito.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/caff%C3%A8%20doro.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/contropiede.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/caff%C3%A8%20var.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/carni%20rizzi.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/cda%20riunito.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/e82998b9-811e-40ae-a3fb-a64e72111b00.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/edil%20raptor.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/edilnova.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/fallimento%20expresso.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/feralux.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/ferramenta%20gol.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/forno%20calciatore.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/frigotech.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/gastroline.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/gelateria.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/hydrokick.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/idroflash.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/impresa%20quadrifoglio.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/ital%20lubrificanti.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/italpowe.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/mr%20%20cleanup.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/officina%20sud.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/panificio%20del%2090.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/pasta%20suprema.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/pianeta%20debiti.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/pizzeria%20fuorigioco.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/pubblicit%C3%A0%20inutile.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/servizio%20luce.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/spaccaporta.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/sponsor%20finto.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/sponsor%20mancante.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/sponsor%20segreto.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/srl.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/tecno%20sfiga.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/tecnodomus.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/tiratardi.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Sponsor/trasporti%20lagana.png?raw=true'
    ],

    // Lista URL media partner
    media: [
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/90+.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/Calcio%20Totale.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/Diretta%20stadio%20net.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/Il%20Pallone%20Di%20Quartiere.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/PANCHINA%20APERTA.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/Tele%20Sport%20Dragoncello.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/Tutto%20Calcio%20Oggi.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/assist%20lab.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/calcio%2024.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/calcio%20academy.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/calcio%20chronicle.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/calcio%20cuore.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/calcio%20digitale.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/calcio%20street.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/calcio%20underground.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/corner%20club.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/curva%20podcast.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/fuoriarea.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/fuorigioco.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/goalstream.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/gol%20d%27archivio.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/il%20mister%20del%20divano.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/kickoff%20magazine.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/la%20bordata.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/lavagna%20del%20mister.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/matchzone.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/meta%20gol.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/piede%20educato.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/pressing%20point.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/radio%20croccante.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/radio%20curva%20nord.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/radio%20fuorigioco.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/replay%20channel.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/spoglatoio%20live.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/stat%20e%20skill.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/tifo%20urbano.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/undici%20e%20mezzo.png?raw=true',
        'https://github.com/carciofiatomici-bot/immaginiserie/blob/main/Media/zona%20var.png?raw=true'
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
