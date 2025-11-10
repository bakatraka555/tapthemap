# 📡 TapTheMap API Documentation

## Base URL

**Production:** `https://tapthemap.world`

**Local Development:** `http://localhost:8888`

---

## Authentication

No authentication required for public endpoints. Rate limiting is applied per IP address.

---

## Rate Limiting

All endpoints have rate limiting:
- **GET endpoints:** 200 requests/minute per IP
- **POST endpoints:** 50 requests/minute per IP
- **Webhook:** No rate limiting (Stripe only)

**Rate Limit Headers:**
```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 150
X-RateLimit-Reset: 2024-01-01T00:01:00.000Z
Retry-After: 60
```

**Rate Limit Response (429):**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again after 2024-01-01T00:01:00.000Z",
  "retryAfter": 60
}
```

---

## Endpoints

### **GET** `/api/stats`

Returns statistics for all countries (24h, 7d, all-time).

**Endpoint:** `GET /.netlify/functions/stats`

**Response:**
```json
[
  {
    "iso": "HRV",
    "name": "Croatia",
    "total_eur": 1000,
    "donors_24h": 15,
    "donors_7d": 45,
    "total_donors": 120
  },
  {
    "iso": "DEU",
    "name": "Germany",
    "total_eur": 500,
    "donors_24h": 5,
    "donors_7d": 20,
    "total_donors": 50
  }
]
```

**Response Fields:**
- `iso` (string): Country ISO code (3 letters)
- `name` (string): Country name
- `total_eur` (number): Total donations in EUR (all-time)
- `donors_24h` (number): Unique donors in last 24 hours
- `donors_7d` (number): Unique donors in last 7 days
- `total_donors` (number): Total unique donors (all-time)

**Status Codes:**
- `200 OK`: Success
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Rate Limit:** 200 requests/minute per IP

---

### **GET** `/api/leaders`

Returns top countries leaderboard (24h, 7d, all-time).

**Endpoint:** `GET /.netlify/functions/leaders`

**Response:**
```json
{
  "leaders_24h": [
    {
      "country_iso": "HRV",
      "country_name": "Croatia",
      "unique_donors": 15,
      "total_eur": 500
    },
    {
      "country_iso": "DEU",
      "country_name": "Germany",
      "unique_donors": 10,
      "total_eur": 300
    }
  ],
  "leaders_7d": [
    {
      "country_iso": "HRV",
      "country_name": "Croatia",
      "unique_donors": 45,
      "total_eur": 1200
    }
  ],
  "leaders_all": [
    {
      "country_iso": "HRV",
      "country_name": "Croatia",
      "unique_donors": 120,
      "total_eur": 5000
    }
  ]
}
```

**Response Fields:**
- `leaders_24h` (array): Top 20 countries (last 24 hours)
- `leaders_7d` (array): Top 20 countries (last 7 days)
- `leaders_all` (array): Top 20 countries (all-time)
- `country_iso` (string): Country ISO code (3 letters)
- `country_name` (string): Country name
- `unique_donors` (number): Unique donors count
- `total_eur` (number): Total donations in EUR

**Sorting:**
- Primary: `unique_donors` (descending)
- Secondary: `total_eur` (descending)

**Status Codes:**
- `200 OK`: Success
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Rate Limit:** 200 requests/minute per IP

---

### **POST** `/api/checkout`

Creates a Stripe Checkout session for donation.

**Endpoint:** `POST /.netlify/functions/checkout`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "country_iso": "HRV",
  "country_name": "Croatia",
  "amount_eur": 10,
  "ref": "@captain_handle",
  "handle": "@captain_handle"
}
```

**Request Fields:**
- `country_iso` (string, required): Country ISO code (3 letters)
- `country_name` (string, optional): Country name
- `amount_eur` (number, required): Donation amount in EUR (min: 1)
- `ref` (string, optional): Captain referral handle
- `handle` (string, optional): Captain handle (alias for ref)

