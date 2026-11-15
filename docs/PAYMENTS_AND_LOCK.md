# Locking the app and manual payments
Owner: ASARTUN STORE LIMITED. Needs migrations 001–006 and `010_manual_payments_and_lock.sql`.

## Taƙaitawa (Hausa)
- Admin yana kulle app ko wasu darussa a **Admin → Premium & payments → 🔒 Lock the app**. Darussan da ba a ɗora wa “Free” ba suna zama ⭐ Premium: yara suna ganin makulli.
- Yaro ko iyaye suna biya a wajen app (banki, kuɗi hannu, mobile money). Sai su danna **“Na biya”** su rubuta lambar biyan kuɗi, ko su rubuta **lambar buɗewa** da admin ya ba su.
- Admin yana duba kuɗin ya shiga, sannan ya danna **Approve** (ko ya ƙirƙiri lambar buɗewa). Darussan suna buɗewa nan take.
- Babu katin banki ko PIN a cikin app.

## How it works
**Admin (Super Admin) → Premium & payments**
1. **🔒 Lock the app:** tick the missions that stay free (free trial). All others become ⭐ Premium. “Lock everything” / “Open everything” buttons. A single mission can also be switched in its Details tab.
2. **💰 Plans & how to pay:** write the payment instructions (Hausa + English), your account details and WhatsApp number; edit the three plans (1 month, 3 months, 1 year), set the price and switch them on.
3. **💳 Payment requests:** when a family taps “I have paid”, the request appears here with the learner nickname, plan, amount and the reference they wrote. Check the money in your account, then **Approve** (premium starts at once and is added after any premium they still have) or **Reject** with a reason.
4. **🎟️ Activation codes:** after cash / transfer / agent payments, create 1–200 one-time codes (e.g. 30 days) and send them. The family types the code in the app.
5. **⭐ Who has premium:** every premium, with an **End now** button. You can also give premium from Learners or Schools & companies.

**Child / parent (learner app)**
- Locked missions show ⭐ Premium; tapping opens the unlock screen: plans and prices, how to pay, WhatsApp button, “I have paid” form, activation code box, and the status of earlier requests.
- The screen checks every 20 seconds: when you approve, the lessons open without any other step.
- The screen tells children never to type card numbers, PINs or passwords and to ask a parent.

## Security
- The lock is enforced by the **database** (migration 006 row-level security): locked lesson steps, questions, pictures and audio cannot be read without an active premium, even with a modified app.
- Because of this, when Supabase is configured the app **no longer falls back to the built-in missions** (that would let someone bypass the lock by blocking the network). Offline phones use the last copy they downloaded themselves (up to 7 days old). A phone that never connected shows “Internet is needed the first time”.
- Codes are 10 random characters, one use, 10 attempts per hour per learner. Payment requests: max 3 waiting per learner. Only a Super Admin can approve, create codes or lock.
- Every approval, plan change, code and lock change is written to the activity log.

## Setup
1. Run `supabase/migrations/010_manual_payments_and_lock.sql` (safe to run twice).
2. Admin → Premium & payments → **Plans & how to pay**: fill your account details, set prices, switch plans on.
3. **Lock the app**: choose the free trial missions and press Save.
4. Test with a test learner: tap a locked mission → “I have paid” → approve it in the admin → the mission opens. Also test an activation code.
No new packages or environment variables.

## Honest limits
- **Manual means you check:** the app cannot see your bank. Approve only after the money has really arrived. A wrong reference or a fake request costs nothing until you approve.
- Locking affects lessons, not the app shell: children can still open the app, see the locked cards, Settings and the unlock screen.
- Someone who already opened a lesson keeps it open until they leave it; media links last up to 1 hour. The offline copy lasts up to 7 days.
- No automatic reminders when premium is about to end; renewals are the same process again. Online payment (Paystack / Flutterwave) is not connected. It needs a server function with secret keys and a payment webhook, and the tables here are ready for it. Tell me when you want it.
- I could not run the SQL or the app here (no internet). Please test as described.
