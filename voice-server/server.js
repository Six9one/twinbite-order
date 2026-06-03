import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, '../.env') }); // Fallback to root .env

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || process.env.VOICE_PORT || 5000;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Use Service Role Key in production

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mu-Law audio conversion utilities (pure JS for zero-native compilation issues)
const BIAS = 0x84;
const CLIP = 32635;

function decodeMuLawByte(uByte) {
  uByte = ~uByte;
  const sign = (uByte & 0x80);
  let exponent = (uByte & 0x70) >> 4;
  let mantissa = (uByte & 0x0F);
  let sample = (mantissa << 3) + 33;
  sample <<= exponent;
  sample -= 33;
  return (sign === 0) ? sample : -sample;
}

function encodeMuLawSample(sample) {
  const sign = (sample < 0) ? 0x80 : 0;
  if (sample < 0) sample = -sample;
  if (sample > CLIP) sample = CLIP;
  sample += BIAS;
  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; mask >>= 1) {
    exponent--;
  }
  const mantissa = (sample >> (exponent + 3)) & 0x0F;
  return ~(sign | (exponent << 4) | mantissa);
}

// Resampling: Simple nearest-neighbor up/downsampling
function upsample8to16(mulawBuffer) {
  const pcm16 = new Int16Array(mulawBuffer.length * 2);
  for (let i = 0; i < mulawBuffer.length; i++) {
    const pcmSample = decodeMuLawByte(mulawBuffer[i]);
    pcm16[i * 2] = pcmSample;
    pcm16[i * 2 + 1] = pcmSample; // Duplicate sample for 16kHz
  }
  return Buffer.from(pcm16.buffer);
}

function downsample24To8MuLaw(pcm24Buffer) {
  const pcm16In = new Int16Array(pcm24Buffer.buffer, pcm24Buffer.byteOffset, pcm24Buffer.byteLength / 2);
  // Downsample 24kHz to 8kHz by taking every 3rd sample
  const outLength = Math.floor(pcm16In.length / 3);
  const mulawOut = Buffer.alloc(outLength);
  for (let i = 0; i < outLength; i++) {
    const sample = pcm16In[i * 3];
    mulawOut[i] = encodeMuLawSample(sample);
  }
  return mulawOut.toString('base64');
}

function downsample16To8MuLaw(pcm16Buffer) {
  const pcm16In = new Int16Array(pcm16Buffer.buffer, pcm16Buffer.byteOffset, pcm16Buffer.byteLength / 2);
  // Downsample 16kHz to 8kHz by taking every 2nd sample
  const outLength = Math.floor(pcm16In.length / 2);
  const mulawOut = Buffer.alloc(outLength);
  for (let i = 0; i < outLength; i++) {
    const sample = pcm16In[i * 2];
    mulawOut[i] = encodeMuLawSample(sample);
  }
  return mulawOut.toString('base64');
}

// Database Helpers
async function getVoiceSettings() {
  const { data, error } = await supabase
    .from('voice_settings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    console.warn("⚠️ Voice settings not found, using defaults");
    return {
      system_prompt: "Tu es Clara, réceptionniste chez Twin Pizza...",
      greeting_message: "Bonjour et bienvenue chez Twin Pizza. Que puis-je préparer pour vous ?",
      voice_id: "alloy",
      provider: "openai",
      transfer_phone_number: "02 32 11 26 13",
      faqs: []
    };
  }
  return data;
}

async function getCustomerContext(phone) {
  if (!phone) return null;
  // Normalize phone number (remove spaces)
  const cleanPhone = phone.replace(/\s+/g, '');
  
  // Find customer name/address from orders
  const { data: previousOrders, error } = await supabase
    .from('orders')
    .select('*')
    .or(`customer_phone.eq.${cleanPhone},customer_phone.eq.${phone}`)
    .order('created_at', { ascending: false });

  if (error || !previousOrders || previousOrders.length === 0) {
    return { name: null, address: null, history: "Nouveau client (aucune commande précédente)." };
  }

  const lastOrder = previousOrders[0];
  const name = lastOrder.customer_name;
  const address = lastOrder.customer_address;

  // Generate friendly history summary
  const orderSummaries = previousOrders.slice(0, 3).map((o, index) => {
    const date = new Date(o.created_at).toLocaleDateString('fr-FR');
    const itemsText = Array.isArray(o.items) 
      ? o.items.map(i => `${i.quantity}x ${i.name || i.item?.name}`).join(', ')
      : "Articles inconnus";
    return `- Commande #${index + 1} (${date}): ${itemsText} (${o.total}€) - ${o.order_type}`;
  }).join('\n');

  return {
    name,
    address,
    history: `Client existant.\nNom connu: ${name}\nAdresse connue: ${address || 'Aucune'}\nDernières commandes :\n${orderSummaries}`
  };
}

