# ShopTaj — Backend & Admin Operations Guide

## Access Points

| Tool | URL |
|------|-----|
| API Swagger Docs | http://localhost:3001/api/docs |
| Admin Dashboard (Web) | http://localhost:3000/admin |
| Database Studio | run `npx prisma studio` in `/backend` |

**Admin login:** admin@shoptaj.com / Admin123!

---

## 1. PRODUCTS

### Add a Product (Web Admin)
1. Go to http://localhost:3000/admin/products
2. Click **Add Product**
3. Fill in the form:
   - **Name** (required) — shown to customers
   - **Brand** — e.g. "Nike", "Samsung"
   - **Description** — full product description
   - **Price** — regular price in USD
   - **Discount Price** — sale price (leave empty if no sale)
   - **Stock** — number of units available
   - **Category** — select from dropdown
   - **Tags** — comma separated: `shoes, sport, running`
   - **Featured** — ✓ appears on homepage
   - **Active** — uncheck to hide from customers
4. Click **Create Product**

### Add a Product (API)
```
POST http://localhost:3001/api/admin/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "iPhone 15 Pro",
  "description": "Latest iPhone with titanium frame",
  "price": 999.99,
  "discountPrice": 899.99,
  "stock": 50,
  "categoryId": "uuid-of-category",
  "brand": "Apple",
  "tags": ["smartphone", "apple", "ios"],
  "isFeatured": true,
  "isActive": true
}
```

### Upload Product Images (API)
```
POST http://localhost:3001/api/admin/products/{productId}/images
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: [image1.jpg, image2.jpg]   (max 10 images, 5MB each)
```

### Edit a Product (Web Admin)
1. Find the product in the table
2. Click the ✏️ (pencil) icon
3. Edit fields and click **Update Product**

### Edit a Product (API)
```
PATCH http://localhost:3001/api/admin/products/{productId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "price": 799.99,
  "stock": 30,
  "isFeatured": false
}
```

### Delete a Product (Web Admin)
1. Find the product in the table
2. Click 🗑️ (trash) icon
3. Product is permanently deleted

### Delete a Product (API)
```
DELETE http://localhost:3001/api/admin/products/{productId}
Authorization: Bearer <token>
```

### Hide a Product (without deleting)
Set `isActive: false` — the product disappears from the store but stays in the database.

---

## 2. CATEGORIES

### Add a Category (API)
```
POST http://localhost:3001/api/admin/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Electronics",
  "parentId": null,          // null = top-level, or use a category ID for sub-category
  "imageUrl": "https://..."  // optional
}
```

### Add a Sub-Category
```json
{
  "name": "Smartphones",
  "parentId": "uuid-of-electronics-category"
}
```

### Edit a Category (API)
```
PATCH http://localhost:3001/api/admin/categories/{categoryId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Mobile Phones"
}
```

### Delete a Category (API)
```
DELETE http://localhost:3001/api/admin/categories/{categoryId}
Authorization: Bearer <token>
```
⚠️ Cannot delete a category that has products. Move or delete its products first.

---

## 3. ORDERS

### View All Orders
- **Web:** http://localhost:3000/admin/orders
- **API:** `GET http://localhost:3001/api/admin/orders`

### Filter Orders by Status
```
GET http://localhost:3001/api/admin/orders?status=PENDING
GET http://localhost:3001/api/admin/orders?status=PROCESSING
GET http://localhost:3001/api/admin/orders?status=SHIPPED
GET http://localhost:3001/api/admin/orders?status=DELIVERED
GET http://localhost:3001/api/admin/orders?status=CANCELLED
```

### Update Order Status (Web Admin)
1. Go to http://localhost:3000/admin/orders
2. Find the order
3. Click the **status dropdown** in the Status column
4. Select new status — saves automatically

### Update Order Status (API)
```
PATCH http://localhost:3001/api/admin/orders/{orderId}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "SHIPPED"
}
```

### Order Status Flow
```
PENDING → PROCESSING → SHIPPED → DELIVERED
         ↓
      CANCELLED  (only admin can cancel PROCESSING/SHIPPED)
```

---

## 4. USERS

### View All Users
- **Web:** http://localhost:3000/admin/users
- **API:** `GET http://localhost:3001/api/admin/users`

### Ban a User (Web Admin)
1. Find the user
2. Click **Ban** button
3. User is immediately blocked from logging in

