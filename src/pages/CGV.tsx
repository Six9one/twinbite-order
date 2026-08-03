import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function CGV() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-foreground text-background py-6">
                <div className="container mx-auto px-4">
                    <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Retour à l'accueil
                    </Link>
                    <h1 className="font-display text-3xl sm:text-4xl font-bold">Conditions Générales de Vente</h1>
                    <p className="text-background/70 mt-2">Dernière mise à jour : Février 2026</p>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="prose prose-neutral max-w-none space-y-8">

                    {/* Objet */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                            Article 1 - Objet
                        </h2>
                        <p className="text-muted-foreground">
                            Les présentes Conditions Générales de Vente (CGV) régissent les ventes de produits alimentaires
                            et boissons par Twin Pizza, entreprise située au 60 Rue Georges Clemenceau, 76530 Grand-Couronne.
                        </p>
                        <p className="text-muted-foreground mt-3">
                            Toute commande implique l'acceptation sans réserve de ces CGV.
                        </p>
                    </section>

                    {/* Produits et Prix */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                            Article 2 - Produits et Prix
                        </h2>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Les prix sont indiqués en euros TTC (TVA incluse)</li>
                            <li>Les photos sont non contractuelles</li>
                            <li>Nous nous réservons le droit de modifier nos prix à tout moment</li>
                            <li>Les prix applicables sont ceux en vigueur au moment de la commande</li>
                        </ul>
                    </section>

                    {/* Commande */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                            Article 3 - Commande
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Les commandes peuvent être passées :
                        </p>
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                <span className="text-2xl mb-2 block">🌐</span>
                                <strong className="text-foreground block">En ligne</strong>
                                <span className="text-sm text-muted-foreground">Via ce site web</span>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                <span className="text-2xl mb-2 block">📞</span>
                                <strong className="text-foreground block">Par téléphone</strong>
                                <span className="text-sm text-muted-foreground">02 32 11 26 13</span>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                <span className="text-2xl mb-2 block">🏪</span>
                                <strong className="text-foreground block">Sur place</strong>
                                <span className="text-sm text-muted-foreground">À notre comptoir</span>
                            </div>
                        </div>
                        <p className="text-muted-foreground mt-4">
                            La validation de la commande vaut acceptation des prix et descriptions des produits.
                        </p>
                    </section>

                    {/* Livraison */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                            Article 4 - Livraison
                        </h2>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>La livraison est effectuée dans les zones définies sur notre site</li>
                            <li>Les délais de livraison sont donnés à titre indicatif</li>
                            <li>Un minimum de commande peut s'appliquer selon les zones</li>
                            <li>Des frais de livraison peuvent s'appliquer selon la distance</li>
                        </ul>
                        <p className="text-muted-foreground mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            ⚠️ En cas de retard exceptionnel, nous vous contactons par téléphone.
                        </p>
                    </section>

                    {/* Paiement */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                            Article 5 - Paiement
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Modes de paiement acceptés :
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <span className="px-4 py-2 bg-muted rounded-full text-sm font-medium">💳 Carte bancaire</span>
                            <span className="px-4 py-2 bg-muted rounded-full text-sm font-medium">💵 Espèces</span>
                            <span className="px-4 py-2 bg-muted rounded-full text-sm font-medium">🎫 Tickets restaurant</span>
                        </div>
                        <p className="text-muted-foreground mt-4">
                            Le paiement s'effectue à la commande (en ligne) ou à la réception (livraison/sur place).
                        </p>
                        <p className="text-muted-foreground mt-3">
                            Les paiements par carte bancaire en ligne (Visa, Mastercard, Apple Pay, Google Pay) sont
                            traités par <strong className="text-foreground">myPOS</strong>, prestataire de services de
                            paiement agréé. Vous êtes redirigé vers sa page de paiement sécurisée : aucune donnée de
                            carte bancaire ne transite ni n'est conservée par Twin Pizza. Les transactions sont
                            protégées par le protocole 3D Secure.
                        </p>
                    </section>

                    {/* Droit de rétractation */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                            Article 6 - Droit de rétractation
                        </h2>
                        <p className="text-muted-foreground">
                            Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation
                            de 14 jours ne s'applique pas aux denrées alimentaires périssables.
                        </p>
                        <p className="text-muted-foreground mt-3">
                            Cette exclusion légale ne prive pas le client de ses droits en matière d'annulation et de
                            remboursement, qui sont détaillés à l'<strong className="text-foreground">Article 7</strong> ci-dessous.
                        </p>
                    </section>

                    {/* Annulation et remboursement */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                            Article 7 - Annulation, retour et remboursement
                        </h2>
                        <div className="text-muted-foreground space-y-3">
                            <p>
                                <strong className="text-foreground">Annulation par le client :</strong> une commande
                                peut être annulée sans frais tant que sa préparation n'a pas commencé. Contactez-nous
                                immédiatement au <a href="tel:0232112613" className="text-primary hover:underline">02 32 11 26 13</a>.
                                Passé ce délai, la préparation étant engagée, l'annulation n'est plus possible.
                            </p>
                            <p>
                                <strong className="text-foreground">Annulation par le restaurant :</strong> si nous ne
                                pouvons pas honorer votre commande (produit indisponible, incident technique, zone de
                                livraison non desservie), elle est annulée et intégralement remboursée.
                            </p>
                            <p>
                                <strong className="text-foreground">Retour et remboursement :</strong> s'agissant de
                                denrées alimentaires périssables, les produits ne peuvent pas être retournés. En cas de
                                commande non conforme, incomplète, ou de problème de qualité, signalez-le dans les
                                <strong className="text-foreground"> 2 heures</strong> suivant la réception. Après
                                vérification, nous procédons au remplacement du produit ou au remboursement.
                            </p>
                            <p>
                                <strong className="text-foreground">Modalités de remboursement :</strong> le
                                remboursement est effectué sur le moyen de paiement utilisé lors de la commande. Pour un
                                paiement par carte bancaire en ligne, les fonds sont recrédités sous
                                <strong className="text-foreground"> 5 à 10 jours ouvrés</strong> selon votre banque.
                                Aucun frais n'est retenu.
                            </p>
                        </div>
                    </section>

                    {/* Réclamations */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                            Article 8 - Réclamations et Service Client
                        </h2>
                        <p className="text-muted-foreground">
                            Pour toute réclamation concernant votre commande, veuillez nous contacter :
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
                            <li>Par téléphone : <a href="tel:0232112613" className="text-primary hover:underline">02 32 11 26 13</a></li>
                            <li>Par email : <a href="mailto:contact@twinpizza.fr" className="text-primary hover:underline">contact@twinpizza.fr</a></li>
                        </ul>
                        <p className="text-muted-foreground mt-4">
                            Nous nous engageons à répondre dans un délai de 48 heures ouvrées.
                        </p>
                    </section>

                    {/* Responsabilité */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                            Article 9 - Responsabilité
                        </h2>
                        <p className="text-muted-foreground">
                            Twin Pizza s'engage à fournir des produits de qualité conforme aux normes d'hygiène
                            alimentaire. Notre responsabilité est limitée au montant de la commande en cas de litige.
                        </p>
                    </section>

                    {/* Allergènes */}
                    <section className="bg-primary/10 rounded-xl p-6 border border-primary/20">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            ⚠️ Information Allergènes
                        </h2>
                        <p className="text-muted-foreground">
                            Nos produits peuvent contenir des allergènes (gluten, lactose, œufs, fruits à coque, etc.).
                            Pour toute question concernant les allergènes, veuillez nous contacter avant de passer
                            commande.
                        </p>
                        <p className="text-muted-foreground mt-3">
                            La liste des allergènes est disponible sur demande au{' '}
                            <a href="tel:0232112613" className="text-primary hover:underline font-medium">02 32 11 26 13</a>
                        </p>
                    </section>

                    {/* Litiges */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                            Article 10 - Litiges
                        </h2>
                        <p className="text-muted-foreground">
                            Les présentes CGV sont soumises au droit français. En cas de litige, une solution
                            amiable sera recherchée. À défaut, les tribunaux français seront compétents.
                        </p>
                        <p className="text-muted-foreground mt-3">
                            Conformément à l'article L612-1 du Code de la consommation, vous pouvez recourir
                            gratuitement au service de médiation de la consommation.
                        </p>
                    </section>

                </div>

                {/* Footer links */}
                <div className="mt-12 pt-8 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <Link to="/mentions-legales" className="hover:text-primary">Mentions Légales</Link>
                    <span>•</span>
                    <Link to="/confidentialite" className="hover:text-primary">Politique de Confidentialité</Link>
                    <span>•</span>
                    <Link to="/" className="hover:text-primary">Accueil</Link>
                </div>
            </div>
        </div>
    );
}
