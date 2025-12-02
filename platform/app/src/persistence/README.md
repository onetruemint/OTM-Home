# Application Persistence Interface

A simplified, type-safe interface for applications to interact with the PostgreSQL persistence layer.

## Quick Start

### 1. Initialize Database

```typescript
import { initializeDatabase } from './persistence';

await initializeDatabase({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'password'
});
```

### 2. Define Entities

```typescript
import { Entity } from './persistence';

interface User extends Entity {
  name: string;
  email: string;
  role: 'admin' | 'user';
}
```

### 3. Create Repositories

```typescript
import { createRepository } from './persistence';

const users = createRepository<User>('users');
```

### 4. Use CRUD Operations

```typescript
// Create
const user = await users.create({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user'
});

// Read
const found = await users.findById(user.id);
const all = await users.findAll();

// Update
await users.update(user.id, { role: 'admin' });

// Delete
await users.delete(user.id);
```

## Core Concepts

### Entities

All entities must extend the `Entity` type, which provides:
- `id?: string | number` - Primary key
- `created_at?: Date` - Creation timestamp
- `updated_at?: Date` - Last update timestamp

```typescript
interface Post extends Entity {
  title: string;
  content: string;
  authorId: number;
  published: boolean;
}
```

### Repositories

Repositories provide type-safe CRUD operations for your entities:

```typescript
const posts = createRepository<Post>('posts');
```

#### Read Operations

```typescript
// Find by ID
const post = await posts.findById(1);

// Find one matching conditions
const post = await posts.findOne([
  query.eq('published', true)
]);

// Find many with conditions and sorting
const posts = await posts.findMany(
  [query.eq('published', true)],
  {
    orderBy: [sort.desc('created_at')],
    limit: 10
  }
);

// Find all
const all = await posts.findAll([sort.asc('title')]);

// Paginated results
const page = await posts.findPaginated(
  paginate(1, 20), // page 1, 20 per page
  [query.eq('published', true)],
  [sort.desc('created_at')]
);
```

#### Write Operations

```typescript
// Create single
const post = await posts.create({
  title: 'My Post',
  content: 'Content here',
  authorId: 1,
  published: false
});

// Create multiple
const newPosts = await posts.createMany([
  { title: 'Post 1', content: '...', authorId: 1, published: false },
  { title: 'Post 2', content: '...', authorId: 1, published: false }
]);

// Update by ID
await posts.update(1, { published: true });

// Update many matching conditions
await posts.updateMany(
  [query.eq('authorId', 1)],
  { published: true }
);

// Delete by ID
await posts.delete(1);

// Delete many matching conditions
const count = await posts.deleteMany([
  query.eq('published', false)
]);
```

#### Utility Operations

```typescript
// Count
const total = await posts.count();
const publishedCount = await posts.count([
  query.eq('published', true)
]);

// Check existence
const exists = await posts.exists(1);
```

### Query Helpers

Build type-safe queries using the `query` helper:

```typescript
import { query } from './persistence';

// Equality
query.eq('role', 'admin')           // role = 'admin'
query.neq('status', 'deleted')      // status != 'deleted'

// Comparison
query.gt('age', 18)                 // age > 18
query.gte('age', 18)                // age >= 18
query.lt('age', 65)                 // age < 65
query.lte('age', 65)                // age <= 65

// Pattern matching
query.like('name', '%John%')        // name LIKE '%John%'

// Arrays
query.in('id', [1, 2, 3])          // id IN (1, 2, 3)

// Null checks
query.isNull('deletedAt')          // deleted_at IS NULL
query.isNotNull('email')           // email IS NOT NULL
```

### Sort Helpers

```typescript
import { sort } from './persistence';

sort.asc('name')        // ORDER BY name ASC
sort.desc('created_at') // ORDER BY created_at DESC
```

### Pagination Helper

```typescript
import { paginate } from './persistence';

// Get page 1 with 20 items per page
const options = paginate(1, 20);
// Returns: { limit: 20, offset: 0 }

// Get page 3 with 50 items per page
const options = paginate(3, 50);
// Returns: { limit: 50, offset: 100 }
```

### Transactions

Execute multiple operations atomically:

```typescript
import { transaction } from './persistence';

const result = await transaction(async (tx) => {
  // Create user
  const user = await users.create({
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'user'
  }, tx);  // Pass transaction executor

  // Create related post
  const post = await posts.create({
    title: 'First Post',
    content: 'Hello!',
    authorId: user.id,
    published: false
  }, tx);  // Pass transaction executor

  return { user, post };
});

// If any operation fails, everything rolls back
// If all succeed, everything commits
```