### Ban a User (API)
```
PATCH http://localhost:3001/api/admin/users/{userId}/ban
Authorization: Bearer <token>
```

### Unban a User
```
PATCH http://localhost:3001/api/admin/users/{userId}/unban
Authorization: Bearer <token>
```
Or click **Unban** in the Web Admin.

---

## 5. COUPONS

### Create a Coupon (Web Admin)
1. Go to http://localhost:3000/admin/coupons
2. Click **New Coupon**
3. Fill in:
   - **Code** — what customers type (e.g. `SUMMER20`)
   - **Type** — Percentage or Fixed amount
   - **Value** — 20 for 20% off, or 20 for $20 off
   - **Min Order** — minimum cart total required
   - **Max Uses** — leave empty for unlimited
   - **Expires At** — optional expiry date

### Create a Coupon (API)
```
POST http://localhost:3001/api/admin/coupons
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "SUMMER20",
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "minOrderValue": 50,
  "maxUses": 100,
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

Discount types: `"PERCENTAGE"` or `"FIXED"`

### Disable / Enable a Coupon
- **Web:** Click **Disable** or **Enable** next to the coupon
- **API:** `PATCH http://localhost:3001/api/admin/coupons/{couponId}/toggle`

---

## 6. ANALYTICS

### View Dashboard Stats
- **Web:** http://localhost:3000/admin (shows cards automatically)
- **API:** `GET http://localhost:3001/api/admin/analytics`

Returns:
```json
{
  "totalRevenue": 4529.94,
  "totalOrders": 47,
  "totalUsers": 23,
  "ordersToday": 3,
  "topProducts": [...]
}
```

---

## 7. DATABASE DIRECT ACCESS

Run Prisma Studio (visual database browser):
```bash
cd /home/vazir/Desktop/Vazirs\ Files/shoptaj/ShopTaj/backend
npx prisma studio
```
Opens at **http://localhost:5555** — lets you view, edit, delete any database record directly.

---

## 8. GETTING YOUR ADMIN AUTH TOKEN (for API testing)

### Option A — From Browser
1. Log in at http://localhost:3000/login with admin@shoptaj.com
2. Open DevTools → Application → Local Storage → `shoptaj-auth`
3. Copy the `accessToken` value

### Option B — API Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@shoptaj.com","password":"Admin123!"}' \
  | grep accessToken
```

Use the token in all admin API requests:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 9. COMMON OPERATIONS — QUICK REFERENCE

| Task | Method | URL |
|------|--------|-----|
| List all products | GET | /api/products?limit=50 |
| Get single product | GET | /api/products/{slug} |
| Create product | POST | /api/admin/products |
| Update product | PATCH | /api/admin/products/{id} |
| Delete product | DELETE | /api/admin/products/{id} |
| Upload images | POST | /api/admin/products/{id}/images |
| List categories | GET | /api/categories |
| Create category | POST | /api/admin/categories |
| Update category | PATCH | /api/admin/categories/{id} |
| Delete category | DELETE | /api/admin/categories/{id} |
| List all orders | GET | /api/admin/orders |
| Update order status | PATCH | /api/admin/orders/{id}/status |
| List all users | GET | /api/admin/users |
| Ban user | PATCH | /api/admin/users/{id}/ban |
| Unban user | PATCH | /api/admin/users/{id}/unban |
| List coupons | GET | /api/admin/coupons |
| Create coupon | POST | /api/admin/coupons |
| Toggle coupon | PATCH | /api/admin/coupons/{id}/toggle |
| Analytics | GET | /api/admin/analytics |

---

## 10. TESTING API WITH SWAGGER

The easiest way to test all endpoints:

1. Open http://localhost:3001/api/docs
2. Click **Authorize** button (top right)
3. Enter: `Bearer <your-admin-token>`
4. Click any endpoint → **Try it out** → fill fields → **Execute**
5. See the real response from your server

---

## 11. ADD PRODUCT TRANSLATIONS (Russian / Tajik)

When creating or updating a product via API, you can include translations:
```json
{
  "name": "Wireless Headphones Pro",
  "nameRu": "Беспроводные наушники Pro",
  "nameTg": "Гӯшмонакҳои беим Pro",
  "description": "Premium wireless headphones...",
  "descriptionRu": "Беспроводные наушники с шумоподавлением...",
  "descriptionTg": "Гӯшмонакҳои беими дараҷаи баланд..."
}
```
If translations are not provided, the English version is shown to all users.
