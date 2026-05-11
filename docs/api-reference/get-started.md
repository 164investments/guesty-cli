# Get Started

This guide walks you through the initial setup, authentication, and how to make your first API call.

> ❗️ Partners & Channels (OTAs)
>
> If you are a Guesty Marketplace or Channel (OTA) Partner, **please refrain from using the Open API** and contact <Anchor label="partnerships@guesty.com" target="_blank" href="mailto:partnerships@guesty.com">[partnerships@guesty.com](mailto:partnerships@guesty.com)</Anchor>.

<br />

## Overview

The Open API exposes a RESTful interface to access and manage your Guesty account data. This includes listings, reservations, guests, and more.

* **Base URL**: `https://open-api.guesty.com/v1`
* **Format**: JSON over HTTPS
* **Authentication**: Bearer token (OAuth2)

<br />

## Prerequisites

* A Guesty account with API access enabled
* Admin permissions on your Guesty account
* Basic knowledge of HTTP and JSON
* A tool for making HTTP requests (e.g., Postman, curl, or custom code)

<br />

## Step 1: Obtain API Credentials

To get started, you'll need a Client ID and Client Secret:

1. Log in to your Guesty dashboard.
2. Navigate to **Integrations > API & Webhooks**.
3. Create a new API application.
4. Copy your **Client ID** and **Client Secret**.

<br />

## Step 2: Authenticate and Get an Access Token

**Note**: Guesty allows up to five access tokens per API key within a 24-hour period. Each token remains valid for 24 hours. To avoid disruptions, you should store and reuse the issued token until it expires or is invalidated. Refresh the token only when the previous one has expired or is invalidated.

<br />

### Recommended Strategy:

* Store the token securely in memory, a database, or a cache.
* Track the token's expiration timestamp.
* Automatically request a new token when it's close to expiry (e.g., within 5 minutes).
* Avoid requesting a new token on every API call to stay within the usage limit.

<br />

### Token storage example

```javascript
let tokenCache = {
  token: null,
  expiresAt: null
};

async function getToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const response = await fetch('https://open-api.guesty.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET'
    })
  });

  const data = await response.json();
  tokenCache.token = data.access_token;
  tokenCache.expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
  return tokenCache.token;
}
```

```python
import time
import requests

token_cache = {
    'token': None,
    'expires_at': 0
}

def get_token():
    now = time.time()
    if token_cache['token'] and token_cache['expires_at'] > now:
        return token_cache['token']

    response = requests.post('https://open-api.guesty.com/oauth2/token', json={
        'clientId': 'YOUR_CLIENT_ID',
        'clientSecret': 'YOUR_CLIENT_SECRET'
    })
    data = response.json()
    token_cache['token'] = data['access_token']
    token_cache['expires_at'] = now + 86400  # 24 hours in seconds
    return token_cache['token']
```

```php
class TokenCache {
    private static $token = null;
    private static $expiresAt = 0;

    public static function getToken() {
        if (self::$token && self::$expiresAt > time()) {
            return self::$token;
        }

        $payload = json_encode([
            'clientId' => 'YOUR_CLIENT_ID',
            'clientSecret' => 'YOUR_CLIENT_SECRET'
        ]);

        $ch = curl_init('https://open-api.guesty.com/oauth2/token');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        curl_close($ch);

        $data = json_decode($response, true);
        self::$token = $data['access_token'];
        self::$expiresAt = time() + 86400; // 24 hours
        return self::$token;
    }
}
```

<br />

Use your credentials to obtain a Bearer token:

<br />

**HTTP Request**:

```http
POST https://open-api.guesty.com/oauth2/token
Content-Type: application/json

{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET"
}
```

<br />

**Sample Response**:

```json
{
  "access_token": "YOUR_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

<br />

Use the `access_token` in the `Authorization` header of all subsequent requests.

<br />

### Request token example

```node
const axios = require('axios');

async function getToken() {
  const response = await axios.post('https://open-api.guesty.com/oauth2/token', {
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET'
  });
  console.log(response.data.access_token);
}

