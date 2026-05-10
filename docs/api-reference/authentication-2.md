# Authentication

How to authenticate your API requests.

> ❗️ Proper Authentication
>
> Open API (OAPI) access keys are for authenticating OAPI requests only. To authenticate requests to our Booking Engine API, please follow its authentication steps [here](https://booking-api-docs.guesty.com/docs/authentication-1).

<br />

## 1. Creating Authorization Keys

Guesty's new Open API is a REST API that uses [OAuth 2.0](https://oauth.net/2/) access tokens to authenticate requests. Your access token authorizes you to use the Guesty Open API server and can be reused until it expires.

You must exchange your **Client ID** and **Client Secret** for an access token to authenticate your requests. You can create these keys by logging into your [Guesty account](https://app.guesty.com/auth/login) and following [these instructions](https://help.guesty.com/hc/en-gb/articles/9370472424605-Using-Guesty-s-Open-API).

<br />

> **🚧 Important**
>
> * Your **Client Secret** is only visible the first time you access it. After that, Guesty redacts the **Client\
>   Secret** for your security. Make sure to store it in a safe place where you can access it as needed.
> * If you're using the old Guesty open API, please follow [these instructions](https://open-api-docs.guesty.com/docs/migrating-to-the-guesty-open-api) for migration.

<br />

## 2. Generating the Access Token

The following examples show you how to get your access token using cURL. Please copy the following code and modify it.

<br />

```curl
curl --location --request POST 'https://open-api.guesty.com/oauth2/token' \
--header 'Accept: application/json' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'grant_type=client_credentials' \
--data-urlencode 'scope=open-api' \
--data-urlencode 'client_secret=<YOUR_CLIENT_SECRET>' \
--data-urlencode 'client_id=<YOUR_CLIENT_ID>'
```

```javascript jQuery
var settings = {
  "url": "https://open-api.guesty.com/oauth2/token",
  "method": "POST",
  "timeout": 0,
  "headers": {
    "Accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded"
  },
  "data": {
    "grant_type": "client_credentials",
    "scope": "open-api",
    "client_secret": "<YOUR_CLIENT_SECRET>",
    "client_id": "<YOUR_CLIENT_ID>"
  }
};

$.ajax(settings).done(function (response) {
  console.log(response);
});
```

```javascript
const myHeaders = new Headers();
myHeaders.append("Accept", "application/json");
myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

const urlencoded = new URLSearchParams();
urlencoded.append("grant_type", "client_credentials");
urlencoded.append("scope", "open-api");
urlencoded.append("client_secret", "<YOUR_CLIENT_SECRET>");
urlencoded.append("client_id", "<YOUR_CLIENT_ID>");

const requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: urlencoded,
  redirect: "manual"
};

fetch("https://open-api.guesty.com/oauth2/token", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

```javascript NodeJs
var request = require('request');
var options = {
  'method': 'POST',
  'url': 'https://open-api.guesty.com/oauth2/token',
  'headers': {
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  form: {
    'grant_type': 'client_credentials',
    'scope': 'open-api',
    'client_secret': '<YOUR_CLIENT_SECRET>',
    'client_id': '<YOUR_CLIENT_ID>'
  }
};
request(options, function (error, response) {
  if (error) throw new Error(error);
  console.log(response.body);
});
```

```php
<?php

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://open-api.guesty.com/oauth2/token',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => false,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => 'grant_type=client_credentials&scope=open-api&client_secret=%3CYOUR_CLIENT_SECRET%3E&client_id=%3CYOUR_CLIENT_ID%3E',
  CURLOPT_HTTPHEADER => array(
    'Accept: application/json',
    'Content-Type: application/x-www-form-urlencoded'
  ),
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;

```

```python
import http.client

conn = http.client.HTTPSConnection("open-api.guesty.com")
payload = 'grant_type=client_credentials&scope=open-api&client_secret=%3CYOUR_CLIENT_SECRET%3E&client_id=%3CYOUR_CLIENT_ID%3E'
headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/x-www-form-urlencoded'
}
conn.request("POST", "/oauth2/token", payload, headers)
res = conn.getresponse()
data = res.read()
print(data.decode("utf-8"))
```

<br />

**Sample Response**

Guesty returns an access token, the number of seconds the access token is valid (equal to 24 hours), token type, and scope. You may **reuse the token** as often as you need within that period.

<br />

```json
{
    "token_type": "Bearer",
    "expires_in": 86400,
    "access_token": "eyJraWQiOiJydFFaWXhoTzBtNlllbWZaRnRBRXJORFVkWThZOFlPeGxndVZabmpJZVNvIiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULlVWdkZ5NW5ES1h4SlBvUVUzbWN3ZS1ORXp0eHo0NWNQVktZVUFxM3V5RXMiLCJpc3MiOiJodHRwczovL2xvZ2luLmd1ZXN0eS5jb20vb2F1dGgyL2F1czFwOHFyaDUzQ2NRVEk5NWQ3IiwiYXVkIjoiaHR0cHM6Ly9vcGVuLWFwaS5ndWVzdHkuY29tIiwiaWF0IjoxNjU5NTM3NjUwLCJleHAiOjE2NTk2MjQwNTAsImNpZCI6IjBvYTViaWw0MzB4OHpMeldCNWQ3Iiwic2NwIjpbIm9wZW4tYXBpIl0sInJlcXVlc3RlciI6IkVYVEVSTkFMIiwiYWNjb3VudElkIjoiNjJhMDZkMmYyMjUxMzAwMDM1OWVlODkzIiwic3ViIjoiMG9hNWJpbDQzMHg4ekx6V0I1ZDciLCJ1c2VyUm9sZXMiOlt7InJvbGVJZCI6eyJwZXJtaXNzaW9ucyI6WyJhZG1pbiJdfX1dLCJyb2xlIjoidXNlciIsImlhbSI6InYzIiwibmFtZSI6IkNTIHwgVEEtMSB8IE1vc2hlIn0.LlZZUhM4WTsIsgmuqLasl-5WtNx0N8MvpmSGerSz5DpvO2AkcOhZAuYgPh1xqocGpwcKLMBokYvSyC0xRtptDEpaEY8X__ozvDS_UpUp2vKdtU2t-1ns7ut5qZlGhf6ffZAR0K1WXEb1081n-0Ms5qxfy1HbWkmyPUt0tgN-xAmRgnbSX01YELZ-_vovpitsxC0JYPPpBOi_w8kxlxsqKLWiFzDe5SpzBUYncjJEafISXzo5PNHEweHkvguXXM9xVXlNpE_q0DfQvQ41mn8TDnhUVtspscG3WmKV86k5QAjqHyYMJ2_2WOWRWrjfeyKc5ePC1HqCANRxOO7oS7dQcA",
    "scope": "open-api"
}
```

You can generate **a maximum of five** access tokens per 24 hours, per `clientId`.<br /><br />

<Callout icon="✅">
  #### Best Practices

  * **Store the token securely in memory, a database, or a cache**:
    * To avoid the rate limits on the `/oauth2` endpoint, we advise calling it once a day, and caching the token for 24 hours. Use this same token for any other Open API requests within that period.
    * Alternatively, you can also adopt a reactive approach and choose to refresh your token after it expires. You will receive a `403 - Unauthorized` error when your token is expired. You can handle the 403 error and refresh your access token accordingly.
  * **Track the token's expiration timestamp**:
    * To minimize the chance of errors, store the value of the `expires_in` field locally, using it to ensure your token is refreshed 30 - 60 minutes before it expires.
    * Automatically request a new token when it's close to expiry (e.g., within 5 minutes).
    * Avoid requesting a new token on every API call to stay within the usage limit.
</Callout>

<br />

## 3. Using the Access Token

When you make a request to the Open API, include the access token in the Authorization header with the designation `Bearer`. <br />

<br />

**Example**

```curl GET listings
curl --location --request GET 'https://open-api.guesty.com/v1/listings' \
--header 'accept: application/json' \
--header 'Authorization: Bearer eyJraWQiOiJydFFaWXhoTzBtNlllbWZaRnRBRXJORFVkWThZOFlPeGxndVZabmpJZVNvIiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULlVWdkZ5NW5ES1h4SlBvUVUzbWN3ZS1ORXp0eHo0NWNQVktZVUFxM3V5RXMiLCJpc3MiOiJodHRwczovL2xvZ2luLmd1ZXN0eS5jb20vb2F1dGgyL2F1czFwOHFyaDUzQ2NRVEk5NWQ3IiwiYXVkIjoiaHR0cHM6Ly9vcGVuLWFwaS5ndWVzdHkuY29tIiwiaWF0IjoxNjU5NTM3NjUwLCJleHAiOjE2NTk2MjQwNTAsImNpZCI6IjBvYTViaWw0MzB4OHpMeldCNWQ3Iiwic2NwIjpbIm9wZW4tYXBpIl0sInJlcXVlc3RlciI6IkVYVEVSTkFMIiwiYWNjb3VudElkIjoiNjJhMDZkMmYyMjUxMzAwMDM1OWVlODkzIiwic3ViIjoiMG9hNWJpbDQzMHg4ekx6V0I1ZDciLCJ1c2VyUm9sZXMiOlt7InJvbGVJZCI6eyJwZXJtaXNzaW9ucyI6WyJhZG1pbiJdfX1dLCJyb2xlIjoidXNlciIsImlhbSI6InYzIiwibmFtZSI6IkNTIHwgVEEtMSB8IE1vc2hlIn0.LlZZUhM4WTsIsgmuqLasl-5WtNx0N8MvpmSGerSz5DpvO2AkcOhZAuYgPh1xqocGpwcKLMBokYvSyC0xRtptDEpaEY8X__ozvDS_UpUp2vKdtU2t-1ns7ut5qZlGhf6ffZAR0K1WXEb1081n-0Ms5qxfy1HbWkmyPUt0tgN-xAmRgnbSX01YELZ-_vovpitsxC0JYPPpBOi_w8kxlxsqKLWiFzDe5SpzBUYncjJEafISXzo5PNHEweHkvguXXM9xVXlNpE_q0DfQvQ41mn8TDnhUVtspscG3WmKV86k5QAjqHyYMJ2_2WOWRWrjfeyKc5ePC1HqCANRxOO7oS7dQcA'
```

<br />

When your access token expires, repeat the `/oauth2/token` [request](#2--generating-the-access-token) to retrieve a new access token.

<br />

> 🚧 Expired Token
>
> You'll know your token has expired when you receive a status 403 error with the following message:
>
> ```json
> {
>   "message": "You don't have permission to access, please contact Guesty support."
> }
> ```

<br />

## Using Postman to Generate an Access Token

#### Step-by-Step

In the Postman app, complete the following:

<br />

1. Open a new request tab.
   1. Set the request method to **POST**.
   2. Enter `https://open-api.guesty.com/oauth2/token` as the request URL.

<br />

<Image align="center" alt="Figure 1: Request Method and URL" caption="Figure 1: Request Method and URL" src="https://files.readme.io/edf5bb7-image.png" width="700px" />

<br />

2. Select the **Headers** tab, hide the auto-generated headers, and add the following parameters (if they don't exist):
   1. `Accept`: `application/json`
   2. `Content-Type`:  `application/x-www-form-urlencoded`

<br />

<Image align="center" alt="Figure 2: Request Headers" caption="Figure 2: Request Headers" src="https://files.readme.io/5237a65-image.png" width="700px" />

<br />

3. Select the **Body** tab and **x-www-form-urlencoded** option from the dropdown menu. Then enter the following parameters:
   1. `grant_type=client_credentials`
   2. `scope=open-api`
   3. `client_secret={your_client_secret}`
   4. `client_id={your_client_id}`

<br />

<Image align="center" alt="Figure 3: Request Body Parameters" caption="Figure 3: Request Body Parameters" src="https://files.readme.io/79bb5dc-image.png" width="700px" />

<br />

4. Click the **Send** button.

<br />

#### Expected Response

Status *200 OK*

```json
{
    "token_type": "Bearer",
    "expires_in": 86400,
    "access_token": "<accessToken>",
    "scope": "open-api"
}
```

<br />

> ❗️ Safeguarding Access
>
> Do not share generated tokens with anyone outside your organization that you do not trust. Giving third parties access to Guesty's Open API can harm your account and business. Guesty is not responsible for any damage or errors in your account caused by unauthorized use of these tokens. **This is especially important for third parties that change price and availability settings**. To see a list of trusted third-party solutions, visit the Guesty **Marketplace**. If you are unsure what to do, contact your dedicated Account Manager or the [Customer Experience team](https://help.guesty.com/hc/en-gb/articles/9370047984413-Contacting-Customer-Experience) .

<br />

## Troubleshooting Authentication Issues

If you encounter issues while authenticating with the Guesty Open API, consider the following common problems and resolutions:

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