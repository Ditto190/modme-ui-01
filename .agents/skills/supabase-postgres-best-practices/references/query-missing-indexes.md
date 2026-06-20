---
title: Add Indexes on WHERE and JOIN Columns
impact: CRITICAL
impactDescription: 100-1000x faster queries on large tables
tags: indexes, performance, sequential-scan, query-optimization
---

## Add Indexes on WHERE and JOIN Columns

Queries filtering or joining on unindexed columns cause full table scans, which become exponentially slower as tables grow.

**Incorrect (sequential scan on large table):**

```sql
-- No index on customer_id causes full table scan
select * from orders where customer_id = 123;

-- EXPLAIN shows: Seq Scan on orders (cost=0.00..25000.00 rows=100 width=85)
```

**Correct (index scan):**

```sql
-- Create index on frequently filtered column
create index orders_customer_id_idx on orders (customer_id);

select * from orders where customer_id = 123;

-- EXPLAIN shows: Index Scan using orders_customer_id_idx (cost=0.42..8.44 rows=100 width=85)
```

For JOIN columns, always index the foreign key side:

**Incorrect (JOIN without foreign key index):**

```sql
-- Missing index on the referencing side forces repeated scans as the join fan-out grows
select c.name, o.total
from customers c
join orders o on o.customer_id = c.id;

-- EXPLAIN often shows: Seq Scan on orders or Hash Join over a full orders scan
```

**Correct (JOIN can use the foreign key index):**

```sql
-- Index the referencing column so the join can find matching child rows quickly
create index orders_customer_id_idx on orders (customer_id);

select c.name, o.total
from customers c
join orders o on o.customer_id = c.id;

-- EXPLAIN often shows: Index Scan using orders_customer_id_idx on orders
```

Reference: [Query Optimization](https://supabase.com/docs/guides/database/query-optimization)