#### Transaction Options

```typescript
import { transaction, IsolationLevel } from './persistence';

await transaction(
  async (tx) => {
    // Your operations
  },
  {
    isolationLevel: IsolationLevel.SERIALIZABLE,
    readOnly: false,
    timeout: 5000  // milliseconds
  }
);
```

#### Retryable Transactions

Automatically retry on serialization failures:

```typescript
import { retryableTransaction } from './persistence';

await retryableTransaction(
  async (tx) => {
    // High-contention operations
    const count = await inventory.count([
      query.eq('productId', productId)
    ], tx);

    await inventory.update(productId, {
      quantity: count - 1
    }, tx);
  },
  5  // retry up to 5 times
);
```

## Advanced Usage

### Custom Repository Classes

Wrap repositories with domain-specific logic:

```typescript
class UserRepository {
  private repo = createRepository<User>('users');

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne([query.eq('email', email)]);
  }

  async findAdmins(): Promise<User[]> {
    return this.repo.findMany(
      [query.eq('role', 'admin')],
      { orderBy: [sort.asc('name')] }
    );
  }

  async promoteToAdmin(userId: number): Promise<User | null> {
    return this.repo.update(userId, { role: 'admin' });
  }

  async createUser(data: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    // Add validation
    if (!data.email.includes('@')) {
      throw new Error('Invalid email');
    }

    return this.repo.create(data);
  }
}

const userRepo = new UserRepository();
const admin = await userRepo.findByEmail('admin@example.com');
```

### Complex Queries

Combine multiple conditions:

```typescript
const results = await posts.findMany(
  [
    query.eq('published', true),
    query.gte('created_at', new Date('2024-01-01')),
    query.like('title', '%TypeScript%'),
    query.in('authorId', [1, 2, 3])
  ],
  {
    orderBy: [
      sort.desc('created_at'),
      sort.asc('title')
    ],
    limit: 50
  }
);
```

## API Reference

### Types

```typescript
type Entity = {
  id?: string | number;
  created_at?: Date;
  updated_at?: Date;
}

type WhereCondition = {
  field: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN" | "IS NULL" | "IS NOT NULL";
  value?: any;
}

type OrderBy = {
  field: string;
  direction: "ASC" | "DESC";
}

type PaginationOptions = {
  limit: number;
  offset: number;
}

type PaginatedResult<T> = {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

### Functions

- `initializeDatabase(config?: Partial<DatabaseConfig>): Promise<void>`
- `createRepository<T>(tableName: string): Repository<T>`
- `transaction<T>(callback, options?): Promise<T>`
- `retryableTransaction<T>(callback, maxRetries?, options?): Promise<T>`
- `query.eq(field, value): WhereCondition`
- `query.neq(field, value): WhereCondition`
- `query.gt(field, value): WhereCondition`
- `query.gte(field, value): WhereCondition`
- `query.lt(field, value): WhereCondition`
- `query.lte(field, value): WhereCondition`
- `query.like(field, pattern): WhereCondition`
- `query.in(field, values): WhereCondition`
- `query.isNull(field): WhereCondition`
- `query.isNotNull(field): WhereCondition`
- `sort.asc(field): OrderBy`
- `sort.desc(field): OrderBy`
- `paginate(page, pageSize): PaginationOptions`

## Best Practices

1. **Always initialize the database first**
   ```typescript
   await initializeDatabase(config);
   ```

2. **Use transactions for related operations**
   ```typescript
   await transaction(async (tx) => {
     await users.create(userData, tx);
     await profiles.create(profileData, tx);
   });
   ```

3. **Create custom repository classes for complex logic**
   ```typescript
   class UserRepository {
     private repo = createRepository<User>('users');
     // Add domain-specific methods
   }
   ```

4. **Use query helpers for type safety**
   ```typescript
   // Good
   [query.eq('role', 'admin')]

   // Avoid
   [{ field: 'role', operator: '=', value: 'admin' }]
   ```

5. **Always handle errors**
   ```typescript
   try {
     await users.create(data);
   } catch (error) {
     console.error('Failed to create user:', error);
     // Handle error appropriately
   }
   ```

## Examples

See [example.ts](./example.ts) for comprehensive usage examples.