getToken();
```

```python
import requests

response = requests.post(
    'https://open-api.guesty.com/oauth2/token',
    json={
        'clientId': 'YOUR_CLIENT_ID',
        'clientSecret': 'YOUR_CLIENT_SECRET'
    }
)

print(response.json()['access_token'])

```

```curl
curl -X POST https://open-api.guesty.com/oauth2/token \
  -H "Content-Type: application/json" \
  -d '{"clientId":"YOUR_CLIENT_ID","clientSecret":"YOUR_CLIENT_SECRET"}'

```

```php
<?php
$payload = json_encode([
    'clientId' => 'YOUR_CLIENT_ID',
    'clientSecret' => 'YOUR_CLIENT_SECRET'
]);

$ch = curl_init('https://open-api.guesty.com/oauth2/token');
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type:application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
echo $data['access_token'];

```

<br />

> ❗️ Safeguarding Access
>
> Do not share generated tokens with anyone outside your organization that you do not trust. Giving third parties access to Guesty's Open API can harm your account and business. Guesty is not responsible for any damage or errors in your account caused by unauthorized use of these tokens. **This is especially important for third parties that change price and availability settings**. To see a list of trusted third-party solutions, visit the <Anchor label="Guesty Marketplace" target="_blank" href="https://help.guesty.com/hc/en-gb/articles/9371171208733-Marketplace-overview">Guesty Marketplace</Anchor>. If you are unsure what to do, contact your dedicated Account Manager or the [Customer Experience team](https://help.guesty.com/hc/en-gb/articles/9370047984413-Contacting-Customer-Experience) .

<br />

## Step 3: Make Your First API Call

> 🚧 Permission Error
>
> If you receive the "*You don't have permission to access, please contact Guesty support*" error message when performing a request, make sure that the authorization header parameter includes "**Bearer**" before the access token (e.g., "Bearer \{token}"). If the problem continues, please reach out to [support](https://help.guesty.com/hc/en-gb/articles/9370047984413-Contacting-Customer-Experience).

<br />

As a simple test, fetch a list of your listings:

<br />

**Request**:

```http
GET https://open-api.guesty.com/v1/listings
Authorization: Bearer YOUR_ACCESS_TOKEN
```

<br />

**Response**:

```json
{
  "results": [
    {
      "id": "1234567890",
      "title": "Modern Loft in Downtown",
      "status": "active"
    },
    ...
  ]
}
```

<br />

## Best Practices

* **Use pagination**: Many endpoints return paginated results. Use `limit` and `skip` or  `cursor` query parameters.
* **Rate limits**: Respect rate limits to avoid throttling.
* **Error handling**: Handle HTTP status codes and API-specific errors gracefully.

<br />

### Traffic Management Strategies

To prevent hitting API [Rate Limits](https://open-api-docs.guesty.com/docs/rate-limits), consider implementing the following strategies:

* **Exponential backoff**: If you receive a 429 (Too Many Requests) response, wait a short time before retrying and progressively increase the wait time on subsequent retries.
* **Request batching**: Where possible, use endpoints that allow bulk operations instead of many individual requests.
* **Prioritize data access**: Only request necessary data and use filters to reduce payload size and frequency.
* **Caching**: Cache results of common requests locally to reduce redundant API calls.
* **Rate limit monitoring**: Implement logic to detect when you are approaching rate limits based on response headers or behavior and adjust request rates dynamically.

<br />

## Postman Integration

Guesty provides a ready-to-use [Postman collection](https://www.postman.com/guesty-api/workspace/public-api/overview) to simplify exploring the API:

1. Visit the [Postman collection](https://www.postman.com/guesty-api/workspace/public-api/overview)
   1. [<img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style={{"width": "128px", "height": "32px"}} />](https://god.gw.postman.com/run-collection/11728107-1fb9cd2c-7ee2-43d7-9c95-1a5b43bb6b2b?action=collection%2Ffork\&source=rip_markdown\&collection-url=entityId%3D11728107-1fb9cd2c-7ee2-43d7-9c95-1a5b43bb6b2b%26entityType%3Dcollection%26workspaceId%3D0ed9181a-b17b-4f72-b0a2-9972887f7779)
2. Fork it to your workspace
3. Set your environment variables (Client ID, Secret, Token)
4. Test endpoints with a click

<br />

## Explore Key API Areas

Guesty's Open API spans many resources. Here are some useful endpoints:

* **Listings**: `/v1/listings`
* **Reservations**: `/v1/reservations`
* **Guests**: `/v1/guests`
* **Tasks**: `/v1/tasks`
* **Webhooks**: `/v1/webhooks`

You can find detailed parameters, filters, and responses in the [API Reference](https://open-api-docs.guesty.com/reference/overview).

<br />

## Troubleshooting Authentication Issues

If you encounter issues while authenticating with the Guesty Open API, consider the following common problems and resolutions:

<br />

<Accordion title="Invalid Client ID or Secret" icon="fa-question-circle">
  <ul>
    <li>Double-check that you're using the correct values from the Guesty dashboard.</li>
    <li>Ensure there are no extra spaces or formatting issues when copying and pasting.</li>
  </ul>
</Accordion>

<Accordion title="401 Unauthorized or 403 Forbidden" icon="fa-question-circle">
  <ul>
    <li>Confirm that your token is valid and not expired.</li>
    <li>Check that your request includes the `Authorization: Bearer YOUR_ACCESS_TOKEN` header.</li>
    <li>Verify that the token is being used for the correct account environment (e.g., sandbox/test vs production).</li>
  </ul>
</Accordion>

<Accordion title="Token Request Limit Exceeded" icon="fa-question-circle">
  <ul>
    <li>Guesty allows only 5 token requests per key in a 24-hour period.</li>
    <li>Implement token caching as shown in this guide to avoid unnecessary re-authentication.</li>
  </ul>
</Accordion>

<Accordion title="Malformed JSON Request" icon="fa-question-circle">
  <ul>
    <li>Make sure your JSON is correctly formatted.</li>
    <li>Include the <code>Content-Type: application/json</code> header in your request</li>
  </ul>
</Accordion>

<Accordion title="SSL or Connection Errors" icon="fa-question-circle">
  <ul>
    <li>Ensure you're using <code>https\://</code> in all request URLs.</li>
    <li>Confirm your system allows outbound HTTPS connections to Guesty servers.</li>
  </ul>

  <p>If problems persist, consult the <a href="https://open-api-docs.guesty.com/docs/authentication" target="_blank">Authentication Guide</a> or <a href="https://help.guesty.com/hc/en-gb/articles/9370047984413-Contacting-Customer-Experience" target="_blank">contact Guesty support</a>.</p>
</Accordion>

<Accordion title="Handling Failed Requests" icon="fa-info-circle">
  <p>When your application talks to an API (another service over the internet), things sometimes fail — the server might be busy, your internet might hiccup, or the service might be temporarily down. Without a retry mechanism, your application just gives up on the first failure.</p>
  <p>Learn how to implement a robust retry mechanism and become a better citizen of the internet <a href="https://open-api-docs.guesty.com/reference/handling-failed-requests" target="_blank">here</a>.</p>
</Accordion>

<br />

## Next Steps

* Read the [Authentication guide](https://open-api-docs.guesty.com/docs/authentication)
* Learn about [Webhooks for real-time updates](https://open-api-docs.guesty.com/docs/webhooks)
* Check out other [best practices guides](https://open-api-docs.guesty.com/docs)
* Explore [the API](https://open-api-docs.guesty.com/reference/how-to-use-the-api-reference)
* Subscribe to the [changelogs RSS feed](https://open-api-docs.guesty.com/changelog.rss)

For further support, [contact Guesty](https://help.guesty.com/hc/en-gb/articles/9370047984413-Contacting-Customer-Experience) or visit the documentation portal.