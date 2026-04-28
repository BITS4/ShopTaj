import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t bg-background mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-primary mb-4">ShopTaj</h3>
            <p className="text-sm text-muted-foreground">Your one-stop shop for everything you need.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products" className="hover:text-foreground">All Products</Link></li>
              <li><Link href="/products?sort=newest" className="hover:text-foreground">New Arrivals</Link></li>
              <li><Link href="/products?featured=true" className="hover:text-foreground">Featured</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/profile" className="hover:text-foreground">My Profile</Link></li>
              <li><Link href="/profile/orders" className="hover:text-foreground">My Orders</Link></li>
              <li><Link href="/profile/wishlist" className="hover:text-foreground">Wishlist</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Help</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/login" className="hover:text-foreground">Login</Link></li>
              <li><Link href="/register" className="hover:text-foreground">Register</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ShopTaj. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
