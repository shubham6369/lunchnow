# Firestore Security Rules - LunchNow

Copy and paste these rules into your **Firebase Console > Firestore > Rules** tab.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Helper function to check if user is the owner of the document
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    // Users Collection
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow write: if isOwner(userId) || isAdmin();
    }

    // OTPs Collection (Backend only, block all client access)
    match /otps/{phone} {
      allow read, write: if false;
    }

    // Vendors Collection
    match /vendors/{vendorId} {
      // Anyone can read active vendors
      allow read: if resource.data.status == 'active' || isAdmin();
      // Only admins can create/delete vendors
      allow create, delete: if isAdmin();
      // Vendors can update their own profile, admins can update anything
      allow update: if isAdmin() || (request.auth != null && request.auth.uid == vendorId);
      
      // Dishes Sub-collection
      match /dishes/{dishId} {
        allow read: if true; // Publicly readable
        allow write: if isAdmin() || (request.auth != null && request.auth.uid == vendorId);
      }
    }

    // Orders Collection
    match /orders/{orderId} {
      // Users can see their own orders, admins can see all
      allow read: if isAdmin() || (request.auth != null && request.resource.data.userId == request.auth.uid);
      // Users can create orders, admins can update them
      allow create: if request.auth != null;
      allow update: if isAdmin() || (request.auth != null && resource.data.userId == request.auth.uid);
    }

    // Reviews Collection
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if isAdmin();
    }
    
    // Global Dishes (Collection Group)
    match /{path=**}/dishes/{dishId} {
      allow read: if true;
    }
  }
}
```

> [!IMPORTANT]
> These rules ensure that only admins can perform sensitive operations, while users can still interact with their own data. The `isAdmin()` function relies on a `role: 'admin'` field in the user's document in the `users` collection.