**Response:**
```json
{
  "id": "cs_test_abcdefghijklmnopqrstuvwxyz",
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

**Response Fields:**
- `id` (string): Stripe Checkout session ID
- `url` (string): Stripe Checkout URL (redirect user to this URL)

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Invalid request (missing/invalid fields)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Rate Limit:** 50 requests/minute per IP

**Example:**
```bash
curl -X POST https://tapthemap.world/.netlify/functions/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "country_iso": "HRV",
    "country_name": "Croatia",
    "amount_eur": 10,
    "ref": "@captain_handle"
  }'
```

---

### **POST** `/api/webhook`

Stripe webhook handler (internal use only).

**Endpoint:** `POST /.netlify/functions/webhook`

**Note:** This endpoint is called by Stripe, not by your application.

**Status Codes:**
- `200 OK`: Success
- `400 Bad Request`: Invalid signature
- `500 Internal Server Error`: Server error

**Rate Limit:** N/A (Stripe only)

---

### **GET** `/api/captains`

Returns top captains (referral program stats).

**Endpoint:** `GET /.netlify/functions/captains`

**Response:**
```json
[
  {
    "ref": "@captain_handle",
    "total_earned": 250.50,
    "total_donations": 1000,
    "unique_donors": 45,
    "top_countries": ["HRV", "DEU", "FRA"]
  }
]
```

**Response Fields:**
- `ref` (string): Captain referral handle
- `total_earned` (number): Total commission earned (EUR)
- `total_donations` (number): Total donations influenced (EUR)
- `unique_donors` (number): Unique donors count
- `top_countries` (array): Top 3 countries (ISO codes)

**Status Codes:**
- `200 OK`: Success
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Rate Limit:** 200 requests/minute per IP

---

### **GET** `/api/ping`

Health check endpoint.

**Endpoint:** `GET /.netlify/functions/ping`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200 OK`: Success

**Rate Limit:** N/A

---

## Error Responses

All errors return JSON with the following structure:

```json
{
  "error": "Error type",
  "message": "Error message",
  "requestId": "request-id-123"
}
```

**Error Types:**
- `Too Many Requests`: Rate limit exceeded
- `Bad Request`: Invalid request
- `Internal Server Error`: Server error

**Status Codes:**
- `400 Bad Request`: Invalid request
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Logging

All requests are logged with structured JSON format:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "INFO",
  "message": "Request received",
  "function": "leaders",
  "requestId": "request-id-123",
  "ip": "192.168.1.1"
}
```

**Log Levels:**
- `DEBUG`: Detailed debugging information
- `INFO`: General information
- `WARN`: Warning messages
- `ERROR`: Error messages

**Log Location:** Netlify Function Logs

---

## Retry Logic

Critical operations (webhook payments) have retry logic:
- **Max Retries:** 3
- **Initial Delay:** 1 second
- **Max Delay:** 5 seconds
- **Backoff:** Exponential

**Retry Conditions:**
- Network errors (ECONNREFUSED, ETIMEDOUT)
- 5xx server errors
- Supabase connection errors

---

## CORS

All endpoints support CORS:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Examples

### **JavaScript (Fetch API)**
```javascript
// Get stats
const response = await fetch('https://tapthemap.world/.netlify/functions/stats');
const stats = await response.json();

// Get leaders
const leadersResponse = await fetch('https://tapthemap.world/.netlify/functions/leaders');
const leaders = await leadersResponse.json();

// Create checkout session
const checkoutResponse = await fetch('https://tapthemap.world/.netlify/functions/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    country_iso: 'HRV',
    country_name: 'Croatia',
    amount_eur: 10,
    ref: '@captain_handle'
  })
});
const checkout = await checkoutResponse.json();
window.location.href = checkout.url;
```

### **cURL**
```bash
# Get stats
curl https://tapthemap.world/.netlify/functions/stats

# Get leaders
curl https://tapthemap.world/.netlify/functions/leaders

# Create checkout session
curl -X POST https://tapthemap.world/.netlify/functions/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "country_iso": "HRV",
    "country_name": "Croatia",
    "amount_eur": 10,
    "ref": "@captain_handle"
  }'
```

---

## Support

For API support, please contact:
- **Website:** https://tapthemap.world
- **GitHub:** https://github.com/bakatraka555/tapthemap

---

**Last Updated:** 2024-01-01

