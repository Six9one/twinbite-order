import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Confidentialite() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-foreground text-background py-6">
                <div className="container mx-auto px-4">
                    <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Retour à l'accueil
                    </Link>
                    <h1 className="font-display text-3xl sm:text-4xl font-bold">Politique de Confidentialité</h1>
                    <p className="text-background/70 mt-2">Dernière mise à jour : Février 2026</p>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="prose prose-neutral max-w-none space-y-8">

                    {/* Introduction */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            📋 Introduction
                        </h2>
                        <p className="text-muted-foreground">
                            Twin Pizza s'engage à protéger la vie privée de ses clients. Cette politique de
                            confidentialité explique comment nous collectons, utilisons et protégeons vos données
                            personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
                        </p>
                    </section>

                    {/* Données collectées */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            📊 Données collectées
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Lors de votre commande, nous collectons les informations suivantes :
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li><strong className="text-foreground">Nom et prénom</strong> - pour identifier votre commande</li>
                            <li><strong className="text-foreground">Numéro de téléphone</strong> - pour vous contacter si nécessaire</li>
                            <li><strong className="text-foreground">Adresse de livraison</strong> - uniquement pour les livraisons</li>
                            <li><strong className="text-foreground">Historique des commandes</strong> - pour le programme de fidélité</li>
                        </ul>
                    </section>

                    {/* Utilisation des données */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            🎯 Utilisation des données
                        </h2>
                        <p className="text-muted-foreground mb-4">Vos données sont utilisées pour :</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Traiter et livrer vos commandes</li>
                            <li>Vous contacter concernant votre commande</li>
                            <li>Gérer votre compte fidélité</li>
                            <li>Améliorer nos services</li>
                        </ul>
                        <p className="text-muted-foreground mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            ✅ <strong>Nous ne vendons jamais vos données</strong> à des tiers et ne les utilisons pas à des fins publicitaires.
                        </p>
                    </section>

                    {/* Conservation des données */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            ⏱️ Conservation des données
                        </h2>
                        <p className="text-muted-foreground">
                            Vos données personnelles sont conservées pendant une durée de <strong className="text-foreground">3 ans</strong> à
                            compter de votre dernière commande. Après cette période, elles sont automatiquement supprimées
                            de nos systèmes.
                        </p>
                    </section>

                    {/* Vos droits */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            ⚖️ Vos droits (RGPD)
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Conformément au RGPD, vous disposez des droits suivants :
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <strong className="text-foreground">Droit d'accès</strong>
                                <p className="text-sm text-muted-foreground">Obtenir une copie de vos données</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <strong className="text-foreground">Droit de rectification</strong>
                                <p className="text-sm text-muted-foreground">Corriger vos données inexactes</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <strong className="text-foreground">Droit à l'effacement</strong>
                                <p className="text-sm text-muted-foreground">Demander la suppression de vos données</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <strong className="text-foreground">Droit d'opposition</strong>
                                <p className="text-sm text-muted-foreground">Vous opposer au traitement</p>
                            </div>
                        </div>
                        <p className="text-muted-foreground mt-4">
                            Pour exercer ces droits, contactez-nous par email à{' '}
                            <a href="mailto:contact@twinpizza.fr" className="text-primary hover:underline">contact@twinpizza.fr</a>
                        </p>
                    </section>

                    {/* Cookies */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            🍪 Cookies
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Notre site utilise des cookies pour :
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li><strong className="text-foreground">Cookies essentiels</strong> - nécessaires au fonctionnement du site</li>
                            <li><strong className="text-foreground">Cookies de préférences</strong> - mémoriser vos choix (panier, mode sombre)</li>
                            <li><strong className="text-foreground">Cookies analytiques</strong> - améliorer notre site (avec votre consentement)</li>
                        </ul>
                        <p className="text-muted-foreground mt-4">
                            Vous pouvez modifier vos préférences de cookies à tout moment via le bandeau de consentement.
                        </p>
                    </section>

                    {/* Sécurité */}
                    <section className="bg-card rounded-xl p-6 shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            🔐 Sécurité
                        </h2>
                        <p className="text-muted-foreground">
                            Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données
                            contre tout accès non autorisé, modification ou divulgation. Vos données sont stockées
                            sur des serveurs sécurisés avec chiffrement.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="bg-primary/10 rounded-xl p-6 border border-primary/20">
                        <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                            📧 Contact
                        </h2>
                        <p className="text-muted-foreground">
                            Pour toute question concernant cette politique de confidentialité ou vos données personnelles :
                        </p>
                        <div className="mt-4 space-y-2">
                            <p className="text-foreground">
                                <strong>Email :</strong>{' '}
                                <a href="mailto:contact@twinpizza.fr" className="text-primary hover:underline">contact@twinpizza.fr</a>
                            </p>
                            <p className="text-foreground">
                                <strong>Téléphone :</strong>{' '}
                                <a href="tel:0232112613" className="text-primary hover:underline">02 32 11 26 13</a>
                            </p>
                            <p className="text-foreground">
                                <strong>Adresse :</strong> 60 Rue Georges Clemenceau, 76530 Grand-Couronne
                            </p>
                        </div>
                    </section>

                </div>

                {/* Footer links */}
                <div className="mt-12 pt-8 border-t flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <Link to="/mentions-legales" className="hover:text-primary">Mentions Légales</Link>
                    <span>•</span>
                    <Link to="/cgv" className="hover:text-primary">Conditions Générales de Vente</Link>
                    <span>•</span>
                    <Link to="/" className="hover:text-primary">Accueil</Link>
                </div>
            </div>
        </div>
    );
}
