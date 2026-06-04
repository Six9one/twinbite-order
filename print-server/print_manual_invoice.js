// ============================================================
// FACTURE MANUELLE — Twin Pizza
// Envoie une facture directement a l'imprimante thermique
// via le serveur d'impression (port 3001)
// ============================================================

const PRINT_SERVER_URL = 'http://localhost:3001/print-invoice';

const invoice = {
    invoiceNumber: 'FA-MANUEL-' + Date.now(),
    invoiceDate: '2026-06-04',
    order: {
        order_number: 'MANUEL',
        created_at: '2026-06-04T19:38:09+02:00',
        order_type: 'surplace',
        customer_name: 'Client',
        customer_phone: '',
        customer_address: '',
        customer_notes: '',
        payment_method: 'cb',
        subtotal: 217.00,
        total: 217.00,
        delivery_fee: 0,
        items: [
            {
                name: 'Repas',
                quantity: 1,
                price: 217.00,
                totalPrice: 217.00,
            }
        ]
    }
};

console.log('📄 Envoi de la facture manuelle vers l\'imprimante...');
console.log('   Montant : 217.00 EUR');
console.log('   Heure   : 19:38:09');
console.log('   Serveur : ' + PRINT_SERVER_URL);
console.log('');

fetch(PRINT_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice)
})
.then(async res => {
    const body = await res.json();
    if (res.ok && body.success) {
        console.log('✅ Facture imprimee avec succes !');
    } else {
        console.error('❌ Erreur d\'impression :', body.error || 'Reponse inattendue');
        process.exit(1);
    }
})
.catch(err => {
    console.error('❌ Impossible de contacter le serveur d\'impression :', err.message);
    console.error('   Verifiez que le serveur d\'impression est en cours d\'execution.');
    console.error('   Lancez-le avec : start-print-server.bat');
    process.exit(1);
});
