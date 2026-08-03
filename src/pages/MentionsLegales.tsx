import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function MentionsLegales() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-foreground text-background py-6">
                <div className="container mx-auto px-4">
                    <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Retour à l'accueil
                    </Link>
                    <h1 className="font-display text-3xl sm:text-4xl font-bold">Mentions Légales</h1>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="prose prose-neutral max-w-none space-y-8">

                    {/* Éditeur du site */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            🏪 Éditeur du site
                        </h2>
                        <div className="space-y-2 text-muted-foreground">
                            <p><strong className="text-foreground">Exploitant :</strong> BEGUIR Adel</p>
                            <p><strong className="text-foreground">Nom commercial :</strong> Twin Pizza</p>
                            <p><strong className="text-foreground">Forme juridique :</strong> Entreprise individuelle</p>
                            <p><strong className="text-foreground">Adresse :</strong> 60 Rue Georges Clemenceau, 76530 Grand-Couronne, France</p>
                            <p><strong className="text-foreground">Téléphone :</strong> <a href="tel:0232112613" className="text-primary hover:underline">02 32 11 26 13</a></p>
                            <p><strong className="text-foreground">Email :</strong> <a href="mailto:contact@twinpizza.fr" className="text-primary hover:underline">contact@twinpizza.fr</a></p>
                            <p><strong className="text-foreground">SIRET :</strong> 942 617 358 00018</p>
                            <p><strong className="text-foreground">N° TVA Intracommunautaire :</strong> FR28942617358</p>
                        </div>
                    </section>

                    {/* Directeur de la publication */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            👤 Directeur de la publication
                        </h2>
                        <div className="space-y-2 text-muted-foreground">
                            <p><strong className="text-foreground">Nom :</strong> Adel Beguir</p>
                            <p><strong className="text-foreground">Qualité :</strong> Gérant</p>
                        </div>
                    </section>

                    {/* Hébergement */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            🌐 Hébergement
                        </h2>
                        <div className="space-y-2 text-muted-foreground">
                            <p><strong className="text-foreground">Hébergeur :</strong> Vercel Inc.</p>
                            <p><strong className="text-foreground">Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
                            <p><strong className="text-foreground">Site web :</strong> <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">vercel.com</a></p>
                        </div>
                    </section>

                    {/* Propriété intellectuelle */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            ©️ Propriété intellectuelle
                        </h2>
                        <p className="text-muted-foreground">
                            L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur
                            et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour
                            les documents téléchargeables et les représentations iconographiques et photographiques.
                        </p>
                        <p className="text-muted-foreground mt-3">
                            La reproduction de tout ou partie de ce site sur un support électronique quel qu'il soit est
                            formellement interdite sauf autorisation expresse du directeur de la publication.
                        </p>
                    </section>

                    {/* Données personnelles */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            🔒 Protection des données personnelles
                        </h2>
                        <p className="text-muted-foreground">
                            Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi
                            Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression
                            et d'opposition aux données vous concernant.
                        </p>
                        <p className="text-muted-foreground mt-3">
                            Pour plus d'informations, consultez notre{' '}
                            <Link to="/confidentialite" className="text-primary hover:underline">
                                Politique de Confidentialité
                            </Link>.
                        </p>
                    </section>

                    {/* Cookies */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            🍪 Cookies
                        </h2>
                        <p className="text-muted-foreground">
                            Ce site utilise des cookies pour améliorer votre expérience de navigation. Lors de votre
                            première visite, un bandeau vous informe de l'utilisation des cookies et vous permet de
                            les accepter ou les refuser.
                        </p>
                    </section>

                </div>

                {/* Footer links */}
                <div className="mt-12 pt-8 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <Link to="/confidentialite" className="hover:text-primary">Politique de Confidentialité</Link>
                    <span>•</span>
                    <Link to="/cgv" className="hover:text-primary">Conditions Générales de Vente</Link>
                    <span>•</span>
                    <Link to="/" className="hover:text-primary">Accueil</Link>
                </div>
            </div>
        </div>
    );
}
