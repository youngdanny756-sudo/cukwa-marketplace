# CUKWA Marketplace

CUKWA is a Uganda-focused marketplace for posting and browsing classified ads.

## What the app can do

- Create an account and sign in.
- Post an ad with multiple photos, a category, price, contact number, location, and description, or save it as a draft.
- Manage your own ads from **My listings**, including editing, marking sold, renewing, or removing them.
- Browse approved ads, search and filter by category or location, save favorites, chat with sellers, and view seller profiles and ratings.
- Report or block sellers and report listings.
- Apply for seller verification.
- Let admins approve or reject ads, review seller-verification requests, and review listing reports and suspicious-listing flags.

Ads submitted for approval stay private from other marketplace users until an admin approves them. Sellers can still see their own ads in **My listings**.

## Inbox, notifications, moderation history, and insights

For a complete buyer/seller inbox, in-app notifications, listing view counts, seller-report moderation, and moderator action history:

1. Open the Supabase project’s **SQL Editor**.
2. Run `supabase/feature-upgrades.sql` after the existing products table, `supabase/marketplace.sql`, and `supabase/chat.sql` are set up.
3. Reload the CUKWA app after the script completes.

The migration adds row-level security policies for notifications and listing views, enables realtime notifications, and creates database triggers for new-message and listing-approval/rejection notifications. It also adds moderator-note fields to both report types and records report status/note changes in an admin-only history table.

Seller insights count distinct signed-in buyers who opened an approved listing and distinct buyers who sent at least one chat message about that listing. These counts do not include anonymous visitors or repeated views from the same account.

The marketplace now supports price bounds, newest/price sorting, and incremental loading. Seller pages show written reviews, verification guidance, and phone/WhatsApp actions. Listing pages offer native sharing or a copy-link fallback on browsers without the Share API.

## Supabase setup

Run `supabase/marketplace.sql` in the Supabase SQL Editor after the existing products table and `supabase/chat.sql` setup. This creates the product-image storage bucket and access rules required for ad photos, and protects admin/verification fields from being changed by ordinary users. If the database was configured before, run this updated script again to apply those changes.

## Assigning an admin

1. Have the person create and confirm their account.
2. In Supabase, open **SQL Editor** and run this query after replacing the email with the exact account email:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (
     select id from auth.users where email = 'admin@example.com'
   );
   ```

3. Ask them to sign out and back in, then open `/admin` on the deployed site.

Only assign this role to someone you trust: admins can approve listings, review reports, and manage seller verification. Do not give users the Supabase service-role key or let them change their own `role` from the app.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
