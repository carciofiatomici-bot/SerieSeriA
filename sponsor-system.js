//
// ====================================================================
// SPONSOR-SYSTEM.JS - Sistema Sponsor e Media per bonus CS
// ====================================================================
//

window.SponsorSystem = {

    // Cache degli sponsor e media disponibili
    sponsors: [],
    media: [],

    // Immagini disponibili nelle cartelle
    sponsorImages: [
        'apracadabra.png',
        'assicurazioni fortuna.png',
        'auto spinta.png',
        'bar sportivo.png',
        'birra del borgo.png',
        'birra grossa.png',
        'birra terzo tempo.png',
        'birrificio del pareggio.png',
        'MONDO SErrande.png'
    ],

    mediaImages: [
        '90+.png',
        'assist lab.png',
        'calcio 24.png',
        'calcio academy.png',
        'calcio chronicle.png',
        'calcio cuore.png',
        'calcio digitale.png',
        'calcio street.png',
        'Calcio Totale.png',
        'calcio underground.png',
        'corner club.png',
        'curva podcast.png',
        'Diretta stadio net.png',
        'Il Pallone Di Quartiere.png',
        'PANCHINA APERTA.png',
        'Tele Sport Dragoncello.png',
        'Tutto Calcio Oggi.png'
    ],

    // Default sponsor config - ordinati per costo crescente (0-1500 CS)
    // Formula: V + 5*G + 5*A + CS = Tot 5-0
    defaultSponsors: [
        {
            id: 'birrificio_pareggio',
            name: 'Birrificio del Pareggio',
            image: 'birrificio del pareggio.png',
            description: 'Anche il pareggio merita una birra',
            cost: 0,
            expBonus: 0,
            formula: { perWin: 10, perGoal: 4, perDraw: 8, perAssist: 4, cleanSheet: 10 }
            // Tot 5-0: 10 + 5*4 + 5*4 + 10 = 80 CS
        },
        {
            id: 'bar_sportivo',
            name: 'Bar Sportivo',
            image: 'bar sportivo.png',
            description: 'Dove si festeggia ogni vittoria',
            cost: 500,
            expBonus: 0.01,
            formula: { perWin: 15, perGoal: 5, perDraw: 5, perAssist: 5, cleanSheet: 15 }
            // Tot 5-0: 15 + 5*5 + 5*5 + 15 = 90 CS
        },
        {
            id: 'mondo_serrande',
            name: 'Mondo Serrande',
            image: 'MONDO SErrande.png',
            description: 'Chiudiamo la porta agli avversari',
            cost: 650,
            expBonus: 0.02,
            formula: { perWin: 18, perGoal: 6, perDraw: 6, perAssist: 6, cleanSheet: 18 }
            // Tot 5-0: 18 + 5*6 + 5*6 + 18 = 100 CS
        },
        {
            id: 'auto_spinta',
            name: 'Auto Spinta',
            image: 'auto spinta.png',
            description: 'Spingiamo la tua squadra al successo',
            cost: 800,
            expBonus: 0.03,
            formula: { perWin: 20, perGoal: 7, perDraw: 6, perAssist: 7, cleanSheet: 20 }
            // Tot 5-0: 20 + 5*7 + 5*7 + 20 = 110 CS
        },
        {
            id: 'birra_terzo_tempo',
            name: 'Birra Terzo Tempo',
            image: 'birra terzo tempo.png',
            description: 'Il terzo tempo inizia qui',
            cost: 950,
            expBonus: 0.04,
            formula: { perWin: 22, perGoal: 7, perDraw: 8, perAssist: 7, cleanSheet: 22 }
            // Tot 5-0: 22 + 5*7 + 5*7 + 22 = 115 CS
        },
        {
            id: 'birra_del_borgo',
            name: 'Birra del Borgo',
            image: 'birra del borgo.png',
            description: 'La birra dei campioni locali',
            cost: 1100,
            expBonus: 0.05,
            formula: { perWin: 24, perGoal: 8, perDraw: 6, perAssist: 8, cleanSheet: 24 }
            // Tot 5-0: 24 + 5*8 + 5*8 + 24 = 120 CS
        },
        {
            id: 'apracadabra',
            name: 'Apracadabra',
            image: 'apracadabra.png',
            description: 'Magia nei risultati!',
            cost: 1250,
            expBonus: 0.06,
            formula: { perWin: 28, perGoal: 8, perDraw: 8, perAssist: 8, cleanSheet: 26 }
            // Tot 5-0: 28 + 5*8 + 5*8 + 26 = 130 CS
        },
        {
            id: 'birra_grossa',
            name: 'Birra Grossa',
            image: 'birra grossa.png',
            description: 'Grande birra, grandi risultati',
            cost: 1400,
            expBonus: 0.07,
            formula: { perWin: 32, perGoal: 9, perDraw: 6, perAssist: 9, cleanSheet: 28 }
            // Tot 5-0: 32 + 5*9 + 5*9 + 28 = 140 CS
        },
        {
            id: 'assicurazioni_fortuna',
            name: 'Assicurazioni Fortuna',
            image: 'assicurazioni fortuna.png',
            description: 'La fortuna protegge i vincitori',
            cost: 1500,
            expBonus: 0.075,
            formula: { perWin: 35, perGoal: 10, perDraw: 10, perAssist: 9, cleanSheet: 30 }
            // Tot 5-0: 35 + 5*10 + 5*9 + 30 = 150 CS
        }
    ],

    // Default media config - ordinati per costo crescente (0-1500 CS)
    // Formula: V + 5*G + 5*A + CS = Tot 5-0
    defaultMedia: [
        {
            id: 'pallone_quartiere',
            name: 'Il Pallone Di Quartiere',
            image: 'Il Pallone Di Quartiere.png',
            description: 'Il calcio di quartiere',
            cost: 0,
            expBonus: 0,
            formula: { perWin: 10, perGoal: 4, perDraw: 8, perAssist: 4, cleanSheet: 10 }
            // Tot 5-0: 10 + 5*4 + 5*4 + 10 = 80 CS
        },
        {
            id: 'corner_club',
            name: 'Corner Club',
            image: 'corner club.png',
            description: 'Ogni angolo conta',
            cost: 500,
            expBonus: 0.0075,
            formula: { perWin: 12, perGoal: 5, perDraw: 6, perAssist: 4, cleanSheet: 13 }
            // Tot 5-0: 12 + 5*5 + 5*4 + 13 = 85 CS
        },
        {
            id: 'panchina_aperta',
            name: 'Panchina Aperta',
            image: 'PANCHINA APERTA.png',
            description: 'Dalla panchina al campo',
            cost: 600,
            expBonus: 0.015,
            formula: { perWin: 15, perGoal: 5, perDraw: 7, perAssist: 5, cleanSheet: 15 }
            // Tot 5-0: 15 + 5*5 + 5*5 + 15 = 90 CS
        },
        {
            id: '90plus',
            name: '90+',
            image: '90+.png',
            description: 'Emozioni fino all\'ultimo minuto',
            cost: 700,
            expBonus: 0.02,
            formula: { perWin: 17, perGoal: 6, perDraw: 6, perAssist: 5, cleanSheet: 17 }
            // Tot 5-0: 17 + 5*6 + 5*5 + 17 = 95 CS
        },
        {
            id: 'calcio_cuore',
            name: 'Calcio Cuore',
            image: 'calcio cuore.png',
            description: 'Il calcio con il cuore',
            cost: 800,
            expBonus: 0.025,
            formula: { perWin: 18, perGoal: 6, perDraw: 8, perAssist: 6, cleanSheet: 18 }
            // Tot 5-0: 18 + 5*6 + 5*6 + 18 = 100 CS
        },
        {
            id: 'calcio_24',
            name: 'Calcio 24',
            image: 'calcio 24.png',
            description: 'Calcio 24 ore su 24',
            cost: 900,
            expBonus: 0.035,
            formula: { perWin: 20, perGoal: 7, perDraw: 6, perAssist: 6, cleanSheet: 20 }
            // Tot 5-0: 20 + 5*7 + 5*6 + 20 = 105 CS
        },
        {
            id: 'tele_sport',
            name: 'Tele Sport Dragoncello',
            image: 'Tele Sport Dragoncello.png',
            description: 'La TV dello sport locale',
            cost: 1000,
            expBonus: 0.045,
            formula: { perWin: 22, perGoal: 7, perDraw: 7, perAssist: 7, cleanSheet: 22 }
            // Tot 5-0: 22 + 5*7 + 5*7 + 22 = 110 CS
        },
        {
            id: 'curva_podcast',
            name: 'Curva Podcast',
            image: 'curva podcast.png',
            description: 'Le voci dalla curva',
            cost: 1100,
            expBonus: 0.05,
            formula: { perWin: 24, perGoal: 7, perDraw: 8, perAssist: 8, cleanSheet: 22 }
            // Tot 5-0: 24 + 5*7 + 5*8 + 22 = 115 CS
        },
        {
            id: 'diretta_stadio',
            name: 'Diretta Stadio Net',
            image: 'Diretta stadio net.png',
            description: 'In diretta dallo stadio',
            cost: 1200,
            expBonus: 0.055,
            formula: { perWin: 26, perGoal: 8, perDraw: 6, perAssist: 8, cleanSheet: 24 }
            // Tot 5-0: 26 + 5*8 + 5*8 + 24 = 120 CS
        },
        {
            id: 'tutto_calcio',
            name: 'Tutto Calcio Oggi',
            image: 'Tutto Calcio Oggi.png',
            description: 'Tutto il calcio in un giorno',
            cost: 1300,
            expBonus: 0.06,
            formula: { perWin: 28, perGoal: 8, perDraw: 8, perAssist: 9, cleanSheet: 26 }
            // Tot 5-0: 28 + 5*8 + 5*9 + 26 = 130 CS
        },
        {
            id: 'calcio_totale',
            name: 'Calcio Totale',
            image: 'Calcio Totale.png',
            description: 'Copertura totale del calcio',
            cost: 1400,
            expBonus: 0.07,
            formula: { perWin: 32, perGoal: 9, perDraw: 6, perAssist: 9, cleanSheet: 28 }
            // Tot 5-0: 32 + 5*9 + 5*9 + 28 = 140 CS
        },
        {
            id: 'assist_lab',
            name: 'Assist Lab',
            image: 'assist lab.png',
            description: 'L\'arte dell\'assist',
            cost: 1500,
            expBonus: 0.075,
            formula: { perWin: 35, perGoal: 10, perDraw: 10, perAssist: 9, cleanSheet: 30 }
            // Tot 5-0: 35 + 5*10 + 5*9 + 30 = 150 CS
        }
    ],

    // Costo penale per cambio
    penaltyCost: 50,

    /**
     * Inizializza il sistema
     */
    async init() {
        try {
            await this.loadConfig();
            console.log('SponsorSystem inizializzato con', this.sponsors.length, 'sponsor e', this.media.length, 'media');
        } catch (error) {
            console.warn('Errore caricamento config, uso default:', error);
            this.sponsors = this.defaultSponsors;
            this.media = this.defaultMedia;
        }
    },

    /**
     * Carica la configurazione da Firestore
     */
    async loadConfig() {
        const { doc, getDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        // Carica sponsor
        const sponsorPath = `artifacts/${appId}/public/data/config/sponsors`;
        const sponsorDoc = await getDoc(doc(db, sponsorPath));
        if (sponsorDoc.exists() && sponsorDoc.data().sponsors) {
            this.sponsors = sponsorDoc.data().sponsors;
            this.penaltyCost = sponsorDoc.data().penaltyCost || 50;
        } else {
            this.sponsors = this.defaultSponsors;
        }

        // Carica media
        const mediaPath = `artifacts/${appId}/public/data/config/media`;
        const mediaDoc = await getDoc(doc(db, mediaPath));
        if (mediaDoc.exists() && mediaDoc.data().media) {
            this.media = mediaDoc.data().media;
        } else {
            this.media = this.defaultMedia;
        }
    },

    // ==================== SPONSOR ====================

    /**
     * Ottieni sponsor per ID
     */
    getSponsorById(sponsorId) {
        return this.sponsors.find(s => s.id === sponsorId) || null;
    },

    /**
     * Ottieni lo sponsor attivo di una squadra
     */
    async getTeamSponsor(teamId) {
        const { doc, getDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
        const teamDoc = await getDoc(doc(db, teamPath));

        if (teamDoc.exists()) {
            return teamDoc.data().sponsor || null;
        }
        return null;
    },

    /**
     * Firma un contratto sponsor
     */
    async signSponsorContract(teamId, sponsorId) {
        const { doc, getDoc, updateDoc, Timestamp } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const sponsor = this.getSponsorById(sponsorId);
        if (!sponsor) throw new Error('Sponsor non trovato');

        const existingSponsor = await this.getTeamSponsor(teamId);
        if (existingSponsor) {
            throw new Error('Hai gia uno sponsor attivo. Usa "Cambia" per cambiare.');
        }

        const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
        const cost = sponsor.cost || 0;

        // Verifica crediti se costo > 0
        if (cost > 0) {
            const teamDoc = await getDoc(doc(db, teamPath));
            if (!teamDoc.exists()) throw new Error('Squadra non trovata');
            const teamData = teamDoc.data();
            const currentCredits = teamData.credits || 0;

            if (currentCredits < cost) {
                throw new Error(`Crediti insufficienti! Servono ${cost} CS.`);
            }

            // Detrai costo e salva contratto
            const sponsorData = {
                id: sponsor.id,
                name: sponsor.name,
                image: sponsor.image,
                cost: cost,
                expBonus: sponsor.expBonus || 0,
                formula: sponsor.formula,
                signedAt: Timestamp.now(),
                totalEarned: 0
            };

            await updateDoc(doc(db, teamPath), {
                sponsor: sponsorData,
                credits: currentCredits - cost
            });

            this.showToast(`Contratto firmato con ${sponsor.name}! (-${cost} CS)`, 'success');
            return sponsorData;
        } else {
            // Sponsor gratuito
            const sponsorData = {
                id: sponsor.id,
                name: sponsor.name,
                image: sponsor.image,
                cost: 0,
                expBonus: sponsor.expBonus || 0,
                formula: sponsor.formula,
                signedAt: Timestamp.now(),
                totalEarned: 0
            };

            await updateDoc(doc(db, teamPath), { sponsor: sponsorData });
            this.showToast(`Contratto firmato con ${sponsor.name}!`, 'success');
            return sponsorData;
        }
    },

    /**
     * Cambia sponsor (con penale + costo nuovo sponsor)
     */
    async changeSponsor(teamId, newSponsorId) {
        const { doc, getDoc, updateDoc, Timestamp } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const newSponsor = this.getSponsorById(newSponsorId);
        if (!newSponsor) throw new Error('Sponsor non trovato');

        const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
        const teamDoc = await getDoc(doc(db, teamPath));
        if (!teamDoc.exists()) throw new Error('Squadra non trovata');

        const teamData = teamDoc.data();
        const currentCredits = teamData.credits || 0;
        const sponsorCost = newSponsor.cost || 0;
        const totalCost = this.penaltyCost + sponsorCost;

        if (currentCredits < totalCost) {
            throw new Error(`Crediti insufficienti! Servono ${totalCost} CS (penale ${this.penaltyCost} + costo ${sponsorCost}).`);
        }

        const sponsorData = {
            id: newSponsor.id,
            name: newSponsor.name,
            image: newSponsor.image,
            cost: sponsorCost,
            expBonus: newSponsor.expBonus || 0,
            formula: newSponsor.formula,
            signedAt: Timestamp.now(),
            totalEarned: 0
        };

        await updateDoc(doc(db, teamPath), {
            sponsor: sponsorData,
            credits: currentCredits - totalCost
        });

        this.showToast(`Sponsor cambiato! (-${totalCost} CS)`, 'warning');
        return sponsorData;
    },

    /**
     * Annulla contratto sponsor
     */
    async cancelSponsor(teamId) {
        const { doc, updateDoc, deleteField } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
        await updateDoc(doc(db, teamPath), { sponsor: deleteField() });
        this.showToast('Contratto sponsor annullato', 'info');
    },

    // ==================== MEDIA ====================

    /**
     * Ottieni media per ID
     */
    getMediaById(mediaId) {
        return this.media.find(m => m.id === mediaId) || null;
    },

    /**
     * Ottieni il media attivo di una squadra
     */
    async getTeamMedia(teamId) {
        const { doc, getDoc } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
        const teamDoc = await getDoc(doc(db, teamPath));

        if (teamDoc.exists()) {
            return teamDoc.data().media || null;
        }
        return null;
    },

    /**
     * Firma un contratto media
     */
    async signMediaContract(teamId, mediaId) {
        const { doc, getDoc, updateDoc, Timestamp } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const media = this.getMediaById(mediaId);
        if (!media) throw new Error('Media non trovato');

        const existingMedia = await this.getTeamMedia(teamId);
        if (existingMedia) {
            throw new Error('Hai gia un media partner attivo. Usa "Cambia" per cambiare.');
        }

        const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
        const cost = media.cost || 0;

        // Verifica crediti se costo > 0
        if (cost > 0) {
            const teamDoc = await getDoc(doc(db, teamPath));
            if (!teamDoc.exists()) throw new Error('Squadra non trovata');
            const teamData = teamDoc.data();
            const currentCredits = teamData.credits || 0;

            if (currentCredits < cost) {
                throw new Error(`Crediti insufficienti! Servono ${cost} CS.`);
            }

            // Detrai costo e salva contratto
            const mediaData = {
                id: media.id,
                name: media.name,
                image: media.image,
                cost: cost,
                expBonus: media.expBonus || 0,
                formula: media.formula,
                signedAt: Timestamp.now(),
                totalEarned: 0
            };

            await updateDoc(doc(db, teamPath), {
                media: mediaData,
                credits: currentCredits - cost
            });

            this.showToast(`Contratto firmato con ${media.name}! (-${cost} CS)`, 'success');
            return mediaData;
        } else {
            // Media gratuito
            const mediaData = {
                id: media.id,
                name: media.name,
                image: media.image,
                cost: 0,
                expBonus: media.expBonus || 0,
                formula: media.formula,
                signedAt: Timestamp.now(),
                totalEarned: 0
            };

            await updateDoc(doc(db, teamPath), { media: mediaData });
            this.showToast(`Contratto firmato con ${media.name}!`, 'success');
            return mediaData;
        }
    },

    /**
     * Cambia media (con penale + costo nuovo media)
     */
    async changeMedia(teamId, newMediaId) {
        const { doc, getDoc, updateDoc, Timestamp } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const newMedia = this.getMediaById(newMediaId);
        if (!newMedia) throw new Error('Media non trovato');

        const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
        const teamDoc = await getDoc(doc(db, teamPath));
        if (!teamDoc.exists()) throw new Error('Squadra non trovata');

        const teamData = teamDoc.data();
        const currentCredits = teamData.credits || 0;
        const mediaCost = newMedia.cost || 0;
        const totalCost = this.penaltyCost + mediaCost;

        if (currentCredits < totalCost) {
            throw new Error(`Crediti insufficienti! Servono ${totalCost} CS (penale ${this.penaltyCost} + costo ${mediaCost}).`);
        }

        const mediaData = {
            id: newMedia.id,
            name: newMedia.name,
            image: newMedia.image,
            cost: mediaCost,
            expBonus: newMedia.expBonus || 0,
            formula: newMedia.formula,
            signedAt: Timestamp.now(),
            totalEarned: 0
        };

        await updateDoc(doc(db, teamPath), {
            media: mediaData,
            credits: currentCredits - totalCost
        });

        this.showToast(`Media partner cambiato! (-${totalCost} CS)`, 'warning');
        return mediaData;
    },

    /**
     * Annulla contratto media
     */
    async cancelMedia(teamId) {
        const { doc, updateDoc, deleteField } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
        await updateDoc(doc(db, teamPath), { media: deleteField() });
        this.showToast('Contratto media annullato', 'info');
    },

    // ==================== CALCOLO BONUS ====================

    /**
     * Calcola il bonus totale (sponsor + media)
     */
    calculateBonus(sponsor, media, matchResult) {
        let total = 0;
        let breakdown = { sponsor: 0, media: 0 };

        // Calcola bonus sponsor
        if (sponsor && sponsor.formula) {
            const formula = sponsor.formula;
            if (matchResult.won && formula.perWin) {
                breakdown.sponsor += formula.perWin;
            }
            if (matchResult.drew && formula.perDraw) {
                breakdown.sponsor += formula.perDraw;
            }
            if (matchResult.goalsScored > 0 && formula.perGoal) {
                breakdown.sponsor += matchResult.goalsScored * formula.perGoal;
            }
            if (matchResult.cleanSheet && formula.cleanSheet) {
                breakdown.sponsor += formula.cleanSheet;
            }
        }

        // Calcola bonus media
        if (media && media.formula) {
            const formula = media.formula;
            if (matchResult.won && formula.perWin) {
                breakdown.media += formula.perWin;
            }
            if (matchResult.drew && formula.perDraw) {
                breakdown.media += formula.perDraw;
            }
            if (matchResult.goalsScored > 0 && formula.perGoal) {
                breakdown.media += matchResult.goalsScored * formula.perGoal;
            }
            if (matchResult.assists > 0 && formula.perAssist) {
                breakdown.media += matchResult.assists * formula.perAssist;
            }
        }

        total = breakdown.sponsor + breakdown.media;
        return { total, breakdown };
    },

    /**
     * Processa bonus per una squadra dopo una partita
     */
    async processSingleMatchBonus(teamId, matchResult, standings) {
        if (!window.FeatureFlags?.isEnabled('sponsors')) return null;

        const { doc, getDoc, updateDoc, Timestamp } = window.firestoreTools;
        const db = window.db;
        const appId = window.firestoreTools.appId;

        const teamPath = `artifacts/${appId}/public/data/teams/${teamId}`;
        const teamDoc = await getDoc(doc(db, teamPath));

        if (!teamDoc.exists()) return null;

        const teamData = teamDoc.data();
        const teamSponsor = teamData.sponsor;
        const teamMedia = teamData.media;

        if (!teamSponsor && !teamMedia) return null;

        // Ottieni formule complete
        const sponsor = teamSponsor ? this.getSponsorById(teamSponsor.id) : null;
        const media = teamMedia ? this.getMediaById(teamMedia.id) : null;

        const { total, breakdown } = this.calculateBonus(sponsor, media, matchResult);

        if (total > 0) {
            const currentCredits = teamData.credits || 0;
            const updates = {
                credits: currentCredits + total
            };

            if (teamSponsor) {
                updates['sponsor.totalEarned'] = (teamSponsor.totalEarned || 0) + breakdown.sponsor;
            }
            if (teamMedia) {
                updates['media.totalEarned'] = (teamMedia.totalEarned || 0) + breakdown.media;
            }

            await updateDoc(doc(db, teamPath), updates);
            return { total, breakdown };
        }

        return null;
    },

    // ==================== UI ====================

    /**
     * Apri pannello sponsor
     */
    async openSponsorPanel(teamId) {
        if (!window.FeatureFlags?.isEnabled('sponsors')) {
            this.showToast('Sistema sponsor non attivo', 'error');
            return;
        }

        if (this.sponsors.length === 0) await this.init();

        const currentSponsor = await this.getTeamSponsor(teamId);
        this.renderSponsorshipModal('sponsor', currentSponsor, teamId);
    },

    /**
     * Apri pannello media
     */
    async openMediaPanel(teamId) {
        if (!window.FeatureFlags?.isEnabled('sponsors')) {
            this.showToast('Sistema media non attivo', 'error');
            return;
        }

        if (this.media.length === 0) await this.init();

        const currentMedia = await this.getTeamMedia(teamId);
        this.renderSponsorshipModal('media', currentMedia, teamId);
    },

    /**
     * Render modal per sponsor o media
     */
    renderSponsorshipModal(type, current, teamId) {
        const isMedia = type === 'media';
        const items = isMedia ? this.media : this.sponsors;
        const imagePath = isMedia ? 'Immagini/Media' : 'Immagini/Sponsor';
        const color = isMedia ? 'pink' : 'yellow';
        const title = isMedia ? 'Media Partner' : 'Sponsor';
        const icon = isMedia ? '📺' : '🤝';

        // Rimuovi modal esistente
        const existingModal = document.getElementById('sponsorship-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'sponsorship-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4';

        if (current) {
            // Vista contratto attivo
            const currentItem = isMedia ? this.getMediaById(current.id) : this.getSponsorById(current.id);
            const expBonusPct = ((current.expBonus || currentItem?.expBonus || 0) * 100).toFixed(1);
            const contractCost = current.cost || currentItem?.cost || 0;
            modal.innerHTML = `
                <div class="bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-${color}-500">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-xl font-bold text-${color}-400">${icon} Il tuo ${title}</h2>
                            <button id="close-sponsorship-modal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>

                        <div class="text-center mb-6">
                            <div class="w-32 h-32 mx-auto bg-gray-800 rounded-xl overflow-hidden mb-4 border-2 border-${color}-500">
                                <img src="${imagePath}/${current.image}" alt="${current.name}"
                                     class="w-full h-full object-contain p-2"
                                     onerror="this.src='Immagini/placeholder.jpg'">
                            </div>
                            <h3 class="text-xl font-bold text-${color}-300">${current.name}</h3>
                            <p class="text-gray-400 text-sm">${currentItem?.description || ''}</p>
                            ${expBonusPct > 0 ? `<p class="text-emerald-400 text-sm mt-2 font-semibold">+${expBonusPct}% Bonus EXP</p>` : ''}
                        </div>

                        <div class="bg-gray-800 rounded-lg p-4 mb-4 text-center">
                            <p class="text-gray-400 text-sm">Guadagni Totali</p>
                            <p class="text-2xl font-bold text-green-400">${current.totalEarned || 0} CS</p>
                        </div>

                        <div class="bg-gray-800 rounded-lg p-4 mb-4">
                            <p class="text-gray-400 text-sm mb-2">Bonus per partita:</p>
                            <div class="grid grid-cols-3 gap-2 text-center text-xs">
                                <div class="bg-gray-700 rounded p-2">
                                    <p class="text-green-400 font-bold">${currentItem?.formula?.perWin || 0}</p>
                                    <p class="text-gray-500">Vittoria</p>
                                </div>
                                <div class="bg-gray-700 rounded p-2">
                                    <p class="text-blue-400 font-bold">${currentItem?.formula?.perGoal || 0}</p>
                                    <p class="text-gray-500">per Gol</p>
                                </div>
                                <div class="bg-gray-700 rounded p-2">
                                    <p class="text-gray-400 font-bold">${currentItem?.formula?.perDraw || 0}</p>
                                    <p class="text-gray-500">Pareggio</p>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-3">
                            <button id="btn-change-sponsorship" class="flex-1 py-3 px-4 bg-${color}-600 hover:bg-${color}-500 rounded-lg font-semibold transition">
                                Cambia (-${this.penaltyCost} CS + costo)
                            </button>
                            <button id="btn-cancel-sponsorship" class="py-3 px-4 bg-red-600 hover:bg-red-500 rounded-lg font-semibold transition">
                                Annulla
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Vista selezione - calcola stima CS per 5-0
            const itemsHtml = items.map(item => {
                const cost = item.cost || 0;
                const expBonusPct = ((item.expBonus || 0) * 100).toFixed(1);
                // Stima CS per vittoria 5-0: V + 5*G + 5*A + CS
                const estimated50 = (item.formula?.perWin || 0) +
                                    5 * (item.formula?.perGoal || 0) +
                                    5 * (item.formula?.perAssist || 0) +
                                    (item.formula?.cleanSheet || 0);
                const costLabel = cost === 0 ? '<span class="text-green-400 font-bold">GRATIS</span>' : `<span class="text-yellow-400 font-bold">${cost} CS</span>`;
                const expLabel = item.expBonus > 0 ? `<span class="text-emerald-400">+${expBonusPct}% EXP</span>` : '';

                return `
                <div class="bg-gray-800 rounded-lg p-3 border-2 border-gray-700 hover:border-${color}-500 transition cursor-pointer item-card"
                     data-item-id="${item.id}">
                    <div class="flex gap-3">
                        <div class="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                            <img src="${imagePath}/${item.image}" alt="${item.name}"
                                 class="w-full h-full object-contain p-1"
                                 onerror="this.src='Immagini/placeholder.jpg'">
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between">
                                <h4 class="font-bold text-white text-sm truncate">${item.name}</h4>
                                ${costLabel}
                            </div>
                            <p class="text-gray-400 text-xs truncate">${item.description}</p>
                            <div class="flex items-center justify-between mt-1">
                                <div class="flex gap-2 text-[10px]">
                                    <span class="text-green-400">V: ${item.formula?.perWin || 0}</span>
                                    <span class="text-blue-400">G: ${item.formula?.perGoal || 0}</span>
                                    <span class="text-purple-400">~${estimated50} CS</span>
                                </div>
                                ${expLabel ? `<div class="text-[10px]">${expLabel}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `}).join('');

            modal.innerHTML = `
                <div class="bg-gray-900 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border-2 border-${color}-500">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-xl font-bold text-${color}-400">${icon} Scegli ${title}</h2>
                            <button id="close-sponsorship-modal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <p class="text-gray-400 text-sm mb-4">Seleziona un ${type === 'media' ? 'media partner' : 'sponsor'} per ricevere bonus CS dopo ogni partita</p>
                        <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            ${itemsHtml}
                        </div>
                    </div>
                </div>
            `;
        }

        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('close-sponsorship-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        // Selezione nuovo item
        modal.querySelectorAll('.item-card').forEach(card => {
            card.addEventListener('click', async () => {
                const itemId = card.dataset.itemId;
                try {
                    if (isMedia) {
                        await this.signMediaContract(teamId, itemId);
                    } else {
                        await this.signSponsorContract(teamId, itemId);
                    }
                    modal.remove();
                    // Aggiorna status nella dashboard
                    if (window.DashboardFeatures) {
                        window.DashboardFeatures.updateSponsorshipStatus();
                    }
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            });
        });

        // Cambio contratto
        const btnChange = modal.querySelector('#btn-change-sponsorship');
        if (btnChange) {
            btnChange.addEventListener('click', () => {
                modal.remove();
                this.renderChangeModal(type, teamId);
            });
        }

        // Annulla contratto
        const btnCancel = modal.querySelector('#btn-cancel-sponsorship');
        if (btnCancel) {
            btnCancel.addEventListener('click', async () => {
                if (confirm(`Sei sicuro di voler annullare il contratto ${title}?`)) {
                    try {
                        if (isMedia) {
                            await this.cancelMedia(teamId);
                        } else {
                            await this.cancelSponsor(teamId);
                        }
                        modal.remove();
                        if (window.DashboardFeatures) {
                            window.DashboardFeatures.updateSponsorshipStatus();
                        }
                    } catch (error) {
                        this.showToast(error.message, 'error');
                    }
                }
            });
        }
    },

    /**
     * Render modal per cambiare sponsor/media
     */
    renderChangeModal(type, teamId) {
        const isMedia = type === 'media';
        const items = isMedia ? this.media : this.sponsors;
        const imagePath = isMedia ? 'Immagini/Media' : 'Immagini/Sponsor';
        const color = isMedia ? 'pink' : 'yellow';
        const title = isMedia ? 'Media Partner' : 'Sponsor';

        const modal = document.createElement('div');
        modal.id = 'sponsorship-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4';

        const itemsHtml = items.map(item => {
            const cost = item.cost || 0;
            const totalCost = this.penaltyCost + cost;
            const expBonusPct = ((item.expBonus || 0) * 100).toFixed(1);
            const costLabel = cost === 0 ? `${this.penaltyCost}` : `${totalCost}`;

            return `
            <div class="bg-gray-800 rounded-lg p-2 flex items-center gap-2 cursor-pointer hover:bg-gray-700 transition change-item"
                 data-item-id="${item.id}">
                <div class="w-12 h-12 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                    <img src="${imagePath}/${item.image}" alt="${item.name}"
                         class="w-full h-full object-contain"
                         onerror="this.src='Immagini/placeholder.jpg'">
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-white text-sm truncate">${item.name}</h4>
                    <div class="flex gap-2 text-[10px]">
                        <span class="text-yellow-400">${costLabel} CS</span>
                        ${item.expBonus > 0 ? `<span class="text-emerald-400">+${expBonusPct}% EXP</span>` : ''}
                    </div>
                </div>
                <button class="px-3 py-1 bg-${color}-600 hover:bg-${color}-500 rounded text-xs font-bold">
                    Scegli
                </button>
            </div>
        `}).join('');

        modal.innerHTML = `
            <div class="bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-${color}-500">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold text-${color}-400">Cambia ${title}</h2>
                        <button id="close-sponsorship-modal" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <div class="bg-red-900/30 border border-red-500 rounded-lg p-3 mb-4">
                        <p class="text-red-300 text-sm text-center">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Penale cambio: ${this.penaltyCost} CS + costo nuovo contratto
                        </p>
                    </div>
                    <div class="space-y-2 max-h-[50vh] overflow-y-auto">
                        ${itemsHtml}
                    </div>
                    <button id="btn-back" class="w-full mt-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                        Torna Indietro
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('close-sponsorship-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        document.getElementById('btn-back').addEventListener('click', () => {
            modal.remove();
            if (isMedia) {
                this.openMediaPanel(teamId);
            } else {
                this.openSponsorPanel(teamId);
            }
        });

        modal.querySelectorAll('.change-item').forEach(item => {
            item.addEventListener('click', async () => {
                const itemId = item.dataset.itemId;
                try {
                    if (isMedia) {
                        await this.changeMedia(teamId, itemId);
                    } else {
                        await this.changeSponsor(teamId, itemId);
                    }
                    modal.remove();
                    if (window.DashboardFeatures) {
                        window.DashboardFeatures.updateSponsorshipStatus();
                    }
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            });
        });
    },

    /**
     * Mostra toast notification
     */
    showToast(message, type = 'info') {
        const colors = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            warning: 'bg-yellow-600',
            info: 'bg-blue-600'
        };

        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-[60]`;
        toast.innerHTML = message;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

// Auto-init quando Firestore e pronto
document.addEventListener('DOMContentLoaded', () => {
    const checkAndInit = () => {
        if (window.db && window.firestoreTools && window.FeatureFlags) {
            if (window.FeatureFlags.isEnabled('sponsors')) {
                window.SponsorSystem.init();
            }
            document.addEventListener('featureFlagChanged', (e) => {
                if (e.detail.flagId === 'sponsors' && e.detail.enabled) {
                    window.SponsorSystem.init();
                }
            });
        } else {
            setTimeout(checkAndInit, 300);
        }
    };
    setTimeout(checkAndInit, 800);
});

console.log("Modulo SponsorSystem caricato.");
