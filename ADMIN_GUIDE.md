# ShopTaj Admin Panel — Full Guide

## How to Access

1. Go to **http://localhost:3000/login**
2. Sign in with the admin account:
   - **Email:** admin@shoptaj.com
   - **Password:** Admin123!
3. After login, go to **http://localhost:3000/admin**

> Regular user accounts cannot access the admin panel. Only accounts with `ADMIN` role can see and use it.

---

## Admin Panel Overview

The admin panel has 5 sections:

| Section | URL | Purpose |
|---------|-----|---------|
| Dashboard | /admin | Analytics & overview |
| Products | /admin/products | Manage product catalog |
| Orders | /admin/orders | View & update orders |
| Users | /admin/users | Manage customers |
| Coupons | /admin/coupons | Create & manage discount codes |

---

## 1. Dashboard (`/admin`)

The first page you see after entering the admin panel.

### What you see:

**4 Stat Cards:**
- **Total Revenue** — sum of all paid orders in dollars
- **Total Orders** — number of all orders ever placed
- **Total Users** — number of registered accounts
- **Orders Today** — orders placed today

**Top Selling Products:**
- A ranked list of the 5 best-selling products
- Shows product name, units sold, and price

### How to use:
- This page is read-only, just for monitoring
- Click any card in the navigation section below the stats to jump to that section

---

## 2. Products (`/admin/products`)

Full control over your product catalog.

### Viewing Products
- All products are listed in a table
- Columns: Name, Category, Price, Stock, Status (Active/Hidden)
- You can see which products are active (visible to customers) or hidden

---

### Creating a New Product

1. Click the **"Add Product"** button (top right)
2. Fill in the form:

| Field | Required | Notes |
|-------|----------|-------|
| Name | YES | Product title shown to customers |
| Brand | no | e.g. Nike, Apple, Samsung |
| Description | no | Full product description |
| Price | YES | Regular price in USD (e.g. 49.99) |
| Discount Price | no | Sale price — shown instead of regular price |
| Stock | YES | Number of units available |
| Category | YES | Must select from existing categories |
| Tags | no | Comma separated: `shoes, sport, running` |
| Featured | no | Check to show on homepage featured section |
| Active | no | Uncheck to hide product from customers |

3. Click **"Create Product"**

> **To add images to a product:** After creating it, use the API endpoint `POST /api/admin/products/{id}/images` with a form upload. (Image upload UI can be added as a next step.)

---

### Editing a Product

1. Find the product in the table
2. Click the **pencil icon** (✏️) on the right
3. The form fills with current values — change what you need
4. Click **"Update Product"**

---

### Deleting a Product

1. Find the product in the table
2. Click the **trash icon** (🗑️) on the right
3. Product is permanently deleted

> **Warning:** Deleting a product also removes it from all carts and wishlists. Orders that already contain it are not affected (they store a copy of the price and name).

---

## 3. Orders (`/admin/orders`)

View all customer orders and update their status.

### Viewing Orders
- All orders listed in a table
- Columns: Order ID, Customer name/email, Total, Date, Status
- You can filter by status using the buttons at the top:
  - **All** — show everything
  - **PENDING** — just placed, not yet processed
  - **PROCESSING** — being prepared
  - **SHIPPED** — sent to customer
  - **DELIVERED** — received by customer
  - **CANCELLED** — cancelled

---

### Order Status Flow

```
PENDING → PROCESSING → SHIPPED → DELIVERED
                                       ↓
                                  CANCELLED (only from PENDING)
```

Customers can cancel their own orders only when status is `PENDING`.
As admin, you can set any status at any time.

---

### Updating an Order Status

1. Find the order in the table
2. In the **Status** column, click the dropdown selector
3. Choose the new status
4. It saves automatically — no need to click a button

---

## 4. Users (`/admin/users`)

View all registered customers and manage their access.

### Viewing Users
- All users listed in a table
- Columns: Name, Email, Join date, Role, Status (Active/Banned)

