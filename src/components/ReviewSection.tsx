import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Star, Send, MessageSquare, ThumbsUp, Quote } from 'lucide-react';
import { toast } from 'sonner';

interface Review {
    id: string;
    customer_name: string;
    rating: number;
    comment: string | null;
    is_google_review: boolean;
    created_at: string;
}

// ReviewSummaryCard Component
export function ReviewSummaryCard({
    averageRating,
    totalReviews,
    ratingDistribution
}: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
}) {
    return (
        <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Average Rating */}
                <div className="text-center">
                    <div className="text-5xl font-bold text-amber-500 mb-1">
                        {averageRating.toFixed(1)}
                    </div>
                    <div className="flex justify-center mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-5 h-5 ${star <= Math.round(averageRating)
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-gray-300'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{totalReviews} avis</p>
                </div>

                {/* Rating Distribution */}
                <div className="flex-1 w-full max-w-xs">
                    {[5, 4, 3, 2, 1].map((stars) => {
                        const count = ratingDistribution[stars] || 0;
                        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                        return (
                            <div key={stars} className="flex items-center gap-2 mb-1">
                                <span className="text-xs w-8">{stars}★</span>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-400 transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground w-8">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}

// Single Review Card
function ReviewCard({ review }: { review: Review }) {
    return (
        <Card className="p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] relative overflow-hidden">
            {review.is_google_review && (
                <Badge className="absolute top-2 right-2 bg-blue-500/10 text-blue-600 text-xs">
                    Google
                </Badge>
            )}
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                    {review.customer_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold">{review.customer_name}</h4>
                        <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString('fr-FR')}
                        </span>
                    </div>
                    <div className="flex mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-4 h-4 ${star <= review.rating
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-gray-300'
                                    }`}
                            />
                        ))}
                    </div>
                    {review.comment && (
                        <div className="relative">
                            <Quote className="absolute -left-1 -top-1 w-4 h-4 text-amber-400/30" />
                            <p className="text-sm text-muted-foreground pl-4 italic">
                                {review.comment}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}

// Review Form
function ReviewForm({ onSubmit }: { onSubmit: () => void }) {
    const [name, setName] = useState('');
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || rating === 0) {
            toast.error('Veuillez entrer votre nom et une note');
            return;
        }

        setSubmitting(true);
        try {
            // Auto-publish if rating is 4 or 5 stars (positive)
            const isPositive = rating >= 4;

            const { error } = await supabase
                .from('reviews' as any)
                .insert({
                    customer_name: name.trim(),
                    rating,
                    comment: comment.trim() || null,
                    is_published: isPositive,
                    is_google_review: false,
                });

            if (error) throw error;

            toast.success(
                isPositive
                    ? 'Merci pour votre avis ! Il est maintenant publié.'
                    : 'Merci pour votre avis ! Il sera examiné par notre équipe.'
            );
            setName('');
            setRating(0);
            setComment('');
            onSubmit();
        } catch (error) {
            console.error('Error submitting review:', error);
            toast.error('Erreur lors de l\'envoi de votre avis');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Laissez votre avis
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Input
                        placeholder="Votre prénom"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-background"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Votre note</label>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="p-1 transition-transform hover:scale-110"
                            >
                                <Star
                                    className={`w-8 h-8 transition-colors ${star <= (hoverRating || rating)
                                            ? 'text-amber-400 fill-amber-400'
                                            : 'text-gray-300 hover:text-amber-200'
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <Textarea
                        placeholder="Partagez votre expérience... (optionnel)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        className="bg-background resize-none"
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={submitting || !name.trim() || rating === 0}
                >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Envoi en cours...' : 'Publier mon avis'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                    Les avis positifs (4-5★) sont publiés instantanément
                </p>
            </form>
        </Card>
    );
}

// Main Review Section
export function ReviewSection() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const { data, error } = await supabase
                .from('reviews' as any)
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setReviews((data as unknown as Review[]) || []);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;
    const ratingDistribution = reviews.reduce((acc, r) => {
        acc[r.rating] = (acc[r.rating] || 0) + 1;
        return acc;
    }, {} as { [key: number]: number });

    if (loading) {
        return (
            <section className="py-16 bg-gradient-to-b from-background to-muted/30">
                <div className="container mx-auto px-4">
                    <div className="animate-pulse text-center">Chargement des avis...</div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-8">
                    <span className="text-amber-500">Avis</span> de nos clients
                </h2>

                {/* Summary Card */}
                {totalReviews > 0 && (
                    <div className="max-w-2xl mx-auto mb-8">
                        <ReviewSummaryCard
                            averageRating={averageRating}
                            totalReviews={totalReviews}
                            ratingDistribution={ratingDistribution}
                        />
                    </div>
                )}

                {/* Reviews Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {reviews.slice(0, 6).map((review) => (
                        <ReviewCard key={review.id} review={review} />
                    ))}
                    {totalReviews === 0 && (
                        <div className="col-span-full text-center py-8">
                            <ThumbsUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                Soyez le premier à laisser un avis !
                            </p>
                        </div>
                    )}
                </div>

                {/* Add Review Button / Form */}
                <div className="max-w-md mx-auto">
                    {showForm ? (
                        <ReviewForm onSubmit={() => {
                            setShowForm(false);
                            fetchReviews();
                        }} />
                    ) : (
                        <Button
                            onClick={() => setShowForm(true)}
                            size="lg"
                            className="w-full gap-2"
                            variant="outline"
                        >
                            <Star className="w-5 h-5" />
                            Laisser un avis
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}
