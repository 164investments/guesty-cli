# Handling Failed Requests

Managing failed requests using a retry mechanism with exponential backoff, jitter, and a maximum cap.

## Overview

When your application communicates with another service (via an API), things won't always go as planned. Sometimes the internet hiccups, or the server you're trying to reach is temporarily overwhelmed. If your app gives up and fails immediately, your users will have a frustrating, buggy experience.

To address this, we recommend using a **retry mechanism**. However, retrying as fast as possible is dangerous—it can overwhelm the server even more, effectively acting like a self-inflicted cyberattack.

To do this safely and professionally, implement three key concepts: **Exponential Backoff**, **Jitter**, and a **Max Cap**.

<br />

## Core Concepts

| Concept                 | Purpose                                                                                             |
| :---------------------- | :-------------------------------------------------------------------------------------------------- |
| **Exponential Backoff** | Each retry waits progressively longer (1s → 2s → 4s → 8s …), giving the service time to recover.    |
| **Jitter**              | Introduces randomness to the wait time, preventing multiple clients from retrying at the same time. |
| **Max Cap**             | Sets a ceiling on the delay to prevent wait times from becoming unreasonably long.                  |

<br />

## The Formula

```
delay = min(base × 2^attempt, max_cap)
actual_wait = random(0, delay)
```

<br />

This pattern is an industry standard used by AWS, Google, Stripe, and virtually every major API provider. Implementing it will make your application more **reliable**, more **respectful** of the services you depend on, and a better **citizen of the internet**.

<br />

## Suggested Starting Configuration

The table below reflects common patterns recommended across major API provider documentation.

<br />

| Setting     | Recommended                       | Why                                    |
| :---------- | :-------------------------------- | :------------------------------------- |
| Max retries | 3–5                               | Enough to ride out brief issues        |
| Base delay  | 1 second                          | Gives the server a moment to breathe   |
| Max cap     | 15–30 seconds                     | Balances patience with user experience |
| Jitter type | Full (random between 0 and delay) | Best spread of retry traffic           |

<br />

These values are a reasonable starting point based on common industry patterns. Adjust them to your use case — a user-facing checkout flow may need shorter wait times and fewer retries than a background data sync.

<br />

## Putting It All Together

Here's what a complete strategy looks like:

```
SETTINGS:
- Max retries: 5
- Base delay: 1 second
- Max cap: 30 seconds
- Jitter: random value between 0 and the current delay

FOR each attempt:
    1. Make the API request
    2. If it succeeds → great, you're done!
    3. If it fails:
        a. Calculate delay: min(base × 2^attempt, max_cap)
        b. Add jitter: random(0, delay)
        c. Wait that long
        d. Try again
    4. If all retries are exhausted → give up and report the error
```

<br />

**Example**

```
Attempt 1: Request fails
  → Calculated delay: min(1 × 2⁰, 30) = 1 second
  → With jitter: random(0, 1) = 0.6 seconds
  → Wait 0.6 seconds...

Attempt 2: Request fails
  → Calculated delay: min(1 × 2¹, 30) = 2 seconds
  → With jitter: random(0, 2) = 1.3 seconds
  → Wait 1.3 seconds...

Attempt 3: Request fails
  → Calculated delay: min(1 × 2², 30) = 4 seconds
  → With jitter: random(0, 4) = 2.8 seconds
  → Wait 2.8 seconds...

Attempt 4: Request succeeds! (end)
```

<br />

## Which Responses to Retry

#### ✅ DO:

* **Only retry on temporary errors.** Server busy (`503`), timeout (`408`), rate limited (`429`), and network errors are good candidates.
* **Set a maximum number of retries** (3–5 is typical). Don't retry forever.
* **Log every retry** to diagnose issues later. Record failed attempts even if a request succeeds on the third try. Tracking these retries helps reveal underlying API health problems.
* **Respect `Retry-After` headers.** Some APIs tell you exactly how long to wait — always honor that.

<br />

<Callout icon="🚧" theme="warn">
  **Monitor response headers**

  If a response includes a `Retry-After` header, always use that value instead of your calculated delay.
</Callout>

<br />

#### ❌ DON'T:

* **Don't retry on permanent errors.** A "401 Unauthorized" or "404 Not Found" won't fix itself no matter how many times you try (unless it is the result of a race condition that will resolve given more time).
* **Don't retry requests that change data** (like payments or order submissions) without being careful — you might accidentally charge someone twice.
* **Don't set your cap too high.** If a user is waiting, 30 seconds is usually the practical limit before the experience becomes unacceptable.
* **Don't ignore the underlying problem.** If you're retrying constantly, something deeper is wrong.

<br />

**Some examples**:

| Safe to Retry               | Do Not Retry           |
| :-------------------------- | :--------------------- |
| `408` Request Timeout       | `400` Bad Request      |
| `429` Too Many Requests     | `401` Unauthorized     |
| `500` Internal Server Error | `403` Forbidden        |
| `502` Bad Gateway           | `404` Not Found        |
| `503` Service Unavailable   | `422` Validation Error |
| Network / connection errors |                        |

<br />

## Contacting Support

If, despite your best efforts, you encounter a recurring error that your retry mechanism cannot resolve, feel free to <Anchor label="contact Guesty's API Support Team" target="_blank" href="https://help.guesty.com/hc/en-gb/articles/9370047984413-Contacting-Customer-Experience">contact Guesty's API Support Team</Anchor>, providing the following:

1. A summary of the issue, including your expected outcome and the actual outcome
2. URL to the documentation for the API resource with the issue
3. Your exact workflow that results in this error, including:
   1. Each request written in cURL
   2. The response codes and messages for each request
   3. The `x-request-id` from each response header
   4. Timestamps from the events (if possible)