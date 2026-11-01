import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';

export default function PrivacyPage() {
  return <article className="mx-auto max-w-3xl space-y-6 py-3 sm:py-7">
    <header className="space-y-3">
      <p className="page-eyebrow">The Lakes Golf League</p>
      <h1 className="page-heading">Privacy policy</h1>
      <p className="text-sm leading-6 text-charcoal-600">Updated November 1, 2026. This page explains how the Lakes League app uses information to run the league, connect player accounts, and record payments.</p>
    </header>
    <Card className="content-card">
      <CardHeader className="flex-row items-center gap-3 pb-2">
        <ShieldCheck className="size-5 shrink-0 text-forest-900" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Player and league information</h2>
      </CardHeader>
      <CardContent className="space-y-4 pt-3 text-sm leading-7 text-charcoal-600">
        <p>The public league pages show player names, handicaps, league membership type, recurring tee-time availability, published schedules and teams, scores, standings, and recorded prize awards. These sporting records support scheduling and the league’s playing history.</p>
        <p>Registration applications (name, verified email, phone, handicap ID and index, availability and membership choice), player email addresses and phone numbers, account-to-player links, individual attendance responses, and payment history are kept behind account access controls. Players can access their own private records, and authorized commissioners can access the records needed to administer the league. The stored preference records are private; the recurring tee-time availability they contain is also included in the public roster.</p>
      </CardContent>
    </Card>
    <Card className="content-card">
      <CardHeader className="pb-2"><h2 className="text-lg font-semibold">Sign-in and browser storage</h2></CardHeader>
      <CardContent className="space-y-4 pt-3 text-sm leading-7 text-charcoal-600">
        <p>Supabase manages email and password sign-in and Google sign-in. When you choose Google, Google supplies your basic profile and email to the sign-in service. The app uses your verified email to connect your account to a uniquely matching existing player record, preserving that player’s scores, winnings, and handicap.</p>
        <p>Your browser stores the sign-in session so you can stay signed in. It also keeps a temporary reminder while you finish password setup or recovery. Use Sign out when you finish on a shared device.</p>
      </CardContent>
    </Card>
    <Card className="content-card">
      <CardHeader className="pb-2"><h2 className="text-lg font-semibold">Payments and receipts</h2></CardHeader>
      <CardContent className="space-y-4 pt-3 text-sm leading-7 text-charcoal-600">
        <p>Online payments use Stripe-hosted Checkout. Card numbers, bank credentials, and other payment credentials are entered with Stripe and are not stored in the app’s league database.</p>
        <p>The app keeps limited payment records such as the player and order, amount, currency, status, Stripe reference IDs, receipt links, and refund status. These records support player payment history and commissioner reconciliation. Manual payment records are labeled separately from Stripe-confirmed transactions. Recording winnings does not automatically send a payout.</p>
      </CardContent>
    </Card>
    <Card className="content-card">
      <CardHeader className="pb-2"><h2 className="text-lg font-semibold">Services, retention, and questions</h2></CardHeader>
      <CardContent className="space-y-4 pt-3 text-sm leading-7 text-charcoal-600">
        <p>The app uses Vercel for hosting, Supabase for accounts and league data, Google when you choose Google sign-in, and Stripe for online payment processing. Those services process the information needed to provide their functions.</p>
        <p>League records are retained for league operations, payment reconciliation, and playing history. To request a contact correction, discuss your records, or get help with an account, contact the commissioner. Requests are reviewed individually, including any need to preserve historical or payment records.</p>
        <Button asChild variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal break-all text-left"><a href="mailto:justshook@gmail.com"><Mail className="size-4 shrink-0" aria-hidden="true" />justshook@gmail.com</a></Button>
      </CardContent>
    </Card>
    <Button asChild variant="ghost" className="px-0 text-charcoal-600"><Link to="/league"><ArrowLeft className="size-4" aria-hidden="true" />Back to the league</Link></Button>
  </article>;
}
