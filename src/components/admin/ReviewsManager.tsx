import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Star, MessageSquare, Search, Check, X, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Review {
    id: string;
    customer_name: string;
    customer_phone: string | null;
    rating: number;
    comment: string | null;
    is_published: boolean;
    is_google_review: boolean;
    created_at: string;
}

export function ReviewsManager() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'published'>('all');

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('reviews' as any)
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setReviews(data as unknown as Review[]);
        }
        setLoading(false);
    };

    const handleTogglePublish = async (reviewId: string, isPublished: boolean) => {
        const { error } = await supabase
            .from('reviews' as any)
            .update({ is_published: !isPublished })
            .eq('id', reviewId);

        if (error) {
            toast.error('Erreur lors de la mise à jour');
        } else {
            toast.success(isPublished ? 'Avis masqué' : 'Avis publié');
            fetchReviews();
        }
    };

    const handleDelete = async (reviewId: string) => {
        if (!confirm('Supprimer cet avis ?')) return;

        const { error } = await supabase
            .from('reviews' as any)
            .delete()
            .eq('id', reviewId);

        if (error) {
            toast.error('Erreur lors de la suppression');
        } else {
            toast.success('Avis supprimé');
            fetchReviews();
        }
    };

    const filteredReviews = reviews
        .filter(r => {
            if (filter === 'pending') return !r.is_published;
            if (filter === 'published') return r.is_published;
            return true;
        })
        .filter(r =>
            r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
            r.comment?.toLowerCase().includes(search.toLowerCase())
        );

    // Stats
    const totalReviews = reviews.length;
    const publishedCount = reviews.filter(r => r.is_published).length;
    const pendingCount = reviews.filter(r => !r.is_published).length;
    const averageRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : '0';

    if (loading) {
        return <div className="text-center py-12">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-amber-500" />
                Gestion des Avis
            </h2>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                    <p className="text-3xl font-bold">{totalReviews}</p>
                    <p className="text-sm text-muted-foreground">Total avis</p>
                </Card>
                <Card className="p-4 text-center bg-green-500/10">
                    <p className="text-3xl font-bold text-green-600">{publishedCount}</p>
                    <p className="text-sm text-muted-foreground">Publiés</p>
                </Card>
                <Card className="p-4 text-center bg-yellow-500/10">
                    <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
                    <p className="text-sm text-muted-foreground">En attente</p>
                </Card>
                <Card className="p-4 text-center bg-amber-500/10">
                    <div className="flex items-center justify-center gap-1">
                        <p className="text-3xl font-bold text-amber-500">{averageRating}</p>
                        <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">Note moyenne</p>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par nom ou contenu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilter('all')}
                        size="sm"
                    >
                        Tous
                    </Button>
                    <Button
                        variant={filter === 'pending' ? 'default' : 'outline'}
                        onClick={() => setFilter('pending')}
                        size="sm"
                    >
                        En attente ({pendingCount})
                    </Button>
                    <Button
                        variant={filter === 'published' ? 'default' : 'outline'}
                        onClick={() => setFilter('published')}
                        size="sm"
                    >
                        Publiés ({publishedCount})
                    </Button>
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-3">
                {filteredReviews.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Aucun avis trouvé</p>
                ) : (
                    filteredReviews.map((review) => (
                        <Card key={review.id} className={`p-4 ${!review.is_published ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-semibold">{review.customer_name}</span>
                                        {review.is_google_review && (
                                            <Badge variant="secondary" className="text-xs">Google</Badge>
                                        )}
                                        {!review.is_published && (
                                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">En attente</Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(review.created_at).toLocaleDateString('fr-FR')}
                                        </span>
                                    </div>

                                    <div className="flex gap-0.5 mb-2">
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
                                        <p className="text-sm text-muted-foreground italic">"{review.comment}"</p>
                                    )}
                                </div>

                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleTogglePublish(review.id, review.is_published)}
                                        title={review.is_published ? 'Masquer' : 'Publier'}
                                    >
                                        {review.is_published ? (
                                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="w-4 h-4 text-green-500" />
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-500"
                                        onClick={() => handleDelete(review.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
