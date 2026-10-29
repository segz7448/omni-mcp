# Official payment rails only

These are generated API adapters and integration notes, not working consumer-wallet access or permission to move money. No credentials, transactions, sandbox payments, charges, payouts or wallet transfers were tested. All payment mutations are disabled unless separately allowlisted locally; an allowlist is not transaction consent.

## PayPal

Twelve API specifications were downloaded from PayPal's official Apache-2.0 repository at a pinned commit. Orders, payments, payouts, subscriptions, product catalogs, webhooks, reporting, tracking, vault tokens, partner referrals, disputes and payment-experience APIs are represented, subject to skipped-operation reports. Not every PayPal API/feature is covered. Invoicing v2 was excluded because its published regex dialect is not accepted by the current schema validator; validation was not weakened to hide the problem.

Default generated destination is PayPal's sandbox API, not production. Merchant/developer account setup, access tokens, scopes, eligibility and provider approval may be needed. Processing fees and provider terms apply. OAuth token acquisition/refresh and full business workflows are not implemented.

## Venmo connector (PayPal Checkout rails)

Venmo has no public API of its own. The only official way for a developer to take Venmo payments is through PayPal: a PayPal business account takes Venmo as a payment source on Orders v2. The `venmo` connector (`connectors/venmo.json`) is that, and nothing else. It is built by `npm run build:venmo` from PayPal's official specs at the same pinned commit as the generated adapters, keeping 11 operations and narrowing the request schemas so the payment source can only be `venmo`.

Operations (PayPal Orders v2 and Payments v2):

| Tool | HTTP | Type |
|---|---|---|
| `venmo__create_order` | POST /v2/checkout/orders (payment_source.venmo required) | write |
| `venmo__confirm_order_payment_source` | POST /v2/checkout/orders/{id}/confirm-payment-source (venmo required) | write |
| `venmo__get_order` | GET /v2/checkout/orders/{id} | read |
| `venmo__authorize_order` | POST /v2/checkout/orders/{id}/authorize | write |
| `venmo__capture_order` | POST /v2/checkout/orders/{id}/capture | write |
| `venmo__get_authorization` | GET /v2/payments/authorizations/{authorization_id} | read |
| `venmo__capture_authorization` | POST /v2/payments/authorizations/{authorization_id}/capture | write |
| `venmo__void_authorization` | POST /v2/payments/authorizations/{authorization_id}/void | write |
| `venmo__get_capture` | GET /v2/payments/captures/{capture_id} | read |
| `venmo__refund_capture` | POST /v2/payments/captures/{capture_id}/refund | write |
| `venmo__get_refund` | GET /v2/payments/refunds/{refund_id} | read |

Use it with your own PayPal REST app credentials:

```sh
export PAYPAL_ACCESS_TOKEN="$(PAYPAL_CLIENT_ID=... PAYPAL_CLIENT_SECRET=... node src/cli.js paypal-token)"
node src/cli.js serve --config omni.config.venmo.example.json
```

`paypal-token` exchanges your client id and secret for a short-lived token against the sandbox (add `--base-url https://api-m.paypal.com` for production, and set `baseUrl` in your config to match). Tokens expire, so re-run it. Only the four read operations are enabled until you list payment operations in `allowWriteOperations`. That gate is not payer consent.

How a payment actually happens: the server creates an order with a Venmo payment source. The payer must then approve it in the Venmo app, which PayPal drives through its JavaScript SDK in a browser or mobile app. This repo does not include that frontend. Capture only succeeds after the payer approves. PayPal's documentation limits Venmo to US payers and USD.

What is and is not proven:

- Local contract tests (`test/venmo.test.js`) run the real gateway against a local stand-in server and check exact paths, methods, headers, bodies, token redaction, the venmo-only schema and the write gate. The stand-in is not PayPal.
- `npm run verify:venmo` calls the real PayPal sandbox with deliberately invalid credentials. PayPal answered HTTP 401 on both the Orders endpoint and the token endpoint, which shows the endpoints and request shapes are reachable ([evidence](venmo-verification.json)).
- **No authenticated order, Venmo approval, capture or refund has been run**, because that needs your PayPal sandbox credentials and a Venmo sandbox payer.
- Braintree's Venmo route is a different, nonce-based API and is not implemented.

No consumer balance scraping, private Venmo endpoints, P2P-send automation, reverse engineering, or bypassing user approval is included.

## Square and Cash App Pay

Square's canonical official api.json is pinned to a commit and converted from Swagger 2.0. Generated operations include its Payments API, but this snapshot is not proof of complete current API coverage. Sandbox is the configured destination. The snapshot does not include dedicated Cash App schema details, so Cash App Pay is cataloged as a documented payment-method route, not claimed as a separately generated Cash App API.

Official Cash App Pay integration uses Square's Web Payments SDK to get a buyer-authorized one-time payment token, then Square Payments API CreatePayment with that token as source_id. It is US-only under the cited documentation and cannot store a buyer's Cash App account on file. Seller/developer setup, access token, app/location identifiers and frontend consent/tokenization are required. The frontend is not implemented. No Cash App consumer login, wallet balance, consumer P2P send or unofficial API is supported.

## Sources

- https://github.com/paypal/paypal-rest-api-specifications
- https://developer.paypal.com/venmo
- https://developer.paypal.com/api/rest/integration/orders-api/api-use-cases/standard/
- https://github.com/square/connect-api-specification
- https://developer.paypal.com/docs/checkout/pay-with-venmo/
- https://developer.squareup.com/docs/payments-api/take-payments/cash-app-payments
- https://developer.squareup.com/docs/web-payments/add-cash-app-pay

Pinned spec URLs/hashes, generated counts and skip reasons are in presets.json and generated/report.json. Generated API manifests are not authenticated provider verification.
