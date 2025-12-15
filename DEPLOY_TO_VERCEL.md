# 🚀 Deploying Twin Pizza to Vercel (FREE)

## Step 1: Push Your Code to GitHub
Make sure your latest changes are committed and pushed:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push
```

## Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login with GitHub
2. Click **"Add New Project"**
3. Select your **twinbite-order** repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add **Environment Variables** (click "Environment Variables"):
   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_PROJECT_ID` | `pdrhquzlbknihemiirbe` |
   | `VITE_SUPABASE_URL` | `https://pdrhquzlbknihemiirbe.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | *(your anon key from .env)* |

6. Click **"Deploy"** 🎉

## Step 3: Connect Your Domain (Ionos)
1. In Vercel, go to **Settings > Domains**
2. Add your domain (e.g., `twinpizza.fr`)
3. Vercel will give you DNS records to add in Ionos:
   - Usually an **A record** pointing to `76.76.19.19`
   - Or a **CNAME** record pointing to `cname.vercel-dns.com`
4. In Ionos:
   - Go to **Domains & SSL > DNS Settings**
   - Add the records Vercel provides
5. Wait 10-30 minutes for DNS propagation

## Step 4: Update Supabase Settings
In your Supabase dashboard (https://supabase.com/dashboard):

1. Go to **Settings > API**
2. Under **"URL Configuration"**, make sure your new domain is allowed

3. Go to **Edge Functions > create-checkout**
4. Update the allowed origins for CORS if needed

## 🔒 Security Checklist

### ✅ Already Secure:
- Stripe Secret Key stored in Supabase Edge Functions (not in code)
- Supabase Service Role Key only in Edge Functions
- `.env` file added to `.gitignore`

### ⚠️ Recommended:
1. **Enable Row Level Security (RLS)** on all Supabase tables
2. In Supabase Dashboard > Authentication > URL Configuration:
   - Add your Vercel URL to allowed redirect URLs
   - Remove the Lovable URL after migration

### 🔐 Supabase Secrets (Already configured):
Your Edge Functions use these secrets (stored securely in Supabase):
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - For webhook verification
- `SUPABASE_SERVICE_ROLE_KEY` - For database access

## Step 5: Cancel Lovable Subscription
Once your site is working on Vercel:
1. Test everything thoroughly
2. Go to Lovable settings
3. Cancel your subscription

---

## 💰 Cost Comparison

| Service | Lovable | Vercel (Free) |
|---------|---------|---------------|
| Hosting | €15-30/mo | **FREE** |
| Domain | Included | ~€10/year (Ionos) |
| SSL | Included | **FREE** |
| Supabase | Same | Same (Free tier) |

**Annual Savings: ~€150-300!** 🎉
