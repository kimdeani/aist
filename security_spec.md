# READLOG Security Specification

## 1. Data Invariants
1. Private PII (`/users/{userId}` containing `email`) is readable and writable only by the matching verified owner (`request.auth.uid == userId`).
2. Public reader profiles (`/publicProfiles/{userId}`) never contain PII (`email`), and non-owners can only read documents where `isPublic == true`.
3. Books (`/books/{bookId}`) can only be created, updated, or deleted by the verified `ownerId == request.auth.uid`. Non-owners can only read books where `isPublic == true`.
4. Reading notes (`/notes/{noteId}`) must reference an existing parent book (`exists(/databases/$(database)/documents/books/$(bookId))`) owned by the note creator.
5. Book reviews (`/reviews/{reviewId}`) must reference an existing parent book owned by the reviewer whose status is `'완독'`, with `rating` strictly an integer between 1 and 5.
6. All `createdAt` and `ownerId`/`uid`/`userId` fields are immutable after creation, and timestamps must equal `request.time`.

## 2. Dirty Dozen Attack Payloads (All Must Yield PERMISSION_DENIED)
1. **Unauthenticated read of private user doc**: `GET /users/userA` with `auth: null`.
2. **Cross-user PII read**: `GET /users/userA` with `auth: userB`.
3. **Unverified email write**: `CREATE /books/b1` with `email_verified: false`.
4. **Identity spoofing on book create**: `CREATE /books/b1` with `ownerId: "userA"` while `auth.uid == "userB"`.
5. **Shadow ghost field injection**: `CREATE /publicProfiles/userA` with extra `isAdmin: true`.
6. **Private record snooping via list**: `LIST /books` without `isPublic == true` or `ownerId == auth.uid` filter.
7. **Orphaned note creation**: `CREATE /notes/n1` referencing non-existent `bookId: "missing"`.
8. **Cross-user note attachment**: `CREATE /notes/n1` by `userB` referencing `userA`'s book.
9. **Review on unread book**: `CREATE /reviews/r1` referencing a book whose `status == "읽기 전"`.
10. **Out-of-range rating poisoning**: `CREATE /reviews/r1` with `rating: 99`.
11. **Immutable field tampering**: `UPDATE /books/b1` changing `ownerId` or `createdAt`.
12. **Path ID poisoning**: `CREATE /books/../../evil` or 200-char ID string.