async function logCallStart(sid, phone, customerName) {
  const { data, error } = await supabase
    .from('voice_calls')
    .insert({
      sid,
      phone_number: phone || 'Inconnu',
      customer_name: customerName || null,
      status: 'active',
      direction: 'inbound',
      transcript: []
    })
    .select()
    .single();
  
  if (error) console.error("❌ Error logging call start:", error.message);
  return data;
}

async function logCallEnd(sid, status, duration, recordingUrl) {
  const updates = { status, duration, updated_at: new Date().toISOString() };
  if (recordingUrl) updates.recording_url = recordingUrl;
  
  const { error } = await supabase
    .from('voice_calls')
    .update(updates)
    .eq('sid', sid);
  
  if (error) console.error(`❌ Error logging call end for ${sid}:`, error.message);
}

async function appendToTranscript(sid, role, text) {
  if (!sid) return;
  const { data: call } = await supabase
    .from('voice_calls')
    .select('transcript')
    .eq('sid', sid)
    .single();
  
  if (call) {
    const transcript = [...(call.transcript || [])];
    transcript.push({
      role,
      text,
      time: new Date().toISOString()
    });
    
    await supabase
      .from('voice_calls')
      .update({ transcript, updated_at: new Date().toISOString() })
      .eq('sid', sid);
  }
}

