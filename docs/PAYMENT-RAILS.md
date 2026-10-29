# Official payment rails only

These are generated API adapters and integration notes, not working consumer-wallet access or permission to move money. No credentials, transactions, sandbox payments, charges, payouts or wallet transfers were tested. All payment mutations are disabled unless separately allowlisted locally; an allowlist is not transaction consent.

## PayPal

Twelve API specifications were downloaded from PayPal's official Apache-2.0 repository at a pinned commit. Orders, payments, payouts, subscriptions, product catalogs, webhooks, reporting, tracking, vault tokens, partner referrals, disputes and payment-experience APIs are represented, subject to skipped-operation reports. Not every PayPal API/feature is covered. Invoicing v2 was excluded because its published regex dialect is not accepted by the current schema validator; validation was not weakened to hide the problem.

Default generated destination is PayPal's sandbox API, not production. Merchant/developer account setup, access tokens, scopes, eligibility and provider approval may be needed. Processing fees and provider terms apply. OAuth token acquisition/refresh and full business workflows are not implemented.

## Venmo through PayPal Checkout

Venmo is represented as a documented merchant payment method in PayPal Checkout, not a standalone consumer Venmo API. Official documentation requires US merchants and US consumers, USD, the JavaScript SDK and payer authorization in the Venmo app. The generated Orders schema includes Venmo payment-source fields. A complete frontend checkout/payer approval flow is not built here. Braintree is another official route but is not implemented in this repo.

No consumer balance scraping, private Venmo endpoints, P2P-send automation, reverse engineering, or bypassing user approval is included.

## Square and Cash App Pay

Square's canonical official api.json is pinned to a commit and converted from Swagger 2.0. Generated operations include its Payments API, but this snapshot is not proof of complete current API coverage. Sandbox is the configured destination. The snapshot does not include dedicated Cash App schema details, so Cash App Pay is cataloged as a documented payment-method route, not claimed as a separately generated Cash App API.

Official Cash App Pay integration uses Square's Web Payments SDK to get a buyer-authorized one-time payment token, then Square Payments API CreatePayment with that token as source_id. It is US-only under the cited documentation and cannot store a buyer's Cash App account on file. Seller/developer setup, access token, app/location identifiers and frontend consent/tokenization are required. The frontend is not implemented. No Cash App consumer login, wallet balance, consumer P2P send or unofficial API is supported.

## Sources

- https://github.com/paypal/paypal-rest-api-specifications
- https://github.com/square/connect-api-specification
- https://developer.paypal.com/docs/checkout/pay-with-venmo/
- https://developer.squareup.com/docs/payments-api/take-payments/cash-app-payments
- https://developer.squareup.com/docs/web-payments/add-cash-app-pay

Pinned spec URLs/hashes, generated counts and skip reasons are in presets.json and generated/report.json. Generated API manifests are not authenticated provider verification.
