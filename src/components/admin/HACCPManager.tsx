import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
    Snowflake, Leaf, Printer, History,
    Clock, Thermometer, AlertTriangle, CheckCircle,
    Calendar, Download, RefreshCw
} from 'lucide-react';

interface HACCPCategory {
    id: string;
    name: string;
    slug: string;
    color: string;
    dlc_hours: number;
    storage_temp_min: number;
    storage_temp_max: number;
    rules_description: string;
}

interface HACCPProduct {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    dlc_hours_override: number | null;
    display_order: number;
}

interface HACCPHistoryEntry {
    id: string;
    product_name: string;
    category_name: string;
    action_type: string;
    action_datetime: string;
    dlc_datetime: string;
    storage_temp: string;
    printed_by: string;
    created_at: string;
}

export function HACCPManager() {
    const [categories, setCategories] = useState<HACCPCategory[]>([]);
    const [products, setProducts] = useState<HACCPProduct[]>([]);
    const [history, setHistory] = useState<HACCPHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().slice(0, 10));
    const [printing, setPrinting] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [historyDate]);

    const fetchData = async () => {
        setLoading(true);

        // Fetch categories
        const { data: catData, error: catError } = await supabase
            .from('haccp_categories' as any)
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (!catError && catData) {
            const cats = catData as unknown as HACCPCategory[];
            setCategories(cats);
            if (cats.length > 0 && !activeCategory) {
                setActiveCategory(cats[0].slug);
            }
        }

        // Fetch products
        const { data: prodData, error: prodError } = await supabase
            .from('haccp_products' as any)
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (!prodError && prodData) {
            setProducts(prodData as unknown as HACCPProduct[]);
        }

        setLoading(false);
    };

    const fetchHistory = async () => {
        const startOfDay = new Date(historyDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(historyDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('haccp_history' as any)
            .select('*')
            .gte('action_datetime', startOfDay.toISOString())
            .lte('action_datetime', endOfDay.toISOString())
            .order('action_datetime', { ascending: false });

        if (!error && data) {
            setHistory(data as unknown as HACCPHistoryEntry[]);
        }
    };

    const handleProductClick = async (product: HACCPProduct) => {
        const category = categories.find(c => c.id === product.category_id);
        if (!category) return;

        setPrinting(product.id);

        try {
            // Calculate DLC
            const now = new Date();
            const dlcHours = product.dlc_hours_override || category.dlc_hours;
            const dlcDate = new Date(now.getTime() + dlcHours * 60 * 60 * 1000);
            const storageTemp = `${category.storage_temp_min}°C à +${category.storage_temp_max}°C`;

            // Operator name - always Safouane B
            const userName = 'Safouane B';

            console.log('📝 HACCP: Inserting history entry for', product.name);

            // Save to history
            const { data: insertedData, error: insertError } = await supabase
                .from('haccp_history' as any)
                .insert({
                    product_id: product.id,
                    category_id: category.id,
                    product_name: product.name,
                    category_name: category.name,
                    action_type: category.slug === 'congele-decongele' ? 'defrost' : 'open',
                    action_datetime: now.toISOString(),
                    dlc_datetime: dlcDate.toISOString(),
                    storage_temp: storageTemp,
                    printed_by: userName,
                } as any)
                .select();

            if (insertError) {
                console.error('❌ HACCP Insert Error:', insertError);
                throw insertError;
            }

            console.log('✅ HACCP: Inserted successfully', insertedData);

            // Print ticket
            printHACCPTicket(product, category, now, dlcDate, storageTemp, userName);

            // Refresh history with await
            console.log('🔄 HACCP: Refreshing history...');
            await fetchHistory();
            console.log('✅ HACCP: History refreshed, count:', history.length);

            toast.success(`✅ Ticket HACCP imprimé pour ${product.name}`);
        } catch (error) {
            console.error('❌ HACCP error:', error);
            toast.error('Erreur lors de l\'enregistrement HACCP');
        } finally {
            setPrinting(null);
        }
    };

    const printHACCPTicket = (
        product: HACCPProduct,
        category: HACCPCategory,
        actionDate: Date,
        dlcDate: Date,
        storageTemp: string,
        userName: string
    ) => {
        const actionLabel = category.slug === 'congele-decongele' ? 'Décongélation' : 'Ouverture';
        const dlcHours = product.dlc_hours_override || category.dlc_hours;

        const ticketHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HACCP - ${product.name}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          @media print { body { width: 58mm; margin: 0; } }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 10px;
            width: 58mm; 
            margin: 0;
            padding: 2mm;
            color: #000;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 4px;
            margin-bottom: 4px;
          }
          .header h1 {
            margin: 0;
            font-size: 12px;
          }
          .category-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 9px;
            margin: 4px 0;
            color: white;
            background-color: ${category.color};
          }
          .product-name {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin: 6px 0;
            padding: 4px;
            background: #f0f0f0;
            border-radius: 3px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
            font-size: 9px;
          }
          .dlc-box {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 6px;
            margin: 6px 0;
            text-align: center;
            border-radius: 3px;
          }
          .dlc-box .title {
            font-size: 8px;
            text-transform: uppercase;
          }
          .dlc-box .date {
            font-size: 12px;
            font-weight: bold;
          }
          .product-info {
            font-size: 8px;
            background: #e0f2fe;
            padding: 4px;
            margin: 4px 0;
            border-left: 2px solid #0284c7;
          }
          .rules {
            font-size: 8px;
            background: #f8f9fa;
            padding: 4px;
            margin: 4px 0;
            border-left: 2px solid ${category.color};
          }
          .footer {
            text-align: center;
            font-size: 8px;
            margin-top: 6px;
            padding-top: 4px;
            border-top: 1px dashed #000;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🧾 HACCP</h1>
          <div style="font-size: 9px;">TWIN PIZZA</div>
        </div>
        
        <div style="text-align: center;">
          <span class="category-badge">${category.name}</span>
        </div>
        
        <div class="product-name">${product.name}</div>
        
        <div class="info-row">
          <span>📅 ${actionLabel}:</span>
          <span>${actionDate.toLocaleDateString('fr-FR')} ${actionDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        <div class="dlc-box">
          <div class="title">⚠️ DLC</div>
          <div class="date">${dlcDate.toLocaleDateString('fr-FR')} ${dlcDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
          <div style="font-size: 8px;">(+${dlcHours}h)</div>
        </div>
        
        <div class="info-row">
          <span>🌡️ Temp:</span>
          <span>${storageTemp}</span>
        </div>
        
        ${product.description ? `
        <div class="product-info">
          ℹ️ ${product.description.substring(0, 80)}${product.description.length > 80 ? '...' : ''}
        </div>
        ` : ''}
        
        <div class="rules">
          📋 ${category.slug === 'congele-decongele' ? 'Ne jamais recongeler. Frigo 0-3°C.' : 'Étiqueter. Frigo 0-3°C.'}
        </div>
        
        <div class="footer">
          ${new Date().toLocaleString('fr-FR')}<br/>
          👤 ${userName}
        </div>
      </body>
      </html>
    `;

        // Create hidden iframe for printing
        const existingFrame = document.getElementById('haccp-print-frame');
        if (existingFrame) existingFrame.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'haccp-print-frame';
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        doc.write(ticketHtml);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => iframe.remove(), 3000);
        }, 300);
    };

    const exportHistory = () => {
        if (history.length === 0) {
            toast.error('Aucune donnée à exporter');
            return;
        }

        const reportDate = new Date(historyDate).toLocaleDateString('fr-FR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // Create a styled HTML table that Excel will render beautifully
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; }
  h1 { color: #d97706; text-align: center; margin-bottom: 5px; }
  .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
  .info { background: #fef3c7; padding: 10px; margin-bottom: 15px; border-radius: 8px; }
  table { border-collapse: collapse; width: 100%; margin-top: 10px; }
  th { 
    background: #d97706; 
    color: white; 
    padding: 12px 8px; 
    text-align: left; 
    font-weight: bold;
    border: 1px solid #b45309;
  }
  td { 
    padding: 10px 8px; 
    border: 1px solid #e5e7eb; 
  }
  tr:nth-child(even) { background: #fef9ee; }
  tr:hover { background: #fef3c7; }
  .category-frozen { 
    background: #ef4444; 
    color: white; 
    padding: 4px 8px; 
    border-radius: 4px; 
    font-size: 12px;
  }
  .category-fresh { 
    background: #22c55e; 
    color: white; 
    padding: 4px 8px; 
    border-radius: 4px; 
    font-size: 12px;
  }
  .dlc { 
    background: #fff3cd; 
    padding: 4px 8px; 
    border: 1px solid #ffc107; 
    border-radius: 4px;
    font-weight: bold;
  }
  .footer { 
    margin-top: 20px; 
    padding: 10px; 
    background: #f3f4f6; 
    border-radius: 8px;
    text-align: center;
  }
  .total { font-size: 18px; font-weight: bold; color: #d97706; }
</style>
</head>
<body>
  <h1>🧾 RAPPORT HACCP</h1>
  <div class="subtitle">TWIN PIZZA - Grand-Couronne</div>
  
  <div class="info">
    <strong>📅 Date du rapport:</strong> ${reportDate}<br>
    <strong>🕐 Généré le:</strong> ${new Date().toLocaleString('fr-FR')}
  </div>

  <table>
    <thead>
      <tr>
        <th>⏰ Heure</th>
        <th>📦 Produit</th>
        <th>🏷️ Catégorie</th>
        <th>🔄 Action</th>
        <th>⚠️ DLC</th>
        <th>🌡️ Température</th>
        <th>👤 Opérateur</th>
      </tr>
    </thead>
    <tbody>
      ${history.map(h => {
            const isFrozen = h.category_name.includes('Congelé');
            const categoryClass = isFrozen ? 'category-frozen' : 'category-fresh';
            const actionLabel = h.action_type === 'defrost' ? '❄️ Décongélation' : '📂 Ouverture';
            return `
      <tr>
        <td><strong>${new Date(h.action_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></td>
        <td><strong>${h.product_name}</strong></td>
        <td><span class="${categoryClass}">${h.category_name}</span></td>
        <td>${actionLabel}</td>
        <td><span class="dlc">${new Date(h.dlc_datetime).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></td>
        <td>${h.storage_temp}</td>
        <td>${h.printed_by}</td>
      </tr>`;
        }).join('')}
    </tbody>
  </table>

  <div class="footer">
    <span class="total">📊 Total: ${history.length} enregistrement(s)</span>
  </div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `HACCP_TwinPizza_${historyDate}.xls`;
        link.click();
        toast.success('📊 Export Excel téléchargé!');
    };

    const getCategoryIcon = (slug: string) => {
        return slug === 'congele-decongele' ? Snowflake : Leaf;
    };

    const getActiveProducts = () => {
        const cat = categories.find(c => c.slug === activeCategory);
        if (!cat) return [];
        return products.filter(p => p.category_id === cat.id);
    };

    const getActiveCategoryColor = () => {
        const cat = categories.find(c => c.slug === activeCategory);
        return cat?.color || '#666';
    };

    if (loading) {
        return <div className="text-center py-12">Chargement HACCP...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                    Module HACCP
                </h2>
                <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                </Button>
            </div>

            {/* Info Card */}
            <Card className="p-4 bg-amber-500/10 border-amber-500/30">
                <p className="text-sm">
                    🧾 <strong>Cliquez sur un produit</strong> pour générer un ticket HACCP, l'imprimer automatiquement et enregistrer dans l'historique.
                </p>
            </Card>

            {/* Tabs for Categories */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="grid w-full grid-cols-2 h-auto">
                    {categories.map(cat => {
                        const Icon = getCategoryIcon(cat.slug);
                        return (
                            <TabsTrigger
                                key={cat.slug}
                                value={cat.slug}
                                className="py-3 data-[state=active]:text-white"
                                style={{
                                    '--active-bg': cat.color,
                                    backgroundColor: activeCategory === cat.slug ? cat.color : undefined
                                } as any}
                            >
                                <Icon className="w-4 h-4 mr-2" />
                                {cat.name}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {categories.map(cat => (
                    <TabsContent key={cat.slug} value={cat.slug} className="mt-6">
                        {/* Category Info */}
                        <Card className="p-4 mb-6" style={{ borderLeftColor: cat.color, borderLeftWidth: 4 }}>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>DLC: <strong>{cat.dlc_hours}h</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Thermometer className="w-4 h-4" />
                                    <span>Conservation: <strong>{cat.storage_temp_min}°C à +{cat.storage_temp_max}°C</strong></span>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">{cat.rules_description}</p>
                        </Card>

                        {/* Product Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {getActiveProducts().map(product => {
                                const isLoading = printing === product.id;
                                const dlcHours = product.dlc_hours_override || cat.dlc_hours;

                                return (
                                    <Button
                                        key={product.id}
                                        onClick={() => handleProductClick(product)}
                                        disabled={isLoading}
                                        className="h-24 flex flex-col items-center justify-center gap-2 text-white font-bold shadow-lg hover:scale-105 transition-all"
                                        style={{ backgroundColor: cat.color }}
                                    >
                                        {isLoading ? (
                                            <Printer className="w-6 h-6 animate-pulse" />
                                        ) : (
                                            <>
                                                <span className="text-sm text-center leading-tight">{product.name}</span>
                                                <Badge variant="secondary" className="text-[10px] bg-white/20">
                                                    +{dlcHours}h
                                                </Badge>
                                            </>
                                        )}
                                    </Button>
                                );
                            })}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            {/* History Section */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Historique HACCP
                    </h3>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={historyDate}
                            onChange={(e) => setHistoryDate(e.target.value)}
                            className="w-auto"
                        />
                        <Button variant="outline" size="sm" onClick={exportHistory}>
                            <Download className="w-4 h-4 mr-1" />
                            CSV
                        </Button>
                    </div>
                </div>

                {history.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        Aucun enregistrement pour cette date
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 px-2">Heure</th>
                                    <th className="text-left py-2 px-2">Produit</th>
                                    <th className="text-left py-2 px-2">Catégorie</th>
                                    <th className="text-left py-2 px-2">DLC</th>
                                    <th className="text-left py-2 px-2">Par</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(entry => (
                                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                                        <td className="py-2 px-2">
                                            {new Date(entry.action_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="py-2 px-2 font-medium">{entry.product_name}</td>
                                        <td className="py-2 px-2">
                                            <Badge
                                                variant="secondary"
                                                className="text-white text-[10px]"
                                                style={{
                                                    backgroundColor: categories.find(c => c.name === entry.category_name)?.color || '#666'
                                                }}
                                            >
                                                {entry.category_name}
                                            </Badge>
                                        </td>
                                        <td className="py-2 px-2">
                                            {new Date(entry.dlc_datetime).toLocaleString('fr-FR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="py-2 px-2 text-muted-foreground">{entry.printed_by}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