// Tools functions executed by the server on behalf of the LLM
const toolImplementations = {
  check_customer_history: async ({ phone }) => {
    console.log(`[Tool] Querying customer history for: ${phone}`);
    const context = await getCustomerContext(phone);
    return JSON.stringify(context);
  },

  search_menu: async ({ query }) => {
    console.log(`[Tool] Searching menu for: "${query}"`);
    // Search in categories and products
    const { data: products, error } = await supabase
      .from('products')
      .select('*, categories(name, slug)')
      .eq('is_active', true);
    
    if (error || !products) return JSON.stringify({ error: "Impossible de lire le menu" });

    // Filter products locally by query (name, category, description)
    const q = query.toLowerCase();
    const matches = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.categories && p.categories.name.toLowerCase().includes(q))
    ).slice(0, 10);

    return JSON.stringify(matches.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.base_price,
      category: p.categories?.name || 'Pizza',
      pizza_base: p.pizza_base
    })));
  },

  validate_address: async ({ address }) => {
    console.log(`[Tool] Validating delivery address: "${address}"`);
    // Check zones
    const { data: zones, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true);
    
    if (error || !zones) return JSON.stringify({ valid: false, message: "Impossible de vérifier les zones de livraison" });

    // Simple textual match for delivery zones
    const addr = address.toLowerCase();
    let matchedZone = null;
    
    for (const zone of zones) {
      const zoneName = zone.name.toLowerCase();
      // Grand-Couronne, Petit-Couronne, Moulineaux, Saint-Étienne-du-Rouvray, Rouen
      if (addr.includes(zoneName) || zoneName.split(' ').some(word => word.length > 3 && addr.includes(word))) {
        matchedZone = zone;
        break;
      }
    }

    if (matchedZone) {
      return JSON.stringify({
        valid: true,
        zone: matchedZone.name,
        min_order: matchedZone.min_order,
        delivery_fee: matchedZone.delivery_fee,
        estimated_time: matchedZone.estimated_time
      });
    }

    // Default match if no specific zone found (fallback to Grand-Couronne Centre)
    if (addr.includes("couronne") || addr.includes("76530")) {
      const defaultZone = zones.find(z => z.name.includes("Grand-Couronne")) || zones[0];
      return JSON.stringify({
        valid: true,
        zone: defaultZone.name,
        min_order: defaultZone.min_order,
        delivery_fee: defaultZone.delivery_fee,
        estimated_time: defaultZone.estimated_time,
        note: "Adresse estimée dans la zone par défaut"
      });
    }

    return JSON.stringify({
      valid: false,
      message: "Adresse en dehors de notre zone de livraison. Nous livrons uniquement sur Grand-Couronne, Petit-Couronne, Moulineaux, Saint-Étienne-du-Rouvray et Rouen Sud."
    });
  },

  create_order: async (args, callSid) => {
    console.log(`[Tool] Creating order for customer: ${args.customer_name}`);
    try {
      // Get next order number
      const { data: orderNumber, error: numberError } = await supabase.rpc('get_next_order_number');
      const finalOrderNumber = (!numberError && orderNumber) 
        ? orderNumber 
        : `TEL-${Math.floor(1000 + Math.random() * 9000)}`;

      // Calculate TVA (standard 10% for restaurant take out/delivery in France)
      const subtotal = Number(args.subtotal);
      const deliveryFee = Number(args.delivery_fee || 0);
      const total = Number(args.total);
      const tva = Number((total - deliveryFee) * 0.0909); // ~10% TTC equivalent (10/110)

      const orderData = {
        order_number: finalOrderNumber,
        order_type: args.order_type,
        status: 'pending',
        customer_name: args.customer_name,
        customer_phone: args.customer_phone,
        customer_address: args.delivery_address || null,
        customer_notes: args.customer_notes || "Commande passée par l'assistant téléphonique AI",
        subtotal: subtotal,
        tva: Number(tva.toFixed(2)),
        delivery_fee: deliveryFee,
        total: total,
        payment_method: args.payment_method || 'cb',
        items: args.items.map(item => ({
          id: item.product_id || 'manual-item',
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          calculatedPrice: item.price,
          customization: item.customization || {}
        }))
      };

      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`✅ Order created successfully: #${finalOrderNumber}`);

      // Associate order with the active call log
      if (callSid) {
        await supabase
          .from('voice_calls')
          .update({ order_id: newOrder.id, status: 'completed' })
          .eq('sid', callSid);
      }

      // Trigger Telegram notification
      try {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            orderNumber: finalOrderNumber,
            customerName: args.customer_name,
            customerPhone: args.customer_phone,
            customerAddress: args.delivery_address || null,
            customerNotes: args.customer_notes || null,
            orderType: args.order_type,
            paymentMethod: args.payment_method || 'cb',
            total: total,
            subtotal: subtotal,
            tva: Number(tva.toFixed(2)),
            deliveryFee: deliveryFee,
            items: orderData.items
          }
        });
      } catch (e) {
        console.warn("Telegram notification error:", e.message);
      }

      return JSON.stringify({ success: true, order_number: finalOrderNumber, total: total });
    } catch (err) {
      console.error("❌ Failed to create order in tool:", err.message);
      return JSON.stringify({ success: false, error: err.message });
    }
  },

  transfer_to_human: async ({ reason }, callSid) => {
    console.log(`[Tool] Triggering human transfer: "${reason}"`);
    if (callSid) {
      await supabase
        .from('voice_calls')
        .update({ status: 'transferred' })
        .eq('sid', callSid);
    }
    return JSON.stringify({ action: "transfer_initiated", message: "Le transfert d'appel vers un équipier physique est en cours." });
  }
};

// --- HTTP ENDPOINTS FOR TWILIO ---

