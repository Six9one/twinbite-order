console.log("🍕 TwinPizza Auto-Printer Extension Loaded!");

// Load already printed orders cache from localStorage
let printedOrders = new Set();
try {
  const saved = localStorage.getItem("twinpizza-printed-orders");
  if (saved) {
    printedOrders = new Set(JSON.parse(saved));
  }
} catch (e) {
  console.error("Failed to load printed orders cache:", e);
}

function savePrintedOrders() {
  try {
    localStorage.setItem("twinpizza-printed-orders", JSON.stringify(Array.from(printedOrders)));
  } catch (e) {
    console.error("Failed to save printed orders cache:", e);
  }
}

// Inject a beautiful floating print button in the bottom right corner
const btn = document.createElement("button");
btn.innerHTML = "🖨️ Imprimer sur TwinPizza";
btn.style.position = "fixed";
btn.style.bottom = "20px";
btn.style.right = "20px";
btn.style.zIndex = "999999";
btn.style.backgroundColor = "#ff5b1a";
btn.style.color = "white";
btn.style.border = "none";
btn.style.borderRadius = "30px";
btn.style.padding = "12px 24px";
btn.style.fontSize = "15px";
btn.style.fontWeight = "bold";
btn.style.cursor = "pointer";
btn.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
btn.style.transition = "all 0.3s ease";
btn.style.display = "flex";
btn.style.alignItems = "center";
btn.style.gap = "8px";
btn.style.fontFamily = "'Outfit', 'Inter', sans-serif";

btn.addEventListener("mouseenter", () => {
  btn.style.transform = "scale(1.05)";
  btn.style.backgroundColor = "#e04e13";
});

btn.addEventListener("mouseleave", () => {
  btn.style.transform = "scale(1)";
  btn.style.backgroundColor = "#ff5b1a";
});

document.body.appendChild(btn);

// Manual print button click handler
btn.addEventListener("click", async () => {
  const selectedText = window.getSelection().toString().trim();
  const pageText = document.body.innerText;
  const textToParse = selectedText || pageText;
  
  btn.innerHTML = "🌀 Lecture de la commande...";
  btn.style.backgroundColor = "#666";
  
  const orderData = parseOrder(textToParse);
  
  if (orderData.items.length === 0) {
    btn.innerHTML = "⚠️ Aucun article trouvé (Sélectionnez le texte)";
    btn.style.backgroundColor = "#ffc107";
    btn.style.color = "black";
    setTimeout(resetButton, 4000);
    return;
  }

  btn.innerHTML = "🖨️ Envoi à l'imprimante...";
  btn.style.backgroundColor = "#007bff";
  btn.style.color = "white";

  try {
    const response = await fetch("https://hsylnrzxeyqxczdalurj.supabase.co/functions/v1/ubereats-webhook?token=twinpizza-uber-secret", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Force add to cache to prevent auto-print from refiring
      if (orderData.order_id) {
        printedOrders.add(orderData.order_id);
        savePrintedOrders();
      }
      btn.innerHTML = "✅ Commande Imprimée !";
      btn.style.backgroundColor = "#28a745";
      setTimeout(resetButton, 3000);
    } else {
      throw new Error(result.error || "Failed to print");
    }
  } catch (err) {
    console.error("Print failed:", err);
    btn.innerHTML = "❌ Échec d'impression";
    btn.style.backgroundColor = "#dc3545";
    setTimeout(resetButton, 4000);
  }
});

function resetButton() {
  btn.innerHTML = "🖨️ Imprimer sur TwinPizza";
  btn.style.backgroundColor = "#ff5b1a";
  btn.style.color = "white";
}

