# 🧠 Bitespeed Backend Task – Identity Reconciliation

This project is part of the backend developer assessment for Bitespeed. The primary goal is to build a service that can identify and reconcile user identities using phone numbers and emails.

## 📦 Tech Stack

* **Node.js** (with **TypeScript**)
* **Express.js**
* **PostgreSQL** (hosted on [Neon](https://neon.com/))
* **Render.com** for cloud deployment

---


## 🔗 API Endpoints

### `GET /`

Returns a simple response to confirm the server is up.

#### Response:

```
Express + Typescript Server
```

---

### `POST /identify`

Identifies all linked contact details based on an email or phone number.

#### 📥 Request Body:

```json
{
  "email": "shamik@gmail.com",
  "phoneNumber": "979797"
}
```

#### 🔁 Logic:

* If no existing contact is found, a **new primary contact** is created.
* If matching contact(s) are found:
    * If we get list contacts for given email and phone number where one is primary and others are secondary,
      then we simple reconcile the given data in the specific response format and return.
    * If we get two primary contacts for given email and phone number, then we make the one created earlier than
      the other the primary and other one as secondary and reconcile the response and return it.

* We always ensure that there is always a single primary contact for a user’s identity.
* Contacts are linked based on **email**, **phone number**, or both.

#### ✅ Response Format:

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["shamik@gmail.com"],
    "phoneNumbers": ["979797"],
    "secondaryContactIds": [2, 3]
  }
}
```

---

## 🧊 Cold Start Notice

This app is deployed on [Render’s free tier](https://render.com/), which can result in **cold starts**. This may lead to **initial response times of up to a minute** after a period of inactivity. Subsequent requests will respond much faster.

---

## 🚀 Deployment

* **Database**: Hosted on Neon Postgres free plan.
* **Backend**: Deployed on Render.com as a free web service.

---

## 🧪 Testing the API

- **Link:** https://bitespeed-identity-recon-api.onrender.com


- You can test the API using tools like [Postman](https://www.postman.com/) or [curl](https://curl.se/):

    ```bash
    curl -X POST https://bitespeed-identity-recon-api.onrender.com/identify \
    -H 'Content-Type: application/json' \
    -d '{"email": "shamik@gmail.com", "phoneNumber": "979797"}'
    ```

---

## 📩 Contact

* Mail me: [berashamik115@gmail.com](mailto:berashamik115@gmail.com)

* Connect with me on Linkedin: [linkedin.com/in/shamik-bera](https://www.linkedin.com/in/shamik-bera/)