// 1. Twilio Inbound Webhook
app.post('/incoming-call', async (req, res) => {
  const callSid = req.body.CallSid;
  const callerPhone = req.body.From;

  console.log(`📞 Inbound call received from: ${callerPhone} (CallSid: ${callSid})`);

  try {
    // Retrieve settings
    const settings = await getVoiceSettings();
    
    // Retrieve caller context
    const customerContext = await getCustomerContext(callerPhone);
    const customerName = customerContext ? customerContext.name : null;

    // Log call start in database
    await logCallStart(callSid, callerPhone, customerName);

    const twiml = new twilio.twiml.VoiceResponse();

    // Check mode: Webhook mode (Fallback) or Streaming mode
    if (settings.provider === 'vapi' || settings.provider === 'webhook') {
      // Turn-based voice webhook using Twilio Gather
      twiml.say({ language: 'fr-FR', voice: 'Google.fr-FR-Neural2-B' }, settings.greeting_message);
      twiml.gather({
        input: 'speech',
        action: `/handle-speech?callSid=${callSid}`,
        language: 'fr-FR',
        timeout: 4,
        speechTimeout: 'auto'
      });
      res.type('text/xml');
      res.send(twiml.toString());
      await appendToTranscript(callSid, 'assistant', settings.greeting_message);
    } else {
      // Real-time media streaming WebSocket connection
      twiml.say({ language: 'fr-FR', voice: 'Google.fr-FR-Neural2-B' }, "Connexion à Clara...");
      
      const connect = twiml.connect();
      // Establish WebSocket media stream
      const stream = connect.stream({
        url: `wss://${req.headers.host}/voice-stream`
      });
      stream.parameter({ name: 'callSid', value: callSid });
      stream.parameter({ name: 'callerPhone', value: callerPhone });

      res.type('text/xml');
      res.send(twiml.toString());
      await appendToTranscript(callSid, 'assistant', "Connexion à l'assistant Clara...");
    }
  } catch (err) {
    console.error("Error setting up incoming call:", err);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ language: 'fr-FR' }, "Désolé, notre service de réception automatique rencontre des difficultés. Je vous transfère au restaurant.");
    twiml.dial(process.env.TRANSFER_PHONE || '02 32 11 26 13');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// 2. Call Status Callback
app.post('/call-status', async (req, res) => {
  const callSid = req.body.CallSid;
  const duration = parseInt(req.body.CallDuration || '0', 10);
  const status = req.body.CallStatus; // 'completed', 'busy', 'no-answer', etc.
  const recordingUrl = req.body.RecordingUrl;

  console.log(`📞 Call ended: ${callSid}, Status: ${status}, Duration: ${duration}s`);
  
  // Update call status
  let finalStatus = 'completed';
  if (status === 'no-answer' || status === 'busy' || status === 'failed') {
    finalStatus = 'missed';
  }
  
  await logCallEnd(callSid, finalStatus, duration, recordingUrl);
  res.sendStatus(200);
});

// 3. Fallback Turn-based speech handler (TwiML webhook)
app.post('/handle-speech', async (req, res) => {
  const callSid = req.query.callSid;
  const userSpeech = req.body.SpeechResult;
  const callerPhone = req.body.From;

  console.log(`Speech received from Twilio call ${callSid}: "${userSpeech}"`);
  
  const twiml = new twilio.twiml.VoiceResponse();

  if (!userSpeech) {
    // If we didn't hear anything, ask again
    twiml.say({ language: 'fr-FR', voice: 'Google.fr-FR-Neural2-B' }, "Je ne vous ai pas bien entendu. Pourriez-vous répéter s'il vous plaît ?");
    twiml.gather({
      input: 'speech',
      action: `/handle-speech?callSid=${callSid}`,
      language: 'fr-FR',
      timeout: 4
    });
    res.type('text/xml');
    res.send(twiml.toString());
    return;
  }

  try {
    // Append to transcript
    await appendToTranscript(callSid, 'user', userSpeech);

    // Retrieve settings & prompt
    const settings = await getVoiceSettings();
    const customerContext = await getCustomerContext(callerPhone);

    // 1. Fetch current call log transcript
    const { data: call } = await supabase
      .from('voice_calls')
      .select('transcript')
      .eq('sid', callSid)
      .single();
    
    // Map dialogue array for the LLM
    const chatHistory = (call?.transcript || []).map(t => 
      `${t.role === 'user' ? 'Client' : 'Assistant Clara'}: ${t.text}`
    ).join('\n');

    // Build LLM prompt
    const finalPrompt = `${settings.system_prompt}
    
=== FAQ CONTEXT ===
${JSON.stringify(settings.faqs)}

=== CUSTOMER CONTEXT ===
${customerContext ? customerContext.history : 'Nouveau client.'}
Numéro de téléphone appelant : ${callerPhone}

=== DIALOG HISTORY ===
${chatHistory}

Réponds au client en français. Si tu dois appeler un outil, indique-le clairement sous forme de commande JSON dans ta réponse.`;

    // High speed LLM Call (Using OpenAI or Gemini Flash via HTTP)
    let aiResponse = "";
    
    if (settings.provider === 'openai') {
      const apiKey = settings.api_key || process.env.OPENAI_API_KEY;
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // fast fallback
          messages: [{ role: "system", content: finalPrompt }, { role: "user", content: userSpeech }],
          temperature: 0.4
        })
      });
      const resJson = await response.json();
      aiResponse = resJson.choices?.[0]?.message?.content || "Désolée, je ne vous ai pas compris.";
    } else {
      // Default: Gemini API (HTTP Flash)
      const apiKey = settings.api_key || process.env.GEMINI_API_KEY;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${finalPrompt}\n\nRéponse finale à l'utilisateur :` }] }]
        })
      });
      const resJson = await response.json();
      aiResponse = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "Désolée, je n'ai pas pu vous comprendre.";
    }

    console.log(`AI Response for call ${callSid}: "${aiResponse}"`);

    // Parse actions or tool calls (e.g. check tools match)
    if (aiResponse.includes("transfer_to_human") || aiResponse.toLowerCase().includes("transferer")) {
      await appendToTranscript(callSid, 'assistant', "Je vous transfère à un équipier. Veuillez patienter.");
      twiml.say({ language: 'fr-FR', voice: 'Google.fr-FR-Neural2-B' }, "Je vous transfère immédiatement à un équipier. Veuillez patienter.");
      twiml.dial(settings.transfer_phone_number);
      
      await supabase.from('voice_calls').update({ status: 'transferred' }).eq('sid', callSid);
      
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }

    // Standard conversational reply
    await appendToTranscript(callSid, 'assistant', aiResponse);
    twiml.say({ language: 'fr-FR', voice: 'Google.fr-FR-Neural2-B' }, aiResponse);
    
    // Loop back to gather more speech
    twiml.gather({
      input: 'speech',
      action: `/handle-speech?callSid=${callSid}`,
      language: 'fr-FR',
      timeout: 4
    });

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (err) {
    console.error("Error in fallback speech handler:", err);
    twiml.say({ language: 'fr-FR' }, "Je n'ai pas bien compris. Laissez-moi vous transférer au restaurant.");
    twiml.dial('02 32 11 26 13');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Setup HTTP server
const server = createServer(app);

// Setup WebSocket Server for Twilio Media Streams and Dashboard Mic Playground
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // WebSocket Route A: Twilio Media Stream
  if (url.pathname === '/voice-stream') {
    let streamSid = null;
    let callSid = null;
    let callerPhone = null;
    let openAiWs = null;
    let geminiWs = null;
    let settings = null;
    let currentCallRecord = null;
    
    console.log("[WS] Twilio Media Stream connected");

    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message);

        if (msg.event === 'connected') {
          console.log("[WS] Twilio stream connection established");
        } 
        
        else if (msg.event === 'start') {
          streamSid = msg.start.streamSid;
          callSid = msg.start.customParameters?.callSid;
          callerPhone = msg.start.customParameters?.callerPhone;
          
          console.log(`[WS] Twilio stream started. StreamSid: ${streamSid}, CallSid: ${callSid}`);
          
          // Load settings and context
          settings = await getVoiceSettings();
          const customerContext = await getCustomerContext(callerPhone);
          const customerName = customerContext ? customerContext.name : null;

          // Fetch or generate call log in DB
          const { data } = await supabase
            .from('voice_calls')
            .select('*')
            .eq('sid', callSid)
            .single();
          
          currentCallRecord = data;
          
          if (!currentCallRecord) {
            currentCallRecord = await logCallStart(callSid, callerPhone, customerName);
          }

          // Initial prompt with FAQ injection
          const finalPrompt = `${settings.system_prompt}
          
=== FAQ CONTEXT ===
${JSON.stringify(settings.faqs)}

=== CUSTOMER HISTORY & CONTEXT ===
${customerContext ? customerContext.history : 'Nouveau client.'}
Numéro de téléphone appelant : ${callerPhone}

Commence la conversation avec ce message d'accueil : "${settings.greeting_message}"`;

          // Connect to streaming AI provider
          if (settings.provider === 'openai') {
            const apiKey = settings.api_key || process.env.OPENAI_API_KEY;
            openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "OpenAI-Beta": "realtime=v1"
              }
            });

            openAiWs.on('open', () => {
              console.log("[WS] Connected to OpenAI Realtime WebSocket");
              // Send session config and prompts
              const configEvent = {
                type: "session.update",
                session: {
                  modalities: ["text", "audio"],
                  instructions: finalPrompt,
                  voice: settings.voice_id || "alloy",
                  input_audio_format: "g711_ulaw",
                  output_audio_format: "g711_ulaw",
                  turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500
                  }
                }
              };
              openAiWs.send(JSON.stringify(configEvent));
            });

            openAiWs.on('message', (data) => {
              const response = JSON.parse(data);
              
              // Handle incoming audio from OpenAI -> Send to Twilio
              if (response.type === 'response.audio.delta' && response.delta) {
                const twilioAudio = {
                  event: "media",
                  streamSid,
                  media: {
                    payload: response.delta
                  }
                };
                ws.send(JSON.stringify(twilioAudio));
              }

              // Log transcripts
              if (response.type === 'response.audio_transcript.done' && response.transcript) {
                console.log(`[Assistant Text]: ${response.transcript}`);
                appendToTranscript(callSid, 'assistant', response.transcript);
              }
              if (response.type === 'conversation.item.input_audio_transcription.completed' && response.transcript) {
                console.log(`[User Text]: ${response.transcript}`);
                appendToTranscript(callSid, 'user', response.transcript);
              }
            });
            
            openAiWs.on('error', (err) => console.error("[WS] OpenAI Socket Error:", err));
          } 
          
          else {
            // Default: Gemini Live API
            const apiKey = settings.api_key || process.env.GEMINI_API_KEY;
            const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
            geminiWs = new WebSocket(geminiUrl);

            geminiWs.on('open', () => {
              console.log("[WS] Connected to Gemini Live API WebSocket");
              // Send initial setup message
              const setupEvent = {
                setup: {
                  model: "models/gemini-2.0-flash",
                  generationConfig: {
                    responseModalities: ["audio"],
                    speechConfig: {
                      voiceConfig: {
                        prebuiltVoiceConfig: {
                          voiceName: "Aoede" // Warm female voice
                        }
                      }
                    }
                  },
                  systemInstruction: {
                    parts: [{ text: finalPrompt }]
                  }
                }
              };
              geminiWs.send(JSON.stringify(setupEvent));
            });

            geminiWs.on('message', async (data) => {
              const response = JSON.parse(data);

              // Handle server content (text & audio) from Gemini
              if (response.serverContent?.modelTurn?.parts) {
                for (const part of response.serverContent.modelTurn.parts) {
                  // Audio data
                  if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                    const base64Audio = part.inlineData.data;
                    const pcmBuffer = Buffer.from(base64Audio, 'base64');
                    // Downsample 24kHz PCM to 8kHz mu-law for Twilio
                    const twilioPayload = downsample24To8MuLaw(pcmBuffer);
                    
                    const twilioAudio = {
                      event: "media",
                      streamSid,
                      media: {
                        payload: twilioPayload
                      }
                    };
                    ws.send(JSON.stringify(twilioAudio));
                  }
                  
                  // Text transcription parts
                  if (part.text) {
                    console.log(`[Gemini Transcript segment]: ${part.text}`);
                    appendToTranscript(callSid, 'assistant', part.text);
                  }
                }
              }

              // Handle function/tool calls from Gemini Live
              if (response.toolCall?.functionCalls) {
                const functionResponses = [];
                for (const toolCall of response.toolCall.functionCalls) {
                  const name = toolCall.name;
                  const args = toolCall.args;
                  const id = toolCall.id;
                  
                  console.log(`[Gemini Tool Request]: ${name} with args:`, args);
                  
                  let result = "{}";
                  if (toolImplementations[name]) {
                    try {
                      result = await toolImplementations[name](args, callSid);
                    } catch (e) {
                      result = JSON.stringify({ error: e.message });
                    }
                  }

                  // If human transfer, trigger Twilio dial
                  if (name === 'transfer_to_human') {
                    // Send instruction to redirect Twilio call
                    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                    await client.calls(callSid).update({
                      twiml: `<Response><Say language="fr-FR" voice="Google.fr-FR-Neural2-B">Je vous transfère au gérant. Veuillez patienter.</Say><Dial>${settings.transfer_phone_number}</Dial></Response>`
                    });
                  }

                  functionResponses.push({
                    response: { output: { result } },
                    id
                  });
                }

                // Send tool responses back to Gemini
                const toolResponseEvent = {
                  toolResponse: {
                    functionResponses
                  }
                };
                geminiWs.send(JSON.stringify(toolResponseEvent));
              }
            });

            geminiWs.on('error', (err) => console.error("[WS] Gemini Socket Error:", err));
          }
        } 
        
        else if (msg.event === 'media') {
          // Inbound audio payload from Twilio (8kHz mu-law)
          const base64Payload = msg.media.payload;
          const mulawBuffer = Buffer.from(base64Payload, 'base64');
          
          if (settings?.provider === 'openai') {
            if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
              const audioEvent = {
                type: "input_audio_buffer.append",
                audio: base64Payload
              };
              openAiWs.send(JSON.stringify(audioEvent));
            }
          } 
          
          else {
            // Default: Gemini Live (requires 16kHz PCM audio)
            if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
              const pcm16Buffer = upsample8to16(mulawBuffer);
              const pcmBase64 = pcm16Buffer.toString('base64');
              
              const audioInputEvent = {
                realtimeInput: {
                  mediaChunks: [
                    {
                      mimeType: "audio/pcm;rate=16000",
                      data: pcmBase64
                    }
                  ]
                }
              };
              geminiWs.send(JSON.stringify(audioInputEvent));
            }
          }
        } 
        
        else if (msg.event === 'stop') {
          console.log(`[WS] Twilio stream stopped. StreamSid: ${streamSid}`);
          if (openAiWs) openAiWs.close();
          if (geminiWs) geminiWs.close();
        }
      } catch (err) {
        console.error("[WS] Error processing Twilio message:", err);
      }
    });

    ws.on('close', () => {
      console.log("[WS] Twilio media connection closed");
      if (openAiWs) openAiWs.close();
      if (geminiWs) geminiWs.close();
    });
  } 
  
  // WebSocket Route B: Browser Mic Playground (/test-agent)
  else if (url.pathname === '/test-agent') {
    let openAiWs = null;
    let geminiWs = null;
    let settings = null;
    const testCallSid = `TEST-${Math.floor(100000 + Math.random() * 900000)}`;

    console.log("[WS] Browser mic playground connected");

    ws.on('message', async (message) => {
      try {
        // First message can be configuration, others are raw 16kHz PCM audio buffers from user mic
        if (typeof message === 'string') {
          const config = JSON.parse(message);
          if (config.type === 'start') {
            settings = await getVoiceSettings();
            
            // Log test call start
            await logCallStart(testCallSid, 'PLAYGROUND', 'Testeur Admin');
            await appendToTranscript(testCallSid, 'assistant', "Démarrage du test playground...");

            const finalPrompt = `${settings.system_prompt}
            
=== FAQ CONTEXT ===
${JSON.stringify(settings.faqs)}

=== CUSTOMER HISTORY & CONTEXT ===
Historique : Compte d'administration de test.

Commence la conversation avec ce message d'accueil : "${settings.greeting_message}"`;

            // Connect to Gemini / OpenAI
            if (settings.provider === 'openai') {
              const apiKey = settings.api_key || process.env.OPENAI_API_KEY;
              openAiWs = new WebSocket(`wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
                headers: {
                  "Authorization": `Bearer ${apiKey}`,
                  "OpenAI-Beta": "realtime=v1"
                }
              });

              openAiWs.on('error', (err) => {
                console.error("[WS-Test] OpenAI Connection Error:", err.message || err);
                ws.send(JSON.stringify({ type: 'status', message: `Erreur OpenAI : ${err.message || 'Échec'}` }));
              });

              openAiWs.on('close', (code, reason) => {
                console.log(`[WS-Test] OpenAI Connection Closed. Code: ${code}, Reason: ${reason.toString() || 'No reason'}`);
                ws.send(JSON.stringify({ type: 'status', message: `Connexion OpenAI fermée` }));
              });

              openAiWs.on('open', () => {
                ws.send(JSON.stringify({ type: 'status', message: 'Connecté à OpenAI Realtime' }));
                const configEvent = {
                  type: "session.update",
                  session: {
                    modalities: ["text", "audio"],
                    instructions: finalPrompt,
                    voice: settings.voice_id || "alloy",
                    input_audio_format: "pcm16",
                    output_audio_format: "pcm16",
                    turn_detection: { type: "server_vad" }
                  }
                };
                openAiWs.send(JSON.stringify(configEvent));
              });

              openAiWs.on('message', (data) => {
                const response = JSON.parse(data);
                
                // Return audio payload to browser
                if (response.type === 'response.audio.delta' && response.delta) {
                  ws.send(JSON.stringify({ type: 'audio', payload: response.delta }));
                }
                
                // Transcripts sync
                if (response.type === 'response.audio_transcript.done' && response.transcript) {
                  ws.send(JSON.stringify({ type: 'transcript', role: 'assistant', text: response.transcript }));
                  appendToTranscript(testCallSid, 'assistant', response.transcript);
                }
                if (response.type === 'conversation.item.input_audio_transcription.completed' && response.transcript) {
                  ws.send(JSON.stringify({ type: 'transcript', role: 'user', text: response.transcript }));
                  appendToTranscript(testCallSid, 'user', response.transcript);
                }
              });
            } 
            
            else {
              // Gemini Live
              const apiKey = settings.api_key || process.env.GEMINI_API_KEY;
              console.log(`[WS-Test] Connecting to Gemini Live API with key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'NONE'}`);
              const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
              geminiWs = new WebSocket(geminiUrl);

              geminiWs.on('error', (err) => {
                console.error("[WS-Test] Gemini Connection Error:", err.message || err);
                ws.send(JSON.stringify({ type: 'status', message: `Erreur Gemini : ${err.message || 'Échec'}` }));
              });

              geminiWs.on('close', (code, reason) => {
                console.log(`[WS-Test] Gemini Connection Closed. Code: ${code}, Reason: ${reason.toString() || 'No reason'}`);
                ws.send(JSON.stringify({ type: 'status', message: `Connexion Gemini fermée (${code})` }));
              });

              geminiWs.on('open', () => {
                ws.send(JSON.stringify({ type: 'status', message: 'Connecté à Gemini Live API' }));
                const setupEvent = {
                  setup: {
                    model: "models/gemini-2.0-flash",
                    generationConfig: {
                      responseModalities: ["audio"],
                      speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: "Aoede" }
                        }
                      }
                    },
                    systemInstruction: {
                      parts: [{ text: finalPrompt }]
                    }
                  }
                };
                geminiWs.send(JSON.stringify(setupEvent));
              });

              geminiWs.on('message', async (data) => {
                const response = JSON.parse(data);

                if (response.serverContent?.modelTurn?.parts) {
                  for (const part of response.serverContent.modelTurn.parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                      // Return raw 24kHz PCM back to browser (browser handles audio synthesis)
                      ws.send(JSON.stringify({ type: 'audio', payload: part.inlineData.data }));
                    }
                    if (part.text) {
                      ws.send(JSON.stringify({ type: 'transcript', role: 'assistant', text: part.text }));
                      appendToTranscript(testCallSid, 'assistant', part.text);
                    }
                  }
                }

                if (response.toolCall?.functionCalls) {
                  const functionResponses = [];
                  for (const toolCall of response.toolCall.functionCalls) {
                    const name = toolCall.name;
                    const args = toolCall.args;
                    const id = toolCall.id;
                    
                    ws.send(JSON.stringify({ type: 'status', message: `Exécution de l'outil ${name}...` }));
                    
                    let result = "{}";
                    if (toolImplementations[name]) {
                      try {
                        result = await toolImplementations[name](args, testCallSid);
                      } catch (e) {
                        result = JSON.stringify({ error: e.message });
                      }
                    }

                    ws.send(JSON.stringify({ type: 'tool_output', name, output: result }));

                    functionResponses.push({
                      response: { output: { result } },
                      id
                    });
                  }

                  const toolResponseEvent = {
                    toolResponse: { functionResponses }
                  };
                  geminiWs.send(JSON.stringify(toolResponseEvent));
                }
              });
            }
          }
        } 
        
        else {
          // Raw binary audio data (PCM 16-bit, 16kHz from browser mic)
          const base64Audio = message.toString('base64');
          
          if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
            openAiWs.send(JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64Audio
            }));
          } 
          
          else if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.send(JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64Audio
                  }
                ]
              }
            }));
          }
        }
      } catch (err) {
        console.error("[WS-Test] Error:", err);
      }
    });

    ws.on('close', () => {
      console.log("[WS-Test] Mic connection closed");
      logCallEnd(testCallSid, 'completed', 0);
      if (openAiWs) openAiWs.close();
      if (geminiWs) geminiWs.close();
    });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Twin Pizza Voice Receptionist running on http://localhost:${PORT}`);
});