// Automatically scans and prints when a new order details card is viewed
async function autoScanAndPrint() {
  // If user is currently highlighting text, skip auto-print to avoid interrupting them
  if (window.getSelection().toString().trim()) return;

  const pageText = document.body.innerText;
  const orderData = parseOrder(pageText);
  
  // Make sure we have items and a valid order ID
  if (orderData.items.length > 0 && orderData.order_id) {
    const orderId = orderData.order_id;
    
    // Check if this order was already printed in this session
    if (!printedOrders.has(orderId)) {
      console.log("🍕 New Uber Eats order detected, starting auto-print:", orderId);
      
      // Temporarily mark as printed to prevent concurrent calls
      printedOrders.add(orderId);
      savePrintedOrders();
      
      btn.innerHTML = "🖨️ Auto-Impression...";
      btn.style.backgroundColor = "#007bff";
      
      try {
        const response = await fetch("https://hsylnrzxeyqxczdalurj.supabase.co/functions/v1/ubereats-webhook?token=twinpizza-uber-secret", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          btn.innerHTML = "✅ Auto-Imprimé !";
          btn.style.backgroundColor = "#28a745";
          setTimeout(resetButton, 3000);
        } else {
          throw new Error("Failed to auto-print");
        }
      } catch (err) {
        console.error("Auto-print failed:", err);
        // Remove from printed list on error so it can retry later
        printedOrders.delete(orderId);
        savePrintedOrders();
        btn.innerHTML = "❌ Échec Auto-Impression";
        btn.style.backgroundColor = "#dc3545";
        setTimeout(resetButton, 4000);
      }
    }
  }
}

// Scan the active screen every 3 seconds for new order details
setInterval(autoScanAndPrint, 3000);

// Parser function to extract order details from webpage text
function parseOrder(text) {
  // Find order ID (look for code or alphanumeric patterns)
  let orderId = "";
  const orderIdMatch = text.match(/(?:Commande|Order|N°|#)\s*#?([A-Z0-9]{5})\b/i) || text.match(/\b([A-Z0-9]{5})\b/);
  if (orderIdMatch) {
    orderId = orderIdMatch[1];
  } else {
    // Fallback: look for a lone 5-character uppercase alphanumeric code
    const genericMatch = text.match(/\b([A-Z0-9]{5})\b/);
    orderId = genericMatch ? genericMatch[1] : "";
  }

  // Find customer name
  let customerName = "Client Uber Eats";
  const nameMatch = text.match(/(?:Client|Customer|Pour|Client Uber Eats)\s*:\s*([^\n]+)/i) || text.match(/(?:Pour)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/);
  if (nameMatch) {
    customerName = nameMatch[1].trim();
  }

  // Find notes
  let customerNotes = "";
  const notesMatch = text.match(/(?:Note|Commentaire|Instructions|Remarques)\s*:\s*([^\n]+)/i);
  if (notesMatch) {
    customerNotes = notesMatch[1].trim();
  }

  const items = [];
  const lines = text.split("\n");
  let currentItem = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Detect lines like "1x Pizza", "2 x Drink", "1  TexMex"
    const itemMatch = line.match(/^(\d+)\s*x?\s+([A-Za-z0-9 À-ÿ'\.\-]+)/);
    
    if (itemMatch) {
      const quantity = parseInt(itemMatch[1]);
      let name = itemMatch[2].trim();
      
      // Clean trailing prices if present on the same line
      let price = 0;
      const priceMatch = name.match(/(\d+[\.,]\d{2})\s*€?/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(",", "."));
        name = name.replace(priceMatch[0], "").trim();
      }

      // Skip lines that look like totals or metadata
      const lowerName = name.toLowerCase();
      if (lowerName.includes("total") || lowerName.includes("tva") || lowerName.includes("euro") || lowerName.includes("commande") || lowerName.includes("frais")) {
        continue;
      }

      currentItem = {
        name: name,
        quantity: quantity,
        price: price,
        description: ""
      };
      items.push(currentItem);
    } else if (currentItem && (line.startsWith("-") || line.startsWith("+") || line.startsWith("Sans ") || line.startsWith("Sauce ") || line.startsWith("Supplément "))) {
      currentItem.description += (currentItem.description ? ", " : "") + line.replace(/^[\-\+\•\s]*/, "").trim();
    }
  }

  // Find total price
  let total = 0;
  const totalMatch = text.match(/(?:Total|Somme|Total TTC)\s*:\s*(\d+[\.,]\d{2})/i) || text.match(/(\d+[\.,]\d{2})\s*€/);
  if (totalMatch) {
    total = parseFloat(totalMatch[1].replace(",", "."));
  }

  return {
    order_id: orderId,
    customer_name: customerName,
    customer_notes: customerNotes,
    items: items,
    total: total || (items.reduce((acc, it) => acc + (it.price * it.quantity), 0))
  };
}