---

### Banning a User

If a user is abusing the platform (fake orders, spam, fraud):

1. Find the user in the table
2. Click the **"Ban"** button on the right
3. Their account is immediately locked — they cannot log in

> You cannot ban another Admin account.

---

### Unbanning a User

1. Find the banned user (Status shows "Banned")
2. Click the **"Unban"** button
3. They can log in again immediately

---

## 5. Coupons (`/admin/coupons`)

Create and manage discount codes for promotions.

### Viewing Coupons
- All coupons listed in a table
- Columns: Code, Discount, Times Used, Expiry Date, Status

---

### Creating a Coupon

1. Click **"New Coupon"** (top right)
2. Fill in the form:

| Field | Required | Notes |
|-------|----------|-------|
| Code | YES | The code customers type at checkout, e.g. `SUMMER20` |
| Discount Type | YES | **Percentage** (%) or **Fixed** ($) |
| Discount Value | YES | e.g. `10` for 10% off, or `20` for $20 off |
| Min Order Value | no | Minimum cart total required to use the coupon |
| Max Uses | no | Leave empty for unlimited uses |
| Expires At | no | Date/time when the coupon stops working |

3. Click **"Create Coupon"**

**Examples:**
- `WELCOME10` — 10% off, no minimum → Discount Type: Percentage, Value: 10
- `SAVE20` — $20 off orders over $100 → Discount Type: Fixed, Value: 20, Min Order: 100
- `FLASH50` — 50% off, expires tonight → Discount Type: Percentage, Value: 50, Expires At: tonight's date

---

### Disabling / Enabling a Coupon

You don't need to delete coupons. You can toggle them on/off:

1. Find the coupon in the table
2. Click **"Disable"** to deactivate it (customers get an error if they try to use it)
3. Click **"Enable"** to reactivate it

> Use this for seasonal promotions — disable after the sale ends, enable again next time.

---

## Quick Reference — Demo Data

After running the seed, these are already set up:

### Products (10 items across 4 categories)
| Product | Category | Price |
|---------|----------|-------|
| Wireless Headphones Pro | Electronics | $149.99 → $119.99 |
| Smart Watch Series X | Electronics | $299.99 → $249.99 |
| Mechanical Keyboard | Electronics | $89.99 |
| Classic White T-Shirt | Clothing | $29.99 |
| Slim Fit Jeans | Clothing | $79.99 → $59.99 |
| Running Sneakers | Clothing | $119.99 → $99.99 |
| Coffee Maker Deluxe | Home & Garden | $69.99 |
| Indoor Plant Kit | Home & Garden | $34.99 |
| Clean Code (Book) | Books | $44.99 |
| Design Patterns (Book) | Books | $54.99 |

### Coupons
| Code | Type | Value | Minimum |
|------|------|-------|---------|
| WELCOME10 | Percentage | 10% off | $20 |
| SAVE20 | Fixed | $20 off | $100 |

### Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shoptaj.com | Admin123! |
| Customer | user@shoptaj.com | User1234! |

---

## API Reference (for advanced use)

All admin API calls require the Authorization header with an admin JWT token.

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | /api/admin/analytics | Dashboard stats |
| POST | /api/admin/products | Create product |
| PATCH | /api/admin/products/:id | Update product |
| DELETE | /api/admin/products/:id | Delete product |
| POST | /api/admin/products/:id/images | Upload product images |
| POST | /api/admin/categories | Create category |
| GET | /api/admin/orders | List all orders |
| PATCH | /api/admin/orders/:id/status | Update order status |
| GET | /api/admin/users | List all users |
| PATCH | /api/admin/users/:id/ban | Ban user |
| PATCH | /api/admin/users/:id/unban | Unban user |
| GET | /api/admin/coupons | List coupons |
| POST | /api/admin/coupons | Create coupon |
| PATCH | /api/admin/coupons/:id/toggle | Enable/disable coupon |

Full interactive API docs: **http://localhost:3001/api/docs**
